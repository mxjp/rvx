import { deepStrictEqual, notStrictEqual, strictEqual } from "node:assert";
import test, { suite } from "node:test";
import { $, ENV, NODE, render, uncapture, View, viewNodes } from "rvx";
import { createText } from "../../dist/es/core/render-text-internals.js";
import { assertEvents, boundaryEvents, testView, text, viewText } from "../common.js";

await suite("render", async () => {
	function renderToNodes(content: unknown) {
		return Array.from(viewNodes(render(content)));
	}

	await test("createText (internal)", () => {
		const signal = $<unknown>(undefined);
		const text = uncapture(() => createText(signal, ENV.current));
		strictEqual(text.textContent, "");
		signal.value = null;
		strictEqual(text.textContent, "");
		signal.value = 42;
		strictEqual(text.textContent, "42");
		signal.value = "test";
		strictEqual(text.textContent, "test");
	});

	await test("view passthrough", () => {
		const inner = render(undefined);
		strictEqual(inner instanceof View, true);
		const outer = render(inner);
		strictEqual(inner, outer);
	});

	await test("null & undefined", () => {
		for (const value of [null, undefined]) {
			const view = render(value);
			const nodes = renderToNodes(view);
			strictEqual(nodes.length, 1);
			strictEqual(nodes[0] instanceof ENV.current.Comment, true);
		}
	});

	await test("document fragment", () => {
		const fragment = ENV.current.document.createDocumentFragment();
		const a = ENV.current.document.createElement("div");
		const b = ENV.current.document.createElement("div");
		fragment.appendChild(a);
		fragment.appendChild(b);
		const view = render(fragment);
		const nodes = Array.from(viewNodes(view));
		deepStrictEqual(nodes, [a, b]);
		strictEqual(a.parentNode, fragment);
		strictEqual(b.parentNode, fragment);
	});

	await test("node target", () => {
		const view = render({ [NODE]: ENV.current.document.createTextNode("test") });
		strictEqual(view.first instanceof ENV.current.Text, true);
		strictEqual(view.first, view.last);
		strictEqual(viewText(view), "test");
	});

	await test("node targets", () => {
		const view = render([
			{ [NODE]: ENV.current.document.createTextNode("a") },
			{ [NODE]: ENV.current.document.createTextNode("b") },
		]);
		strictEqual(viewText(view), "ab");
	});

	await test("empty document fragment", () => {
		const view = render(ENV.current.document.createDocumentFragment());
		strictEqual(view.first instanceof ENV.current.Comment, true);
		strictEqual(view.first, view.last);
	});

	await test("empty document fragment in array", () => {
		const view = render([
			ENV.current.document.createDocumentFragment(),
			ENV.current.document.createDocumentFragment(),
		]);
		strictEqual(view.first instanceof ENV.current.Comment, true);
		strictEqual(view.last instanceof ENV.current.Comment, true);
	});

	await test("empty document fragment in array with view", () => {
		const events: unknown[] = [];
		const inner = testView();
		const view = uncapture(() => {
			return render([
				ENV.current.document.createDocumentFragment(),
				inner.view,
				ENV.current.document.createDocumentFragment(),
			]);
		});
		strictEqual(viewText(view), "fl");
		uncapture(() => view.setBoundaryOwner(boundaryEvents(events)));
		inner.nextFirst();
		inner.nextLast();
		assertEvents(events, []);
	});

	await test("empty document fragments in array with view", () => {
		const events: unknown[] = [];
		const inner = testView();
		const view = uncapture(() => {
			return render([
				ENV.current.document.createDocumentFragment(),
				ENV.current.document.createDocumentFragment(),
				inner.view,
				ENV.current.document.createDocumentFragment(),
				ENV.current.document.createDocumentFragment(),
			]);
		});
		strictEqual(viewText(view), "fl");
		uncapture(() => view.setBoundaryOwner(boundaryEvents(events)));
		strictEqual(view.first instanceof ENV.current.Comment, true);
		strictEqual(view.last instanceof ENV.current.Comment, true);
		inner.nextFirst();
		inner.nextLast();
		assertEvents(events, []);
	});

	await test("non empty document fragments in array with view", () => {
		const events: unknown[] = [];
		const inner = testView();
		const view = uncapture(() => {
			return render([
				ENV.current.document.createDocumentFragment(),
				render([1, "2"]),
				ENV.current.document.createDocumentFragment(),
				inner.view,
				ENV.current.document.createDocumentFragment(),
				render([3, "4"]),
				ENV.current.document.createDocumentFragment(),
			]);
		});
		strictEqual(viewText(view), "12fl34");
		uncapture(() => view.setBoundaryOwner(boundaryEvents(events)));
		inner.nextFirst();
		inner.nextLast();
		assertEvents(events, []);
	});

	await test("node", () => {
		for (const node of [
			ENV.current.document.createElement("div"),
			ENV.current.document.createComment("test"),
		]) {
			deepStrictEqual(renderToNodes(node), [node]);
		}
	});

	await test("text", () => {
		for (const value of ["test", 42, true]) {
			for (const nodes of [
				renderToNodes(value),
				uncapture(() => renderToNodes(() => value)),
				uncapture(() => renderToNodes($(value))),
			]) {
				strictEqual(nodes.length, 1);
				strictEqual(nodes[0] instanceof ENV.current.Text, true);
				strictEqual(nodes[0].textContent, String(value));
			}
		}
	});

	await suite("arrays", async () => {
		await test("single view", () => {
			const content = ENV.current.document.createElement("div");
			const inner = render(content);
			strictEqual(inner instanceof View, true);
			const outer = uncapture(() => render([inner]));
			notStrictEqual(inner, outer);
			deepStrictEqual(Array.from(viewNodes(outer)), [content]);
		});

		await test("inner view", () => {
			const inner = testView();

			const fragmentChild = ENV.current.document.createElement("div");
			const fragment = ENV.current.document.createDocumentFragment();
			fragment.appendChild(fragmentChild);

			const view = uncapture(() => render([
				"foo",
				[
					null,
					inner.view,
					() => "bar",
					fragment,
				],
				[undefined],
			]));

			uncapture(() => view.setBoundaryOwner(() => {
				throw new Error("boundary should be static");
			}));

			{
				const nodes = Array.from(viewNodes(view));
				strictEqual(nodes.length, 7);
				strictEqual(text(nodes[0]), "foo");
				strictEqual(text(nodes[2]), "f");
				strictEqual(text(nodes[3]), "l");
				strictEqual(text(nodes[4]), "bar");
				strictEqual(nodes[5], fragmentChild);
			}

			{
				inner.nextFirst();
				inner.nextLast();
				const nodes = Array.from(viewNodes(view));
				strictEqual(nodes.length, 7);
				strictEqual(text(nodes[2]), "f0");
				strictEqual(text(nodes[3]), "l1");
			}
		});

		await test("outer views", () => {
			const events: unknown[] = [];
			const first = testView();
			const last = testView();

			const fragmentChild = ENV.current.document.createElement("div");
			const fragment = ENV.current.document.createDocumentFragment();
			fragment.appendChild(fragmentChild);

			const view = uncapture(() => render([
				[first.view],
				[[
					"foo",
					fragment,
					() => 42,
				]],
				last.view,
			]));

			uncapture(() => view.setBoundaryOwner(boundaryEvents(events)));

			{
				const nodes = Array.from(viewNodes(view));
				strictEqual(nodes.length, 7);
				strictEqual(text(nodes[0]), "f");
				strictEqual(text(nodes[1]), "l");
				strictEqual(text(nodes[2]), "foo");
				strictEqual(nodes[3], fragmentChild);
				strictEqual(text(nodes[4]), "42");
				strictEqual(text(nodes[5]), "f");
				strictEqual(text(nodes[6]), "l");
				assertEvents(events, []);
			}

			{
				first.nextLast();
				strictEqual(view.first, first.view.first);
				strictEqual(view.last, last.view.last);
				const nodes = Array.from(viewNodes(view));
				strictEqual(nodes.length, 7);
				strictEqual(text(nodes[1]), "l0");
				assertEvents(events, ["fl"]);
			}

			{
				first.nextFirst();
				strictEqual(view.first, first.view.first);
				strictEqual(view.last, last.view.last);
				const nodes = Array.from(viewNodes(view));
				strictEqual(nodes.length, 7);
				strictEqual(text(nodes[0]), "f1");
				strictEqual(text(nodes[6]), "l");
				assertEvents(events, ["f1l"]);
			}

			{
				last.nextFirst();
				strictEqual(view.first, first.view.first);
				strictEqual(view.last, last.view.last);
				const nodes = Array.from(viewNodes(view));
				strictEqual(nodes.length, 7);
				strictEqual(text(nodes[5]), "f0");
				assertEvents(events, ["f1l"]);
			}

			{
				last.nextLast();
				strictEqual(view.first, first.view.first);
				strictEqual(view.last, last.view.last);
				const nodes = Array.from(viewNodes(view));
				strictEqual(nodes.length, 7);
				strictEqual(text(nodes[0]), "f1");
				strictEqual(text(nodes[6]), "l1");
				assertEvents(events, ["f1l1"]);
			}
		});
	});
});
