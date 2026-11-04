import { strictEqual } from "node:assert";
import test from "node:test";
import { toDataAttr } from "../../../dist/es/dom/internals/to-data-attr.js";

await test("dom/internals/to-data-attr", () => {
	strictEqual(toDataAttr(""), "data-");
	strictEqual(toDataAttr("foo"), "data-foo");
	strictEqual(toDataAttr("fooBar"), "data-foo-bar");
	strictEqual(toDataAttr("Foo"), "data--foo");
	strictEqual(toDataAttr("fooBarBaz"), "data-foo-bar-baz");
	strictEqual(toDataAttr("fooBAR"), "data-foo-b-a-r");
	strictEqual(toDataAttr("foo-bar"), "data-foo-bar");
	strictEqual(toDataAttr("foo1Bar"), "data-foo1-bar");
	strictEqual(toDataAttr("fooÉ"), "data-fooÉ");
});
