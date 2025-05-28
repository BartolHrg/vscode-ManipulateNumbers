import * as vscode from 'vscode';
import { evalXpr } from "./evaluate";
import { Parser } from "./Parser";
import { formatNumbers } from "./Formatter";
import { InsertSettings } from './InsertSettings';
import { format_to_number_class, MyDecimal, MyNumeric } from './Numbers';

export type StringsAndSelections = [any[] | undefined, vscode.Selection[] | undefined];

export function evaluate(strings: string[], selections: readonly vscode.Selection[], xpr: string): StringsAndSelections {
	const trimmed = xpr.trim();
	if (!trimmed) { return [undefined, undefined]; }
	if (trimmed.startsWith(":")) {
		return evaluateAggregate(strings, selections, xpr.trimStart().slice(1));
	} else {
		return [strings.map(s => evalXpr(xpr, s)), undefined];
	}
}

function evaluateAggregate(strings: string[], selections: readonly vscode.Selection[], command: string): StringsAndSelections {
	const command_s = command.trimStart();
	//	const command_e = command.trimEnd();
	const command_se = command.trim();
	if (command_se === "count") {
		void vscode.window.showInformationMessage(strings.length.toString());
		return [undefined, undefined];
	}
	if (command_s.startsWith("format")) {
		const m = /^format([dxcDXC]?)#/.exec(command_s);
		if (!m || m.length !== 2) { throw new Error(`Invalid format command ${command_s}`); }
		const cls = format_to_number_class[m[1].toLowerCase() || "d"];
		const input = command_s.slice(m[0].length);
		let format: InsertSettings | undefined = undefined;
		if (input.trimStart().startsWith("{")) {
			format = JSON.parse(input);
			if (typeof format !== "object") { throw new Error(`format invalid`); }
			if (format === null) { throw new Error(`format invalid`); }
		} else {
			const parser = new Parser();
			format = parser.parseUserInput(input);
			if (format === undefined) { return [undefined, undefined]; }
		}
		const numbers = strings.map(s => cls.fromString(s));
		return [formatNumbers(numbers, format), undefined];
	}
	if (command_se.startsWith("order")) {
		const ord = command_se.includes("-") ? -1 : +1;
		const new_selections = selections.map(sel => sel).sort((s1, s2) => ord * s1.start.compareTo(s2.start));
		return [undefined, new_selections];
	}
	if (command_se.startsWith("sortn")) {
		const ord = command_se.includes("-") ? -1 : +1;
		const new_strings = strings.map(s => s).sort((s1, s2) => ord * (Number(s1) - Number(s2)));
		return [new_strings, undefined];
	}
	if (command_se.startsWith("sort")) {
		let ord = +1;
		let sort_f = (s1: string, s2: string) => ord * s1.localeCompare(s2);
		const index_f = command_se.indexOf("#");
		if (index_f === -1) {
			if (command_se.includes("-")) { ord = -1; }
		} else {
			if (command_se.slice(0, index_f).includes("-")) { ord = -1; }
			sort_f = (s1, s2) => ord * eval("(() => " + command_se.slice(index_f + 1) + ")()");
		}
		const new_strings = strings.map(s => s).sort(sort_f);
		return [new_strings, undefined];
	}
	throw new Error(`Command not recognized: ${command}`);
}

