"use strict";

import { InsertSettings, } from "./InsertSettings";
import { all, enumerate, filter, only, zip } from "./Util";
import * as vscode from 'vscode';


// TODO * around width for multiple of width
// TODO = around width for all equal length
enum SyntaxTokenType {
	NONE,
	DIGIT,
	SIGN,
	LETTER,
	SPACE,
	COMMA,
	UNDERSCORE,
	APOSTROPHE,
	DOT,
	FORMAT,
	EQUAL,
}
interface SyntaxToken {
	token: string;
	type: SyntaxTokenType;
}



type CustomSyntaxParser = (tokens: SyntaxToken[], index: number) => [number, SyntaxToken | undefined];
export class Parser {
	public getDefaultSettings(): InsertSettings {
		return {
			format: "d",
			start: [+1, "0", "0"],
			step: [+1, "1", "0"],
			signed: false,
			super_align: false,
			super_align_frac: false,
			int_width: 0,
			precision: null,
			zfill: " ",
			separator: "",
			separator_interval: 3,
		};
	}
	public parseUserInput(input: string | undefined): InsertSettings | undefined {
		if (input === undefined) { return undefined; }
		// TODO add multiple separators (basically foo bar)
		
		// [zfill][=][int_width][.(=|precision)][format][signed][start][±step][separator][separator_interval]
		//	"x+8"          => +8 +9 +a +b +c
		//	"0+1"          => 0 1 2 3 // default
		// not supported //	"1*2"          => 1 2 4 8 // you might want to write (1 << ) and use default format
		//	"-1+1"         => -1 0 1 2 
		//	"+0+1"         => +0 +1 +2 +3
		//	"+-1+1"        => -1 +0 +1 +2
		//	"08X3+7"       => 00000003 0000000A 
		//	" 8d"          =>        0        1
		//	"s8d"          =>        0        1
		//	"d99999.9999 " => 99 999.999 9
		//	"d99999.9999," => 99,999.999,9
		//	".2d66666.6666," => 66,666.67
		//	"cA"           => A B C D
		
		const tokens: SyntaxToken[] | undefined = this.parseTokens(input);
		if (!tokens) { return this.error(); }
		
		const settings: InsertSettings = this.getDefaultSettings();
		
		const [format_index, format_token] = Array.from(filter(enumerate(tokens), ([index, token]) => token.type === SyntaxTokenType.FORMAT))[0] || [-1, undefined];
		if (format_token) { 
			settings.format = format_token.token; 
			if (format_token.token.toLowerCase() === "x") {
				settings.separator_interval = 2;
			}
			
			const before = tokens.slice(0, format_index);
			// zfill width . precision
			let [expected_format_index, [space, zero, equal, int_width, dot, equal_frac, precision]] = this.parseSyntax(before, [
				[SyntaxTokenType.SPACE],
				[SyntaxTokenType.DIGIT],
				[SyntaxTokenType.EQUAL],
				[SyntaxTokenType.DIGIT],
				[SyntaxTokenType.DOT],
				[SyntaxTokenType.EQUAL],
				[SyntaxTokenType.DIGIT],
			]);
			if (format_token && expected_format_index !== format_index) { return this.error(`syntax error before ${format_token.token} format specifier`); }
			if (!equal) {
				if (!space && zero?.token.startsWith("0")) {
					// int_width will surelly be undefined
					int_width = { type: SyntaxTokenType.DIGIT, token: zero.token.slice(1), };
					zero.token = "0";
				} else {
					int_width = zero;
					zero = undefined;
				}
			}
			if (equal_frac && precision) { return this.error("You can choose either = or precision"); }
			if (space && zero) { return this.error("cannot have both space and 0 zfill"); }
			if (space) { settings.zfill = space.token; }
			else if (zero) {
				if (zero.token !== "0") { return this.error("Only 0 and space are allowed zfill"); }
				settings.zfill = zero.token;
			}
			if (int_width) { settings.int_width = Number(int_width.token); }
			if (precision) { settings.precision = Number(precision.token); }
			else if (equal_frac) { settings.super_align_frac = true; }
			if      (equal     ) { settings.super_align      = true; }
		}
		
		const after = tokens.slice(format_index + 1);
		
		const digit_parsers = {
			"d": [[SyntaxTokenType.DIGIT], [SyntaxTokenType.DIGIT]],
			"x": [this.parseHexDigit, this.parseHexDigit],
			"c": [[SyntaxTokenType.LETTER, SyntaxTokenType.DIGIT], [SyntaxTokenType.DIGIT]],
		}[settings.format.toLowerCase()];
		if (digit_parsers === undefined) { return this.error(`unknown format specifier ${settings.format}`); }
		const [start_parser, step_parser] = digit_parsers;
		const [end_index, parsed] = this.parseSyntax(after, [
			[SyntaxTokenType.SIGN], // signed or sign
			[SyntaxTokenType.SIGN], // sign
			start_parser, // start (integral)
			[SyntaxTokenType.DOT],
			start_parser, // start (fractional)
			[SyntaxTokenType.SIGN], // ±
			step_parser, // step (integral)
			[SyntaxTokenType.DOT],
			step_parser, // step (fractional)
			[SyntaxTokenType.SPACE, SyntaxTokenType.COMMA, SyntaxTokenType.UNDERSCORE], // separator
			[SyntaxTokenType.DIGIT], // separator interval
		]);
		if (end_index !== after.length) { return this.error(`syntax error: rest of the input not parseable after ${end_index}`); }
		    ["+",           "-",      "6",   ".","3456789",      "+",   "3",      ".", "1",      ",",  "7"];
		let [signed_or_sign, sign, start_int, _, start_frac, step_sign, step_int, __, step_frac, sep, sep_interval] = parsed;
		if (signed_or_sign?.token === "-") {
			if (sign) { return this.error(`syntax error: you can have only one + and one - for start`); }
			sign = signed_or_sign;
			signed_or_sign = undefined;
		}
		if ((!start_int && !start_frac) &&      sign) { return this.error(`syntax error: start not complete`); }
		if ((! step_int && ! step_frac) && step_sign) { return this.error(`syntax error:  step not complete`); }
		// TODO only if ±a, not if just a (just a should be a syntax error)
		// or not at all
		// if (!step_int && !step_frac) {
		// 	[step_sign,  step_int,  step_frac] = [     sign, start_int, start_frac];
		// 	[     sign, start_int, start_frac] = [undefined, undefined, undefined];
		// }
		// TODO unneeded
		if (signed_or_sign && signed_or_sign.token !== "+") { return this.error(`cannot have sign after -`); }
		if (sign && sign.token !== "-") { return this.error(`sign of start can't be +`); }
		if (!sep && sep_interval) { return this.error(`syntax error: cannot have separator interval without separator`); }
		if (step_sign?.token === "+") { step_sign = undefined; }
		
		
		settings.signed = signed_or_sign !== undefined;
		if (     sign) {settings.start[0] = -1;} if (start_int) {settings.start[1] = start_int.token;} if (start_frac) {settings.start[2] = start_frac.token;}
		if (step_sign) {settings. step[0] = -1;} if ( step_int) {settings. step[1] =  step_int.token;} if ( step_frac) {settings. step[2] =  step_frac.token;}
		if (sep) {
			settings.separator = sep.token;
			if (sep_interval) { settings.separator_interval = Number(sep_interval.token); }
		}
		
		return settings;
	}

	private error(msg?: string): undefined {
		if (msg !== undefined) {
			// console.error(msg);
			void vscode.window.showErrorMessage(msg);
		}
		return undefined;
	}
	// separate into tokens: digits, signs, letters, space, comma, dot, type (first letter, except s, is always type)
	private parseTokens(input: string): SyntaxToken[] | undefined {
		const tokens: SyntaxToken[] = [];
		let found_format = false;
		let current_token: SyntaxToken = {
			type: SyntaxTokenType.NONE,
			token: "",
		};
		const push = (new_type: SyntaxTokenType) => {
			if (current_token.type !== SyntaxTokenType.NONE) {
				tokens.push(current_token);
			}
			current_token = {
				type: new_type,
				token: "",
			};
		};
		const pushIfDiff = (new_type: SyntaxTokenType) => {
			if (current_token.type !== new_type) { push(new_type); }
		};
		
		for (let [i, c] of enumerate(input)) {
			if ("0" <= c && c <= "9") {
				pushIfDiff(SyntaxTokenType.DIGIT);
			} else if (("a" <= c && c <= "z") || ("A" <= c && c <= "Z")) {
				if (!found_format) {
					if (c === "s") {
						push(SyntaxTokenType.SPACE);
						c = " ";
					} else if ("dxc".includes(c.toLowerCase())) {
						push(SyntaxTokenType.FORMAT);
						found_format = true;
					} else {
						return this.error(`Wrong format string. at [${i}]: <${input.slice(0, i + 1)}>`);
					}
				} else {
					pushIfDiff(SyntaxTokenType.LETTER);
				}
			} else if (c === " ") {
				push(SyntaxTokenType.SPACE);
			} else if (c === ",") {
				push(SyntaxTokenType.COMMA);
			} else if (c === "_") {
				push(SyntaxTokenType.UNDERSCORE);
			} else if (c === "'") {
				push(SyntaxTokenType.APOSTROPHE);
			} else if (c === "+" || c === "-") {
				push(SyntaxTokenType.SIGN);
			} else if (c === ".") {
				push(SyntaxTokenType.DOT);
			} else if (c === "=") {
				push(SyntaxTokenType.EQUAL);
			} else {
				return this.error(`Wrong format string. at [${i}]: <${input.slice(0, i + 1)}>`);
			}
			current_token.token += c;
		}
		// push the last token (token is pushed when other token is detected)
		push(SyntaxTokenType.NONE); 
		// we could also push before completing token
		
		return tokens;
	}
	private parseSyntax(tokens: SyntaxToken[], expected: (SyntaxTokenType[] | CustomSyntaxParser)[]): [number, (SyntaxToken | undefined)[]] {
		let index = 0;
		const result = expected.map(types => {
			if (index >= tokens.length) { return undefined; }
			const actual = tokens[index];
			if (Array.isArray(types)) {
				if (types.includes(actual.type)) {
					++index;
					return actual;
				} else {
					return undefined;
				}
			} else {
				const [new_index, result] = types(tokens, index);
				index = new_index;
				return result;
			}
		});
		return [index, result];
	}
	private parseHexDigit: CustomSyntaxParser = (tokens: SyntaxToken[], index: number) => {
		let result_token = "";
		const hex_digit_tokens = [SyntaxTokenType.DIGIT, SyntaxTokenType.LETTER];
		
		for (; index < tokens.length; ++index) {
			const token = tokens[index];
			const is_hex_digits = token.type === SyntaxTokenType.LETTER && all(token.token.toLowerCase(), c => "a" <= c && c <= "f");
			if (token.type !== SyntaxTokenType.DIGIT && !is_hex_digits) {
				break;
			}
			result_token += token.token;
		}
		return [index, result_token ? { token: result_token, type: SyntaxTokenType.DIGIT } as SyntaxToken : undefined];
	};	
}