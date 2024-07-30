import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { MyDecimal, MyHexadecimal, MyNumber } from '../Numbers';
import { Parser } from '../Parser';

suite('MyNumber Tests', () => {
	vscode.window.showInformationMessage('Start all tests.');
	
	suite("Numeric", () => {
		suite("Arithmetic", () => {
			test("dec", () => {
				const a = MyDecimal.fromNumberParts([-1, "123", "456789"]);
				assert.strictEqual(a.base, 10);
				assert.strictEqual(a.value, -123456789n);
				assert.strictEqual(a.fractional_count, 6);
				const b = a.copy();
				assert.deepStrictEqual(a, b);
				const c = a.copy();
				const d = a.copy();
				a.add(b);
				a.add(b);
				a.add(b);
				c.mul(4);
				assert.deepStrictEqual(c, MyDecimal.fromNumberParts([-1, "493", "827156"]));
				assert.deepStrictEqual(a, c);
				assert.notDeepStrictEqual(a, d);
				assert.deepStrictEqual(b, d);
			});
			test("hex", () => {
				const a = MyHexadecimal.fromNumberParts([+1, "1234567", "89abCDef"]);
				assert.strictEqual(a.base, 16);
				assert.strictEqual(a.value, 81985529216486895n);
				assert.strictEqual(a.fractional_count, 8);
				const b = a.copy();
				assert.deepStrictEqual(a, b);
				const c = a.copy();
				const d = a.copy();
				a.add(b);
				a.add(b);
				a.add(b);
				c.mul(4);
				assert.deepStrictEqual(c, MyHexadecimal.fromNumberParts([+1, "48d159e", "26af37bc"]));
				assert.deepStrictEqual(a, c);
				assert.notDeepStrictEqual(a, d);
				assert.deepStrictEqual(b, d);
			});
			test("hex different frac", () => {
				const a = MyHexadecimal.fromNumberParts([+1, "0", "05"]);
				const b = MyHexadecimal.fromNumberParts([+1, "1", "025"]);
				a.add(b);
				assert.deepStrictEqual(a, MyHexadecimal.fromNumberParts([+1, "1", "075"]));
			});
		});
		// suite("Formatter", () => {
		// 	const parser = new Parser();
		// 	test("default", () => {
		// 		const settings = parser.getDefaultSettings();
		// 		const a = new MyDecimal(12345678n, 5);
		// 		const result = a.format(settings);
		// 		assert.strictEqual(result, "123.45678");
		// 	});
		// });
	});
});
