import { strictEqual } from "node:assert";
import test, { suite } from "node:test";
import { e, ElementBuilder, leak, Override, override } from "rvx";

await suite("override", async () => {
	await suite("element builder based", async () => {
		await test("with element", () => {
			const elem = leak(() => override(
				e("div").class("foo").elem
			).class("bar").elem);
			strictEqual(elem.getAttribute("class"), "foo bar");
		});

		await test("with builder", () => {
			const elem = leak(() => override(
				e("div").class("foo")
			).class("bar").elem);
			strictEqual(elem.getAttribute("class"), "foo bar");
		});
	});

	await suite("jsx based", async () => {
		await test("with element", () => {
			const elem = leak(() => <Override class="bar">
				<div class="foo">test</div>
			</Override> as HTMLElement);
			strictEqual(elem.getAttribute("class"), "foo bar");
		});

		await test("with builder", () => {
			const elem = leak(() => <Override class="bar">
				{e("div").class("foo")}
			</Override> as ElementBuilder<HTMLElement>).elem;
			strictEqual(elem.getAttribute("class"), "foo bar");
		});
	});
});
