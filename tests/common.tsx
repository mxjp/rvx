import { deepStrictEqual } from "node:assert";
import { ENV, teardown, View, ViewBoundaryOwner, viewNodes } from "rvx";
import { assertViewState } from "rvx/test";
import { ACCESS_STACK, LEAK, TEARDOWN_STACK, TRACKING_STACK } from "../dist/es/core/internals/stacks.js";

export function assertEvents(events: unknown[], expected: unknown[]): void {
	deepStrictEqual(events, expected);
	events.length = 0;
}

export function text(node: Node): string {
	if (node instanceof ENV.current.Comment) {
		return "";
	}
	return (node.textContent ?? "").trim();
}

export function viewText(view: View): string {
	let str = "";
	for (const node of viewNodes(view)) {
		str += text(node);
	}
	return str;
}

export function testView(prefix = "") {
	let nextFirst!: () => Node;
	let nextLast!: () => Node;

	let i = 0;
	const view = new View((setBoundary, self) => {
		const first = <div>{prefix}f</div> as HTMLElement;
		const last = <div>l</div> as HTMLElement;
		const frag = ENV.current.document.createDocumentFragment();
		frag.append(first, last);
		setBoundary(first, last);
		assertViewState(self);

		nextFirst = () => {
			const next = <div>{prefix}f{i++}</div> as HTMLElement;
			self.parent!.insertBefore(next, self.last!);
			self.parent!.removeChild(self.first!);
			setBoundary(next, undefined);
			assertViewState(self);
			return next;
		};

		nextLast = () => {
			const next = <div>l{i++}</div> as HTMLElement;
			self.parent!.insertBefore(next, self.last!);
			self.parent!.removeChild(self.last!);
			setBoundary(undefined, next);
			assertViewState(self);
			return next;
		};
	});

	return {
		view,
		nextFirst,
		nextLast,
	};
}

export type TestView = ReturnType<typeof testView>;

export function boundaryEvents(events: unknown[]): ViewBoundaryOwner {
	return (first, last) => {
		events.push(text(first) + text(last));
	};
}

export function lifecycleEvent(events: unknown[], key: unknown): void {
	events.push(`s:${key}`);
	teardown(() => {
		events.push(`e:${key}`);
	});
}

export type ResolveFn<T> = (value: T | PromiseLike<T>) => void;
export type RejectFn = (error: unknown | void | PromiseLike<unknown | void>) => void;

export function future<T = void>(): [Promise<T>, ResolveFn<T>, RejectFn] {
	let resolve!: ResolveFn<T>;
	let reject!: RejectFn;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return [promise, resolve, reject];
}

export function withMsg(message: string): (error: unknown) => boolean {
	return error => {
		return (error instanceof Error) && error.message === message;
	};
}

export function isIsolated(): boolean {
	return TEARDOWN_STACK[TEARDOWN_STACK.length - 1] === LEAK
		&& ACCESS_STACK[ACCESS_STACK.length - 1] === undefined
		&& TRACKING_STACK[TRACKING_STACK.length - 1];
}

export async function handleFinallyRejections(fn: () => Promise<void>): Promise<unknown[]> {
	const errors: unknown[] = [];
	const originalFinally = Promise.prototype.finally;
	Promise.prototype.finally = function (...args) {
		const result = originalFinally.apply(this, args);
		result.catch(error => errors.push(error));
		return result;
	};
	try {
		await fn();
	} finally {
		Promise.prototype.finally = originalFinally;
	}
	return errors;
}

export async function handleExplicitRejections(fn: () => Promise<void>): Promise<unknown[]> {
	const errors: unknown[] = [];
	const originalReject = Promise.reject;
	Promise.reject = function (...args): any {
		const result = originalReject.apply(this, args);
		result.catch(error => errors.push(error));
		return result;
	};
	try {
		await fn();
	} finally {
		Promise.reject = originalReject;
	}
	return errors;
}

export function computeMapArrayDiffEvents(prev: number[], next: number[]) {
	function computeRaw(prev: number[], next: number[]) {
		const events: unknown[] = [];
		const consumed = prev.map(() => false);
		for (const value of next) {
			const prevIndex = prev.findIndex((v, i) => v === value && !consumed[i]);
			if (prevIndex < 0) {
				events.push(`+${value}`);
			} else {
				consumed[prevIndex] = true;
			}
		}
		for (let i = prev.length - 1; i >= 0; i--) {
			if (!consumed[i]) {
				events.unshift(`-${prev[i]}`);
			}
		}
		return events;
	}

	prev = Array.from(prev);
	next = Array.from(next);
	const allEvents = computeRaw(prev, next);
	while (prev.length > 0 && next.length > 0 && prev[0] === next[0]) {
		prev.shift();
		next.shift();
	}
	while (prev.length > 0 && next.length > 0 && prev[prev.length - 1] === next[next.length - 1]) {
		prev.pop();
		next.pop();
	}
	const trimmedEvents = computeRaw(prev, next);
	deepStrictEqual(allEvents.toSorted(), trimmedEvents.toSorted());
	return trimmedEvents;
}
