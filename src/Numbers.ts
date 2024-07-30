import { InsertSettings, NumberParts } from "./InsertSettings";
import { enumerate, min, minmaxv } from "./Util";


type MyNumberConstructor<N = MyNumber> = new (sign: -1 | 1, digits: Map<number, string | number>) => N;
export abstract class MyNumber {
	constructor(...args: any[]) {}
	static fromNumberParts<N extends typeof MyNumber>(this: N, parts: NumberParts): InstanceType<N> {
		throw new Error("not implemented");
	}
	public abstract copy(): this;
	public abstract add(other: this): void;
	public abstract mul(scalar: number): void;
}
export abstract class MyNumeric extends MyNumber {
	static Base: 10 | 16 = 10;
	abstract base: number;
	constructor(
		public value: bigint,
		public fractional_count: number, // in base N
		// real value = value / (N ** fractional_count)
	) { super(); }
	static fromNumberParts<N extends typeof MyNumber>(this: N, parts: NumberParts): InstanceType<N> {
		let [sign, int, frac] = parts;
		int = int.replace(/^0+/, '') || '0';
		frac = frac.replace(/0+$/, '');
		const fractional_count = frac.length;
		let str = int + frac;
		if ((this as unknown as typeof MyNumeric).Base === 16) { str = "0x" + str; }
		let value = BigInt(str.replace(/^0+(?=\d)/, ''));
		if (sign < 0) { value = -value; }
		return new (this as any)(value, fractional_count);
	}
	public copy(): this {
		const constructor = this.constructor as new (value: bigint, fractional_count: number) => this;
		return new constructor(this.value, this.fractional_count);
	}
	private toStringInsertDot(s: string): string {
		const n = this.fractional_count;
		if (n === 0) { return s; }
		if (s.length <= n) { return '0.' + s.padStart(n, '0'); }
		const insert_position = s.length - n;
		return s.slice(0, insert_position) + '.' + s.slice(insert_position);
	}
	public toString(): string {
		const is_negative = this.value < 0n;
		const abs = is_negative ? -this.value : this.value;
		const sign = is_negative ? "-" : "";
		const str = this.toStringInsertDot(abs.toString(this.base));
		return sign + str;
	}
	public add(other: this): void {
		// (v1 / (N ** fc1) + v2 / (N ** fc2)) * (N ** maxfc)
		// v1 / (N ** (fc1 - maxfc)) + v2 / (N ** (fc2- maxfc)))
		let common_fractional_count = this.fractional_count;
		let v1 = this.value;
		let v2 = other.value;
		if        (this.fractional_count < other.fractional_count) {
			common_fractional_count = other.fractional_count;
			v1 *= BigInt(this.base) ** BigInt(common_fractional_count - this.fractional_count);
		} else if (this.fractional_count > other.fractional_count) {
			common_fractional_count = this.fractional_count;
			v2 *= BigInt(this.base) ** BigInt(common_fractional_count - other.fractional_count);
		}
		const value = v1 + v2;
		this.value = value;
		this.fractional_count = common_fractional_count;
	}
	public mul(scalar: number): void {
		// v1 * v2 / (N ** (f1 + f2))
		// haha, would be nice if it was that
		// v * s / (N ** fc)
		this.value *= BigInt(scalar);
	}
}
export class MyDecimal extends MyNumeric {
	static Base = 10 as const;
	base = 10 as const;
	// static fromNumberParts<N extends typeof MyNumber>(this: N, parts: NumberParts): MyDecimal { return super.fromNumberParts.call(this, partsInstanceType<N> }
}
export class MyHexadecimal extends MyNumeric {
	static Base = 16 as const;
	base = 16 as const;
	// static fromNumberParts<N extends typeof MyNumber>(this: N, parts: NumberParts): MyHexadecimal { return super.fromNumberParts.call(this, partsInstanceType<N> }
}

// what about cABCDEF.GHIJ+5.3
// also + for signed
// something could mean "circular" (maybe +) (or c vs C preffered)
// so i know what should A+5 be (including circular or not)
// then what is left is to decide what with +, .x, .y
// also, what is A - 1 in non circular
// okokokok
// in circ -> every 2 digits correspond to 1 letter
// in non circ -> add -, + means signed
export class MyStringNumber extends MyNumber {
	static _ctr = MyStringNumber;
	declare public digits: Map<number, string>;
	public add(other: this): void {
		
	}
	public mul(scalar: number): void {
		
	}
	public copy(): this {
		return this;
	}
}

export const format_to_number_class = {
	"d": MyDecimal,
	"x": MyHexadecimal,
	"y": MyStringNumber,
} as {[format_specifier: string]: typeof MyNumber};

/* 
export abstract class MyNumber {
	static fromNumberParts<T extends typeof MyNumber>(this: T, parts: NumberParts): InstanceType<T> {
		const [sign, int, frac] = parts;
		const digits = new Map<number, any>();
		for (const [i, digit] of enumerate(int)) {
			if (digit === "0") { continue; }
			digits.set(int.length - 1 - i, this._digitParse(digit));
		}
		for (const [i, digit] of enumerate(frac, 1)) {
			if (digit === "0") { continue; }
			digits.set(-i, this._digitParse(digit));
		}
		const ctr = this.prototype.constructor as MyNumberConstructor<InstanceType<T>>;
		return new ctr(sign, digits); // TODO how?
	}
	copy(): this {
		const constructor = this.constructor as MyNumberConstructor<this>;
		return new constructor(this.sign, new Map(this.digits.entries()));
	}
	public abstract add(other: this): void;
	public abstract mul(scalar: number): void;
	
	public toString(): string {
		if (this.digits.size === 0) { return "0"; }
		let str = this.sign > 0 ? "" : "-";
		let [a, b] = minmaxv(this.digits.keys())!;
		if (b < 0) { b = 0; }
		for (let i = b; i >= a; --i) {
			if (i === -1) { str += "."; }
			if (this.digits.has(i)) {
				str += this.digits.get(i);
			} else {
				str += "Ø";
			}
		}
		return str;
	}
}



	public format(settings: InsertSettings): string {
		const { signed, int_width, precision, zfill, separator, separator_interval } = settings;
		const is_positive = this.value >= 0n;
		const abs = is_positive ? this.value : -this.value;
		const sign = !is_positive ? "-" : signed ? "+" : "";
		let str = abs.toString(this.base);
		const fc = this.fractional_count;
		let dot_index = str.length;
		if (fc !== 0) {
			if (str.length <= fc) { 
				str = '0.' + str.padStart(fc, '0');
				dot_index = 1;
			} else {
				dot_index = str.length - fc;
				str = str.slice(0, dot_index) + '.' + str.slice(dot_index);
			}
		}
		if (precision !== null) {
			// precision is a number
			if (precision > fc) {
				if (dot_index === str.length) { str += "."; }
				str += "0".repeat(precision - fc);
			} else if (precision === fc) {
			} else if (precision > 0) { // precision < fc!!
				const index = dot_index + precision;
				const digit = parseInt(str.charAt(index + 1) || "0", 16);
				if (digit * 2 >= this.base) {
					const copy = this.copy();
					// D = 3, P = 3, len = 10
					//    D  P000
					// 123.456789
					copy.value += BigInt(this.base) ** BigInt(fc - precision);
					return copy.format(settings); // will not go into this branch
				} else {
					str = str.slice(0, index + 1);
				}
			} else {
				if (dot_index !== str.length) { str = str.slice(0, dot_index); }
				const index = dot_index + precision - 1;
				const digit = parseInt(str.charAt(precision === 0 ? index + 2 : index + 1) || "0", 16);
				if (digit * 2 >= this.base) {
					const copy = this.copy();
					// D = 3, P = -1, len = 10
					//  P0Dxxxxxx
					// 123.456789
					copy.value += BigInt(this.base) ** BigInt(fc - precision);
					return copy.format(settings); // will not go into this branch
				} else {
					str = str.slice(0, index + 1) + "0".repeat(-precision);
				}
			}
		} else if (dot_index !== str.length) {
			str = str.replace(/0+$/, ''); // remove trailing 0
		}
		str = insertSeparator(str, dot_index, separator, separator_interval);
		
		if (str.length < int_width) {
			const required = int_width - str.length - sign.length;
			if (zfill === "0") {
				let debug: any[] = [required];
				let prefix = zfill.repeat(required);
				debug.push(prefix);
				if (separator && separator_interval) {
					let sep_index = str.indexOf(separator);
					const dot_index = str.indexOf(".");
					debug.push([sep_index, dot_index]);
					if (dot_index !== -1 && (sep_index === -1 || sep_index > dot_index)) {
						sep_index = dot_index;
					}
					if (sep_index === -1) { sep_index = str.length; }
					prefix = insertSeparatorFromRight(prefix + str.slice(0, sep_index), separator, separator_interval);
					debug.push(prefix);
					str = str.slice(sep_index);
					prefix = prefix.slice(- required - sep_index);
					debug.push(prefix);
					if (prefix.startsWith(separator)) {
						prefix = prefix.slice(separator.length);
					}
					debug.push(prefix);
					debug.push(str);
				}
				// return JSON.stringify(debug);
				str = sign + prefix + str;
				if (str.length < int_width) {
					str = " ".repeat(int_width - str.length) + str;
				}
			} else {
				str = zfill.repeat(required) + sign + str;
			}
		}
		return str;
	}

*/