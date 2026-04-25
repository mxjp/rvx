import { strictEqual } from "node:assert";
import test, { suite } from "node:test";
import { e, ElementBuilder, Override, override, uncapture } from "rvx";

await suite("override", async () => {
	await suite("element builder based", async () => {
		await test("with element", () => {
			const elem = uncapture(() => override(
				e("div").class("foo").elem
			).class("bar").elem);
			strictEqual(elem.getAttribute("class"), "foo bar");
		});

		await test("with builder", () => {
			const elem = uncapture(() => override(
				e("div").class("foo")
			).class("bar").elem);
			strictEqual(elem.getAttribute("class"), "foo bar");
		});
	});

	await suite("jsx based", async () => {
		await test("with element", () => {
			const elem = uncapture(() => <Override class="bar">
				<div class="foo">test</div>
			</Override> as HTMLElement);
			strictEqual(elem.getAttribute("class"), "foo bar");
		});

		await test("with builder", () => {
			const elem = uncapture(() => <Override class="bar">
				{e("div").class("foo")}
			</Override> as ElementBuilder<HTMLElement>).elem;
			strictEqual(elem.getAttribute("class"), "foo bar");
		});
	});
});
