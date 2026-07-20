import { strictEqual } from "node:assert";
import test, { suite } from "node:test";
import { ENV, map, teardown } from "rvx";
import { RvxElement } from "rvx/element";
import { assertEvents } from "../common.js";

await suite("element/element", async () => {
	let shadow = false;

	class TestElement extends RvxElement {
		static observedAttributes = ["name"];

		events: unknown[] = [];
		#name = this.reflect("name");

		constructor() {
			super();
			if (shadow) {
				this.attachShadow({ mode: "open" });
			}
		}

		render() {
			this.events.push("render");
			teardown(() => {
				this.events.push("teardown");
			});
			return <>Hello {map(this.#name, v => v ?? "World")}!</>;
		}
	}

	ENV.current.customElements.define("test-element", TestElement);

	await test("element parent", () => {
		shadow = false;

		const elem = <test-element /> as TestElement;
		strictEqual(elem instanceof TestElement, true);
		assertEvents(elem.events, []);

		elem.start();
		assertEvents(elem.events, ["render"]);
		strictEqual(elem.innerHTML, "Hello World!");

		elem.setAttribute("name", "Test");
		strictEqual(elem.innerHTML, "Hello Test!");

		elem.removeAttribute("name");
		strictEqual(elem.innerHTML, "Hello World!");

		assertEvents(elem.events, []);
		elem.dispose();
		assertEvents(elem.events, ["teardown"]);
		strictEqual(elem.innerHTML, "Hello World!");

		elem.setAttribute("name", "Test2");
		elem.start();
		assertEvents(elem.events, ["render"]);
		strictEqual(elem.innerHTML, "Hello Test2!");
	});

	await test("shadow root", () => {
		shadow = true;

		const elem = <test-element /> as TestElement;
		strictEqual(elem instanceof TestElement, true);
		assertEvents(elem.events, []);

		elem.start();
		assertEvents(elem.events, ["render"]);
		strictEqual(elem.shadowRoot!.innerHTML, "Hello World!");

		elem.setAttribute("name", "Test");
		strictEqual(elem.shadowRoot!.innerHTML, "Hello Test!");

		elem.removeAttribute("name");
		strictEqual(elem.shadowRoot!.innerHTML, "Hello World!");

		assertEvents(elem.events, []);
		elem.dispose();
		assertEvents(elem.events, ["teardown"]);
		strictEqual(elem.shadowRoot!.innerHTML, "Hello World!");

		elem.setAttribute("name", "Test2");
		elem.start();
		assertEvents(elem.events, ["render"]);
		strictEqual(elem.shadowRoot!.innerHTML, "Hello Test2!");
	});

	await test("automatic lifecycle", () => {
		shadow = false;

		const elem = <test-element /> as TestElement;
		strictEqual(elem instanceof TestElement, true);
		assertEvents(elem.events, []);

		ENV.current.document.body.appendChild(elem);
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
	});
});
