import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { InsertSettings } from '../InsertSettings';
import { Parser } from '../Parser';
// import * as myExtension from '../../extension';

suite('Parser Tests', () => {
	vscode.window.showInformationMessage('Start all tests.');
	
	const parser = new Parser();

	test('default', () => {
		const settings = parser.getDefaultSettings();
		const result = parser.parseUserInput("");
		assert.deepStrictEqual(result, settings);
	});
	test('simple', () => {
		const settings = parser.getDefaultSettings();
		settings.format = "X";
		settings.start = [+1, "d", "0"];
		settings.step = [-1, "3", "0"];
		settings.separator_interval = 2;
		const result = parser.parseUserInput("Xd-3");
		assert.deepStrictEqual(result, settings);
	});
	test('dec', () => {
		const settings = parser.getDefaultSettings();
		settings.format = "D";
		settings.start = [-1, "11", "0"];
		settings.step = [-1, "3", "0"];
		const result = parser.parseUserInput("D-11-3");
		assert.deepStrictEqual(result, settings);
	});
	test('hex', () => {
		const settings = parser.getDefaultSettings();
		settings.format = "x";
		settings.start = [+1, "d", "0"];
		settings.step = [-1, "3", "0"];
		settings.separator_interval = 2;
		const result = parser.parseUserInput("xd-3");
		assert.deepStrictEqual(result, settings);
	});
	test('chr', () => {
		const settings = parser.getDefaultSettings();
		settings.format = "c";
		settings.start = [+1, "d", "0"];
		settings.step = [+1, "3", "0"];
		const result = parser.parseUserInput("cd+3");
		assert.deepStrictEqual(result, settings);
	});
	test('space trim', () => {
		const settings: InsertSettings = {
			zfill: " ",
			int_width: 16,
			precision: 5,
			format: "d",
			signed: true,
			start: [-1, "6", "3456789"],
			step: [+1, "3", "1"],
			separator: " ",
			separator_interval: 3,
			super_align: false,
			super_align_frac: false,
		};
		const result = parser.parseUserInput(" 16.5d+-6.3456789+3.1 ");
		assert.deepStrictEqual(result, settings);
	});
	test('all', () => {
		const settings: InsertSettings = {
			zfill: "0",
			int_width: 16,
			precision: 5,
			format: "d",
			signed: true,
			start: [-1, "6", "3456789"],
			step: [+1, "3", "1"],
			separator: ",",
			separator_interval: 7,
			super_align: false,
			super_align_frac: false,
		};
		const result = parser.parseUserInput("016.5d+-6.3456789+3.1,7");
		assert.deepStrictEqual(result, settings);
	});
});
