
import test from "ava";
import { resolveObserver } from "../../src/observables";

test("resolve object", t => {
	const obj = {};
	t.is(resolveObserver(obj), obj);
});

test("resolve void", t => {
	t.deepEqual(resolveObserver(), {});
});

test("resolve resolve", t => {
	const resolve = () => {};
	t.deepEqual(resolveObserver(resolve), { resolve });
});
