'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { NumInserter } from './NumInserter';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	//console.log('Congratulations, your extension "insertnumbers" is now active!');
	// console.log("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
	const inserter = new NumInserter();
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	context.subscriptions.push(vscode.commands.registerCommand('manipulatenumbers.insertNumbers', async () => {
		await inserter.processInsert();
	}));
	context.subscriptions.push(vscode.commands.registerCommand('manipulatenumbers.manipulateNumbers', async () => {
		await inserter.processManipulate();
	}));
	context.subscriptions.push(inserter);
	// console.log("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
}

// this method is called when your extension is deactivated
export function deactivate() {
	// console.log("dddddddddddddddddddddddddddddd");
}

