export function evalXpr(xpr: string, s: string): any {
	const x = Number(s);
	return eval(`(() => ${xpr})()`);
}
