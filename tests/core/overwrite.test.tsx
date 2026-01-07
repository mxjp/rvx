import { strictEqual } from "node:assert";
import test, { suite } from "node:test";
import { e, ElementBuilder, Overwrite, overwrite, uncapture } from "rvx";

await suite("overwrite", async () => {
	await suite("element builder based", async () => {
		await test("with element", () => {
			const elem = uncapture(() => overwrite(
				e("div").class("foo").elem
			).class("bar").elem);
			strictEqual(elem.getAttribute("class"), "foo bar");
		});

		await test("with builder", () => {
			const elem = uncapture(() => overwrite(
				e("div").class("foo")
			).class("bar").elem);
			strictEqual(elem.getAttribute("class"), "foo bar");
		});
	});

	await suite("jsx based", async () => {
		await test("with element", () => {
			const elem = uncapture(() => <Overwrite class="bar">
				<div class="foo">test</div>
			</Overwrite> as HTMLElement);
			strictEqual(elem.getAttribute("class"), "foo bar");
		});

		await test("with builder", () => {
			const elem = uncapture(() => <Overwrite class="bar">
				{e("div").class("foo")}
			</Overwrite> as ElementBuilder<HTMLElement>).elem;
			strictEqual(elem.getAttribute("class"), "foo bar");
		});
	});
});
