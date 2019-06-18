import test from "ava";
import { Cycle } from "../src/cycle";

test("create empty", t => {
	const cycle = new Cycle();
	cycle.dispose();
	t.pass();
});

test("create with logic", t => {
	const cycle = new Cycle(() => t.pass());
	cycle.dispose();
});

test("add logic", t => {
	const cycle = new Cycle();
	cycle.add(() => t.pass());
	cycle.dispose();
});

test("add void logic", t => {
	const cycle = new Cycle();
	cycle.add();
	cycle.dispose();
	t.pass();
});

test("delete logic", t => {
	const cycle = new Cycle();
	const logic = () => t.fail();
	cycle.add(logic);
	cycle.delete(logic);
	cycle.dispose();
	t.pass();
});

test("delete from empty", t => {
	const cycle = new Cycle();
	cycle.delete(() => { });
	t.pass();
});

test("reuse", t => {
	let state = 0;
	const cycle = new Cycle(() => t.is(state, 1));
	state = 1;
	cycle.dispose();
	cycle.add(() => t.is(state, 2));
	state = 2;
	cycle.dispose();
});
