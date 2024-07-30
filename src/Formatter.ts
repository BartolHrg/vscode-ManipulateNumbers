import { InsertSettings, NumberParts } from "./InsertSettings";
import { MyNumber, MyNumeric } from "./Numbers";
import { map, max, sum, zip } from "./Util";

type FormatterNumberParts = [boolean, string, string];
type Pair = [number, number];
export function formatNumbers(numbers: Iterable<MyNumber>, settings: InsertSettings): string[] {
	if (settings.format.toLowerCase() === "c") { return Array.from(map(numbers, x => "TODO")); }
	return formatNumerics(numbers as Iterable<MyNumeric>, settings);
}
function formatNumerics(numbers: Iterable<MyNumeric>, settings: InsertSettings): string[] {
	const { format, signed, super_align, super_align_frac, int_width, precision, zfill, separator, separator_interval } = settings;
	const number_strings = Array.from(map(numbers, x => getNumericParts(x, precision, format)));
	const lengths = number_strings.map(x => calculateAssumedLengths(x, settings));
	const [max_len, max_frac_len] = getSuperWidth(lengths, settings);
	for (const [number, [int_len, frac_len]] of zip(number_strings, lengths)) {
		const [int_digit_count, frac_digit_count] = countDigitsFromAssumedLengths([int_len, frac_len], number[0], settings);
		if (zfill === "0") {
			number[1] = number[1].padStart( int_digit_count, "0");
		}
		number[2] = number[2].padEnd  (frac_digit_count, "0");
	}
	const formatted = number_strings.map(([is_positive, int_str, frac_str], index) => {
		const [int_len, frac_len] = lengths[index];
		if (separator && separator_interval) {
			 int_str = insertSeparatorFromRight( int_str, separator, separator_interval);
			frac_str = insertSeparatorFromLeft (frac_str, separator, separator_interval);
		}
		const sign = !is_positive ? "-" : signed ? "+" : "";
		int_str = sign + int_str;
		if (frac_str) { frac_str = "." + frac_str; }
		int_str = int_str.padStart(int_len, " ");
		return int_str + frac_str;
	});
	return formatted;
}
function getNumericParts(x: MyNumeric, precision: number | null, format: string): FormatterNumberParts {
	const { value, fractional_count: fc, base } = x;
	const is_positive = value >= 0n;
	const abs = is_positive ? value : -value;
	let str = abs.toString(base);
	if (precision !== null) {
		// L = 6; fc = 3; P = 1
		//     PH
		// 012 345
		// 453.768
		const index_h = str.length - fc + precision;
		const digit = parseInt(str[index_h] ?? "0", 16);
		if (digit * 2 >= base) {
			const copy = x.copy();
			copy.value += BigInt(base) ** BigInt(fc - precision);
			const  [is_positive, int_str, frac_str] = getNumericParts(copy, null, format); // null required to net end up in recursion
			return [is_positive, int_str, frac_str.slice(0, precision)];
		}
	}
	if (format.toUpperCase() === format) { str = str.toUpperCase(); }
	else                                 { str = str.toLowerCase(); }
	const frac_start_index = str.length - fc;
	const frac_end_index = precision === null ? str.length : frac_start_index + precision;
	return [is_positive, str.slice(0, frac_start_index) || "0", str.slice(frac_start_index, frac_end_index).replace(/0+$/, "")];
}
function calculateAssumedLengths([is_positive, int_part, frac_part]: FormatterNumberParts, settings: InsertSettings): Pair {
	let int_length = Math.max(int_part.length, settings.int_width);
	if (settings.separator && settings.separator_interval > 0) { int_length = f(int_length, settings.separator_interval); }
	if (settings.signed || !is_positive) { int_length += 1; }

	let frac_length = 0;
	if (settings.precision !== null) {
		frac_length = settings.precision;
	} else if (frac_part.length > 0) {
		frac_length = frac_part.length;
	}
	if (frac_length > 0 && settings.separator && settings.separator_interval > 0) { frac_length = f(frac_length, settings.separator_interval); }
	// Add decimal point if there's a fractional part
	if (frac_length > 0) { frac_length += 1; }

	return [int_length, frac_length];
}
function countDigitsFromAssumedLengths([int_length, frac_length]: Pair, is_positive: boolean, settings: InsertSettings): Pair {
	if (settings.signed || !is_positive) { int_length -= 1; }
	if (settings.separator && settings.separator_interval > 0) { int_length = g(int_length, settings.separator_interval); }

	// Add decimal point if there's a fractional part
	if (frac_length > 0) { frac_length -= 1; }
	if (frac_length > 0 && settings.separator && settings.separator_interval > 0) { frac_length = g(frac_length, settings.separator_interval); }
	return [int_length, frac_length];
}
function f(x: number, n: number): number { return x + Math.floor((x - 1) /  n     ); }
// g = f^-1; g(f(x)) = x
function g(y: number, n: number): number { return y - Math.floor((y - 1) / (n + 1)); }
function getSuperWidth(lengths: Pair[], settings: InsertSettings): Pair {
	const { super_align, super_align_frac } = settings;
	if (!super_align && !super_align_frac) { return [0, 0]; }
	const max_frac_len = super_align_frac ?     max(lengths, ([ali, alf], [bli, blf]) =>       alf >       blf)!.value[1] : 0;
	if (super_align_frac) { for (const len_i_f of lengths) { len_i_f[1] = max_frac_len || len_i_f[1]; } }
	const max_len      = super_align      ? sum(max(lengths, ([ali, alf], [bli, blf]) => ali + alf > bli + blf)!.value  ) : 0;
	if (super_align     ) { for (const len_i_f of lengths) { len_i_f[0] = max_len      -  len_i_f[1]; } }
	return [max_len, max_frac_len];
}
function insertSeparatorFromLeft(str: string, separator: string, separator_interval: number): string {
	return (str
		.replace(new RegExp(`(.{${separator_interval}})`, 'g'), `$1${separator}`)
		.replace(new RegExp(`${separator}$`), '')
	);
}
function insertSeparatorFromRight(str: string, separator: string, separator_interval: number): string {
	return (str
		.split('').reverse().join('')
		.replace(new RegExp(`(.{${separator_interval}})`, 'g'), `$1${separator}`)
		.replace(new RegExp(`${separator}$`), '')
		.split('').reverse().join('')
	);
}

// const int_build = int_str.split("").reverse();
// for (let i = 0; i < int_str.length; i++) {
// 	const digit = int_str[i] ?? zfill;
// 	if (separator && separator_interval && i % separator_interval === 0) {
// 		// note, will add 0 index, which we will exclude after
// 		if (digit === " ") {
			
// 		}
// 		int_build.push(separator)
// 	}
// 	int_build.push(digit);
// }
// const frac_build: string[] = [];
