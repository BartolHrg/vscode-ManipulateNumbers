import * as vscode from 'vscode';
import { evalXpr } from "./evaluate";

export function evaluate(strings: string[], xpr: string): any[] | undefined {
	xpr = xpr.trim();
	if (!xpr) { return undefined; }
	if (xpr.startsWith(":")) {
		return evaluateAggregate(strings, xpr.slice(1));
	} else {
		return strings.map(s => evalXpr(xpr, s));
	}
}

function evaluateAggregate(strings: string[], command: string): any[] | undefined {
	switch (command) {
		case "count": {
			void vscode.window.showInformationMessage(strings.length.toString());
			return undefined;
		}
		default: {
			throw new Error(`Command not recognized: ${command}`);
		}
	}
	return undefined;
}
