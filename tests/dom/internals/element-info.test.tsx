import { strictEqual, throws } from "node:assert";
import test, { suite } from "node:test";
import { HTML, MATHML, SVG } from "rvx";
import { isVoidTag, resolveNamespaceURI, XMLNS_HTML, XMLNS_MATHML, XMLNS_SVG } from "../../../dist/es/dom/internals/element-info.js";

await suite("dom/internals/element-info", async () => {
	await test("resolveNamespaceURI", () => {
		throws(() => resolveNamespaceURI(""));
		throws(() => resolveNamespaceURI("https://example.com"));
		strictEqual(resolveNamespaceURI(HTML), XMLNS_HTML);
		strictEqual(resolveNamespaceURI(SVG), XMLNS_SVG);
		strictEqual(resolveNamespaceURI(MATHML), XMLNS_MATHML);
	});

	await test("isVoidTag", () => {
		strictEqual(isVoidTag(XMLNS_HTML, "br"), true);
		strictEqual(isVoidTag(XMLNS_SVG, "br"), false);
		strictEqual(isVoidTag(XMLNS_MATHML, "br"), false);
		strictEqual(isVoidTag(XMLNS_HTML, "div"), false);
	});
});
