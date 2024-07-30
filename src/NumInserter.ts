// TODO manipulate after insert

'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {
	MyNumber, 
	MyDecimal, MyHexadecimal, MyStringNumber, 
	// MyFormatter, createFormatter,
	format_to_number_class,
	MyNumeric, 
} from "./Numbers";
import { all, enumerate, filter, HandledError, map, only, zip } from "./Util";
import { Parser } from './Parser';
import { InsertSettings } from './InsertSettings';
import { formatNumbers } from './Formatter';
import { evaluate } from './Evaluator';

// TODO add formula
// like ctrl+alt+f opens window, you type formula
// js eval(`((s: string, x: number | undefined) => ${formula})()`)
// this means that formula could be something like 
//     11 - x
//     { if (x !== undefined) { return 11 - x; } return s + " SOME_SPEIFIC_STRING_TO_FIND_IT_EASILY"; }

function createNewSelectionFromText(selection: vscode.Selection, text: string): vscode.Selection {
	const start_position = selection.start;
	const lines = text.split(/\n|\r\n?/);
	const end_line = start_position.line + lines.length - 1;
	const end_character = lines.length > 1 ? lines[lines.length - 1].length : start_position.character + text.length;

	const end_position = new vscode.Position(end_line, end_character);
	return new vscode.Selection(start_position, end_position);
}

export class NumInserter {
	private parser = new Parser();
	
	public async processInsert() {
		//Input default numbers first.
		
		const settings = await this.getSettings();
		if (settings === undefined) { return; }
		await this.insertNumbers(settings);
		await this.processManipulate();
	}
	public async processManipulate() {
		const text_editor = vscode.window.activeTextEditor;
		if (text_editor === undefined) { return; }
		const selections: readonly vscode.Selection[] = text_editor.selections;
		if (selections.length === 0) { return; }
		
		const strings = await this.getManipulation(text_editor, selections);
		if (strings === undefined) { return; }
		const new_selections = selections.map((sel, index) => createNewSelectionFromText(sel, strings[index]));
		await text_editor.edit((builder) => {
			for (const [sel, str] of zip(selections, strings)) {
				builder.replace(sel, str);
			}
		});
		// vscode.window.showInformationMessage(JSON.stringify(new_selections));
		text_editor.selections = new_selections;
	}
	
	private async getManipulation(text_editor: vscode.TextEditor, selections: readonly vscode.Selection[]): Promise<string[] | undefined> {
		let input: string | undefined = undefined;
		
		while (true) {
			const opt: vscode.InputBoxOptions = {
				placeHolder: "default: s",
				prompt: "Fill in JS expression or function body: (x: number, s: string) => Your_Input     Or command like `:count`",
				value: input,
			};
			input = await vscode.window.showInputBox(opt);
			if (input === undefined) { return undefined; }
			
			const before = selections.map(sel => text_editor.document.getText(sel));
			try {
				var results = evaluate(before, input);
			} catch (error) {
				if (!(error instanceof HandledError)) {
					const errmsg = error instanceof Error ? error.stack || error.name + " " + error.message : JSON.stringify(error);
					void vscode.window.showErrorMessage(errmsg);
				}
				continue;
			}
			if (results === undefined) { return undefined; }
			if (results.length !== selections.length) {
				void vscode.window.showErrorMessage("Evaluation didn't result in equal number of elements\nThis is most likely a bug");
				continue;
			}
			const strings = results.map(s => "" + s);
			return strings;
		}
	}
	private async getSettings(): Promise<InsertSettings | undefined> {
		let input: string | undefined = undefined;
		
		while (true) {
			const opt: vscode.InputBoxOptions = {
				placeHolder: "default: d0+1",
				prompt: "Input format [zfill][=][int_width][.(=|precision)][format][signed][start][±step][separator][separator_interval]",
				value: input,
			};
			input = await vscode.window.showInputBox(opt);
			if (input === undefined) { return undefined; }
			
			const settings = this.parser.parseUserInput(input);
			if (settings !== undefined) {
				return settings;
			}
		}
	}

	private async insertNumbers(settings: InsertSettings) {
		const text_editor = vscode.window.activeTextEditor;
		if (text_editor === undefined) { return; }

		const selections: readonly vscode.Selection[] = text_editor.selections;
		if (selections.length === 0) { return; }
		
		const ctr = format_to_number_class[settings.format.toLowerCase()];
		const current = ctr.fromNumberParts(settings.start);
		const step    = ctr.fromNumberParts(settings.step);
		
		const numbers = formatNumbers((function*() {
			for (const _ of selections) {
				yield current;
				current.add(step);
			}
		})(), settings);
		// console.log(JSON.stringify(numbers, undefined, 2));
		const new_selections = selections.map((sel, index) => {
			const str: string = numbers[index];
			return new vscode.Selection(sel.start, sel.start.translate(0, str.length));
		});
		await text_editor.edit((builder) => {
			for (const [sel, str] of zip(selections, numbers)) {
				builder.replace(sel, str);
			}
		});
		// vscode.window.showInformationMessage(JSON.stringify(new_selections));
		text_editor.selections = new_selections;
	}
	


	public dispose() {
		// this._settings.dispose();
	}
}



// export class InsertSettings implements IInsertSettings {
// 	public format: string;
// 	public start: MyNumber;
// 	public step: MyNumber;
// 	public signed: boolean;
// 	public width: number;
// 	public precision: number;
// 	public zfill: string;
// 	public separator: string;

// 	private _disposable: vscode.Disposable;

// 	// constructor() {
// 	// 	this.formatStr = "";
// 	// 	this.start = 0;
// 	// 	this.step = 0;
// 	// 	let subscriptions: vscode.Disposable[] = [];
// 	// 	vscode.workspace.onDidChangeConfiguration(this.updateSettings, this, subscriptions);
// 	// 	this._disposable = vscode.Disposable.from(...subscriptions);

// 	// 	this.updateSettings();
// 	// }


// 	// private updateSettings() {
// 	// 	var settings = vscode.workspace.getConfiguration("insertnum");
// 	// 	if (!settings) {
// 	// 		return;
// 	// 	}

// 	// 	//TODO: format check.
// 	// 	let formatStr = settings.get<string>("formatstr");
// 	// 	if (typeof formatStr === 'string') {
// 	// 		this.formatStr = formatStr;
// 	// 	} else {
// 	// 		this.formatStr = "%d";
// 	// 	}

// 	// 	let start = settings.get<number>("start");
// 	// 	if (typeof start === "number") {
// 	// 		this.start = start;
// 	// 	} else {
// 	// 		this.start = 0;
// 	// 	}


// 	// 	let step = settings.get<number>("step");
// 	// 	if (typeof step === 'number') {
// 	// 		this.step = step;
// 	// 	} else {
// 	// 		this.step = 1;
// 	// 	}
// 	// }

// 	// public dispose() {
// 	// 	this._disposable.dispose();
// 	// }
// }
