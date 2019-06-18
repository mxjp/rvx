import test from "ava";
import { Collection } from "../src";
import { smallCollection } from "./_utility";

test("items", t => {
	const versions: string[][] = [];
	const collection = smallCollection();
	collection.subscribe(patch => {
		versions.push(Array.from(collection.items));
	});
	t.deepEqual(versions, [
		["foo", "bar"],
		["baz", "bar"],
		["baz", "foo"],
		["baz", "bar", "foo"]
	]);
});

test("from array", t => {
	const collection = Collection.items(["foo", "bar"]);
	collection.subscribe();
	t.deepEqual(collection.items, ["foo", "bar"]);
});

test("from iterable", t => {
	const collection = Collection.items((function *() {
		yield "foo";
		yield "bar";
	})());
	collection.subscribe();
	t.deepEqual(collection.items, ["foo", "bar"]);
});
