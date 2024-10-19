import { strictEqual } from "node:assert";
import test, { suite } from "node:test";

import { map, nocapture, teardown } from "rvx";
import { RvxElement, RvxElementOptions } from "rvx/element";

import { assertEvents } from "../common.js";

await suite("element/element", async () => {
	let options: RvxElementOptions | undefined;

	class TestElement extends RvxElement {
		static observedAttributes = ["name"];

		events: unknown[] = [];
		#name = this.reflect("name");

		constructor() {
			super(options);
		}

		render() {
			this.events.push("render");
			teardown(() => {
				this.events.push("teardown");
			});
			return <>Hello {map(this.#name, v => v ?? "World")}!</>;
		}
	}

	customElements.define("test-element", TestElement);

	await test("default lifecycle & attributes", async () => {
		options = undefined;
		const elem = nocapture(() => <test-element /> as TestElement);
		strictEqual(elem instanceof TestElement, true);
		assertEvents(elem.events, []);
		for (let i = 0; i < 3; i++) {
			document.body.appendChild(elem);
			assertEvents(elem.events, ["render"]);
			strictEqual(elem.shadowRoot!.innerHTML, "Hello World!");

			elem.setAttribute("name", "Test");
			strictEqual(elem.shadowRoot!.innerHTML, "Hello Test!");

			elem.removeAttribute("name");
			strictEqual(elem.shadowRoot!.innerHTML, "Hello World!");

			assertEvents(elem.events, []);
			elem.remove();
			assertEvents(elem.events, ["teardown"]);
			strictEqual(elem.shadowRoot!.innerHTML, "Hello World!");
		}
	});

	await test("manual lifecycle & attributes", async () => {
		options = {
			start: "manual",
			dispose: "manual",
		};
		const elem = nocapture(() => <test-element /> as TestElement);
		strictEqual(elem instanceof TestElement, true);
		assertEvents(elem.events, []);

		for (let i = 0; i < 3; i++) {
			elem.start();
			assertEvents(elem.events, ["render"]);
			strictEqual(elem.shadowRoot!.innerHTML, "Hello World!");

			document.body.appendChild(elem);
			strictEqual(elem.shadowRoot!.innerHTML, "Hello World!");

			elem.setAttribute("name", "Test");
			strictEqual(elem.shadowRoot!.innerHTML, "Hello Test!");

			elem.removeAttribute("name");
			strictEqual(elem.shadowRoot!.innerHTML, "Hello World!");

			elem.remove();
			assertEvents(elem.events, []);

			elem.dispose();
			assertEvents(elem.events, ["teardown"]);
			strictEqual(elem.shadowRoot!.innerHTML, "Hello World!");
		}
	});

	await test("no shadow root", async () => {
		options = {
			shadow: false,
		};
		const elem = nocapture(() => <test-element /> as TestElement);
		strictEqual(elem instanceof TestElement, true);
		assertEvents(elem.events, []);
		strictEqual(elem.shadowRoot, null);
		for (let i = 0; i < 3; i++) {
			document.body.appendChild(elem);
			assertEvents(elem.events, ["render"]);
			strictEqual(elem.innerHTML, "Hello World!");

			elem.setAttribute("name", "Test");
			strictEqual(elem.innerHTML, "Hello Test!");

			elem.removeAttribute("name");
			strictEqual(elem.innerHTML, "Hello World!");

			assertEvents(elem.events, []);
			elem.remove();
			assertEvents(elem.events, ["teardown"]);
			strictEqual(elem.innerHTML, "Hello World!");
		}
	});
});
