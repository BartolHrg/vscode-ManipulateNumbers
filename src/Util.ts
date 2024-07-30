export function* enumerate<T>(iterable: Iterable<T>, start = 0): Iterable<[number, T]> {
	for (const element of iterable) {
		yield [start++, element];
	}
}

export function* filter<T>(iterable: Iterable<T>, predicate = (x: T) => x as boolean): Iterable<T> {
	for (const element of iterable) {
		if (predicate(element)) { yield element; }
	}
}
export function* map<T, R>(iterable: Iterable<T>, f: (x: T) => R): Iterable<R> {
	for (const element of iterable) {
		yield f(element);
	}
}
export type ArrayElementIdentifier<T> = {value: T, index: number};
export function min<T>(iterable: Iterable<T>, isLessThan = (a: T, b: T) => a < b): ArrayElementIdentifier<T> | undefined {
	let first = true;
	let minimum: ArrayElementIdentifier<T> | undefined = undefined;
	for (const [i, element] of enumerate(iterable)) {
		if (first) {
			first = false;
			minimum = {value: element, index: i};
		} else {
			if (isLessThan(element, minimum!.value)) {
				minimum = {value: element, index: i};
			}
		}
	}
	return minimum;
}
export function max<T>(iterable: Iterable<T>, isGreaterThan = (a: T, b: T) => a > b): ArrayElementIdentifier<T> | undefined { 
	let first = true;
	let maximum: ArrayElementIdentifier<T> | undefined = undefined;
	for (const [i, element] of enumerate(iterable)) {
		if (first) {
			first = false;
			maximum = {value: element, index: i};
		} else {
			if (isGreaterThan(element, maximum!.value)) {
				maximum = {value: element, index: i};
			}
		}
	}
	return maximum;
}
export function minmax<T>(iterable: Iterable<T>, isLessThan = (a: T, b: T) => a < b): [ArrayElementIdentifier<T>, ArrayElementIdentifier<T>] | undefined {
	let first = true;
	let minimum: ArrayElementIdentifier<T> | undefined = undefined;
	let maximum: ArrayElementIdentifier<T> | undefined = undefined;
	for (const [i, element] of enumerate(iterable)) {
		if (first) {
			first = false;
			minimum = {value: element, index: i};
			maximum = {value: element, index: i};
		} else {
			if (isLessThan(element, minimum!.value)) {
				minimum = {value: element, index: i};
			}
			if (isLessThan(maximum!.value, element)) {
				maximum = {value: element, index: i};
			}
		}
	}
	if (minimum === undefined) { return undefined; }
	return [minimum!, maximum!];
}
export function minmaxv<T>(iterable: Iterable<T>, isLessThan = (a: T, b: T) => a < b): [T, T] | undefined {
	return minmax(iterable, isLessThan)?.map(x => x.value) as ([T, T] | undefined);
}
export function sum<T>(iterable: Iterable<T>, start: T = 0 as any): T {
	for (const x of iterable) {
		(start as any) += (x as any);
	}
	return start;
}
export function onlyAssert<T>(iterable: Iterable<T>): T {
	let value: T;
	let first = true;
	for (const element of iterable) {
		if (!first) { throw new Error("not only element"); }
		first = false;
		value = element;
	}
	if (first) { throw new Error("no elements"); }
	return value!;
}
export function only<T>(iterable: Iterable<T>): T | undefined {
	for (const element of iterable) {
		return element;
	}
	return undefined;
}

export function* zip<T extends any[]>(...iterables: { [K in keyof T]: Iterable<T[K]> }): Generator<T> {
	const iterators = iterables.map(iterable => iterable[Symbol.iterator]());
	while (true) {
		const results = iterators.map(iterator => iterator.next());
		if (results.some(result => result.done)) { break; }
		yield results.map(result => result.value) as T;
	}
}

export function all<T>(iterable: Iterable<T>, what = (x: T) => x as boolean): boolean {
	for (const element of iterable) {
		if (!what(element)) { return false; }
	}
	return true;
}
export function any<T>(iterable: Iterable<T>, what = (x: T) => x as boolean): boolean {
	for (const element of iterable) {
		if (what(element)) { return true; }
	}
	return false;
}

export class HandledError extends Error {}
