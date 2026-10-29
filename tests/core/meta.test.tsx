import { strictEqual } from "node:assert";
import test, { suite } from "node:test";
import { getRoot, getSource, setSource, unsetSource } from "rvx";

await suite("meta", async () => {
	await test("setSource & getSource", () => {
		const target = {};
		const source = {};
		strictEqual(getSource(target), undefined);
		setSource(target, source);
		strictEqual(getSource(target), source);
		strictEqual(getSource(source), undefined);
	});

	await test("unsetSource", () => {
		const target = {};
		const source = {};
		setSource(target, source);
		unsetSource(target);
		strictEqual(getSource(target), undefined);
	});

	await suite("getRoot", async () => {
		await test("basic usage", () => {
			const target = {};
			strictEqual(getRoot(target), target);

			const source = {};
			setSource(target, source);
			strictEqual(getRoot(target), source);
		});

		await test("resolve chain", () => {
			const a = {};
			const b = {};
			const c = {};
			setSource(b, a);
			setSource(c, b);
			strictEqual(getRoot(c), a);
			strictEqual(getRoot(b), a);
			strictEqual(getRoot(a), a);
		});

		await test("ignore early override", () => {
			const a = {};
			const b = {};
			const c = {};
			setSource(c, b);
			strictEqual(getRoot(c), b);
			setSource(b, a);
			strictEqual(getRoot(b), a);
			strictEqual(getRoot(c), b);
		});

		await test("ignore late override", () => {
			const target = {};
			const first = {};
			const second = {};
			setSource(target, first);
			setSource(target, second);
			strictEqual(getSource(target), second);
			strictEqual(getRoot(target), second);
		});
	});
});
