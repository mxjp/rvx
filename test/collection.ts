import test from "ava";
import { smallCollection } from "./_utility";

test("items", t => {
	const versions: string[][] = [];
	const collection = smallCollection();
	collection.subscribe(patch => {
		versions.push(Array.from(collection.getItems()));
	});
	t.deepEqual(versions, [
		["foo", "bar"],
		["baz", "bar"],
		["baz", "foo"],
		["baz", "bar", "foo"]
	]);
});
