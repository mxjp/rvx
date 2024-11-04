import { deepStrictEqual, strictEqual } from "node:assert";
import test, { suite } from "node:test";
import { uncapture } from "rvx";
import { jsx, Fragment } from "rvx/jsx";
import { Fragment as R17Fragment } from "rvx/jsx-runtime";

await suite("jsx-legacy-runtime", async () => {
	await test("create element", () => {
		const elem = uncapture(() => {
			return <div
				foo="bar"
				class={["a", "b"]}
				data-bar="baz"
				attr:data-baz="boo"
				prop:title="example"
			/> as HTMLElement;
		});
		strictEqual(elem.getAttribute("foo"), "bar");
		deepStrictEqual(Array.from(elem.classList), ["a", "b"]);
		strictEqual(elem.dataset.bar, "baz");
		strictEqual(elem.dataset.baz, "boo");
		strictEqual(elem.title, "example");
	});

	await test("jsx fragment", () => {
		deepStrictEqual(<></>, []);
		deepStrictEqual(<>test</>, ["test"]);
		deepStrictEqual(<>{1}{2}</>, [1, 2]);
	});

	await test("complex content", () => {
		const elem = uncapture(() => {
			return <div>{1}{2}</div> as HTMLElement;
		});
		deepStrictEqual(elem.textContent, "12");
	});

	await test("spread operator", () => {
		const elem = uncapture(() => {
			return <div foo="a" {...{ baz: "c" }} bar="b" /> as HTMLElement;
		});
		strictEqual(elem.getAttribute("foo"), "a");
		strictEqual(elem.getAttribute("bar"), "b");
		strictEqual(elem.getAttribute("baz"), "c");
	});

	function TestComponent(props: { foo?: string, bar?: number, children?: unknown }) {
		return props;
	}

	await test("component", () => {
		const props = <TestComponent foo="a" bar={1} /> as Parameters<typeof TestComponent>[0];
		deepStrictEqual(props, { foo: "a", bar: 1 });
	});

	await test("component without props", () => {
		const props = <TestComponent /> as Parameters<typeof TestComponent>[0];
		deepStrictEqual(props, {});
	});

	await test("implicit component children", () => {
		const props = <TestComponent foo="a" bar={1}>{2}</TestComponent> as Parameters<typeof TestComponent>[0];
		deepStrictEqual(props, { foo: "a", bar: 1, children: [2] });
	});

	await test("explicit component children", () => {
		const props = <TestComponent foo="a" bar={1} children={2} /> as Parameters<typeof TestComponent>[0];
		deepStrictEqual(props, { foo: "a", bar: 1, children: 2 });
	});

	await test("fragment compat", () => {
		strictEqual(Fragment, R17Fragment);
	});
});
