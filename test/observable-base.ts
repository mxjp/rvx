import test from "ava";
import { Observable } from "../src";

test("pipe", t => {
	const a = new Observable<string>();
	const b = new Observable<number>();

	t.is(a.pipe(source => {
		t.is(a, source);
		return b;
	}), b);
});
