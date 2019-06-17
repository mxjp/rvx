
import test from "ava";
import { Disposable } from "../../src/disposables";

test("create empty", t => {
	const disposable = new Disposable();
	disposable.dispose();
	t.pass();
});

test("create with logic", t => {
	const disposable = new Disposable(() => t.pass());
	disposable.dispose();
});

test("add logic", t => {
	const disposable = new Disposable();
	disposable.add(() => t.pass());
	disposable.dispose();
});

test("add void logic", t => {
	const disposable = new Disposable();
	disposable.add();
	disposable.dispose();
	t.pass();
});

test("delete logic", t => {
	const disposable = new Disposable();
	const logic = () => t.fail();
	disposable.add(logic);
	disposable.delete(logic);
	disposable.dispose();
	t.pass();
});

test("delete from empty", t => {
	const disposable = new Disposable();
	disposable.delete(() => {});
	t.pass();
});

test("reuse", async t => {
	let state = 0;
	const disposable = new Disposable(() => t.is(state, 1));
	state = 1;
	disposable.dispose();
	t.is(await disposable.add(() => {
		t.is(state, 1);
		return Promise.resolve("foo");
	}), "foo");
	state = 2;
	disposable.dispose();
});
