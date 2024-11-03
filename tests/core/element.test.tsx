import { deepStrictEqual, strictEqual } from "node:assert";
import test, { suite } from "node:test";

import { capture, ClassValue, Context, createElement, ExpressionResult, NODE, sig, Signal, StyleMap, uncapture } from "rvx";
import { e } from "rvx/builder";

import { assertEvents } from "../common.js";

await suite("element", async () => {
	for (const jsx of [false, true]) {
		await suite(jsx ? "jsx" : "builder", async () => {
			await test("element content", () => {
				strictEqual((
					jsx
						? <div /> as HTMLElement
						: e("div").elem
				).outerHTML, "<div></div>");

				strictEqual((
					jsx
						? <div></div> as HTMLElement
						: e("div").elem
				).outerHTML, "<div></div>");

				strictEqual((
					jsx
						? <div>test</div> as HTMLElement
						: e("div").append("test").elem
				).outerHTML, "<div>test</div>");

				strictEqual((
					jsx
						? <div>1{2}</div> as HTMLElement
						: e("div").append(1, 2).elem
				).outerHTML, "<div>12</div>");
			});

			await test("events", () => {
				const events: unknown[] = [];

				const ctx = new Context<string>();
				const elem = ctx.inject("bar", () => {
					return jsx
						? <div
							on:click={event => {
								strictEqual(ctx.current, "bar");
								// Don't remove, only for testing the type:
								// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
								const _: MouseEvent = event;
								events.push(event);
							}}
							on:custom-event={[
								(event: CustomEvent) => {
									strictEqual(ctx.current, "bar");
									events.push(event);
								},
								{ capture: true },
							]}
						/> as HTMLElement
						: e("div")
							.on("click", event => {
								strictEqual(ctx.current, "bar");
								// Don't remove, only for testing the type:
								// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
								const _: MouseEvent = event;
								events.push(event);
							})
							.on("custom-event", event => {
								strictEqual(ctx.current, "bar");
								events.push(event);
							}, { capture: true })
							.elem;
				});
				const a = new MouseEvent("click");
				elem.dispatchEvent(a);
				assertEvents(events, [a]);
				const b = new CustomEvent("custom-event");
				elem.dispatchEvent(b);
				assertEvents(events, [b]);
			});

			await test("attributes", () => {
				const elem = uncapture(() => {
					return jsx
						? <div
							foo="bar"
							class={["a", "b"]}
							data-bar="baz"
							attr:data-baz="boo"
							prop:title="example"
						/> as HTMLElement
						: e("div")
							.set("foo", "bar")
							.class(["a", "b"])
							.set("data-bar", "baz")
							.set("data-baz", "boo")
							.prop("title", "example")
							.elem;
				});
				strictEqual(elem.getAttribute("foo"), "bar");
				deepStrictEqual(Array.from(elem.classList), ["a", "b"]);
				strictEqual(elem.dataset.bar, "baz");
				strictEqual(elem.dataset.baz, "boo");
				strictEqual(elem.title, "example");
			});

			await test("removed attribute", () => {
				const signal = sig<any>(false);
				const elem = uncapture(() => {
					return jsx
						? <div test-attr={signal} /> as HTMLElement
						: e("div").set("test-attr", signal).elem;
				});
				strictEqual(elem.getAttribute("test-attr"), null);

				signal.value = true;
				strictEqual(elem.getAttribute("test-attr"), "");

				signal.value = 42;
				strictEqual(elem.getAttribute("test-attr"), "42");

				signal.value = null;
				strictEqual(elem.getAttribute("test-attr"), null);

				signal.value = "abc";
				strictEqual(elem.getAttribute("test-attr"), "abc");

				signal.value = undefined;
				strictEqual(elem.getAttribute("test-attr"), null);
			});

			await suite("class attribute", async () => {
				function assertClass(target: HTMLElement, classList: string[]) {
					deepStrictEqual(Array.from(target.classList).sort(), classList.sort());
				}

				function createElem(value: ClassValue) {
					const elem = uncapture(() => {
						return jsx
							? <div class={value} /> as HTMLElement
							: e("div").class(value).elem;
					});
					return elem;
				}

				await test("normal usage", () => {
					const a = sig("a");
					const d = sig(false);
					const elem = createElem(() => [
						a.value,
						"b",
						undefined,
						null,
						false,
						{
							c: true,
							d,
						},
					]);
					assertClass(elem, ["a", "b", "c"]);
					a.value = "foo";
					assertClass(elem, ["foo", "b", "c"]);
					d.value = true;
					assertClass(elem, ["foo", "b", "c", "d"]);
				});

				await test("initial values", () => {
					assertClass(createElem("test"), ["test"]);
					assertClass(createElem(["a", "b"]), ["a", "b"]);
					assertClass(createElem([["a", "b"]]), ["a", "b"]);
					assertClass(createElem([["a"], "b"]), ["a", "b"]);
					assertClass(createElem([["a"], { b: true }]), ["a", "b"]);
					assertClass(createElem([["a"], [{ b: true }]]), ["a", "b"]);
					assertClass(createElem([["a", "b"], { b: true }]), ["a", "b"]);
					assertClass(createElem([["a", () => "b"]]), ["a", "b"]);
					assertClass(createElem([["a", () => "b"], () => ({ c: () => true })]), ["a", "b", "c"]);
				});

				await test("top level updates", () => {
					const signal = sig<ExpressionResult<ClassValue>>(undefined);
					const elem = createElem(signal);
					assertClass(elem, []);

					signal.value = "a";
					assertClass(elem, ["a"]);

					signal.value = ["b", "c"];
					assertClass(elem, ["b", "c"]);

					signal.value = { "d": true, "e": false };
					assertClass(elem, ["d"]);

					signal.value = ["f", "d"];
					assertClass(elem, ["d", "f"]);

					signal.value = "f";
					assertClass(elem, ["f"]);

					signal.value = null;
					assertClass(elem, []);
				});

				await test("nested updates", () => {
					const signal = sig<ExpressionResult<ClassValue>>(undefined);
					const elem = createElem(["a", signal, "b"]);
					assertClass(elem, ["a", "b"]);

					signal.value = "c";
					assertClass(elem, ["a", "b", "c"]);

					signal.value = ["a", "d"];
					assertClass(elem, ["a", "b", "d"]);

					const nestedA = sig(false);
					const nestedC = sig(true);
					signal.value = { "a": nestedA, "c": nestedC };
					assertClass(elem, ["a", "b", "c"]);

					nestedA.value = true;
					assertClass(elem, ["a", "b", "c"]);

					nestedC.value = false;
					assertClass(elem, ["a", "b"]);

					nestedA.value = false;
					assertClass(elem, ["a", "b"]);

					nestedC.value = true;
					assertClass(elem, ["a", "b", "c"]);

					nestedC.notify();
					assertClass(elem, ["a", "b", "c"]);

					signal.value = "e";
					assertClass(elem, ["a", "b", "e"]);

					signal.value = "c";
					assertClass(elem, ["a", "b", "c"]);
					nestedC.value = false;
					assertClass(elem, ["a", "b", "c"]);

					signal.value = [["a", "b", "c"], ["b", "d"]];
					assertClass(elem, ["a", "b", "c", "d"]);
				});

				await test("teardown", () => {
					let elem!: HTMLElement;
					const signalA = sig(["c"]);
					const signalB = sig(false);
					const value: ClassValue = ["a", { b: true }, signalA, () => ({ d: signalB })];
					const dispose = capture(() => {
						elem = jsx
							? <div class={value} /> as HTMLElement
							: e("div").class(value).elem;
					});
					assertClass(elem, ["a", "b", "c"]);
					signalA.value = ["e"];
					signalB.value = true;
					assertClass(elem, ["a", "b", "e", "d"]);
					dispose();
					assertClass(elem, ["a", "b", "e", "d"]);
					signalA.value = ["f"];
					signalB.value = false;
					assertClass(elem, ["a", "b", "e", "d"]);
				});
			});

			await test("style attribute", () => {
				const a = sig<StyleMap>({ color: "blue" });
				const b = sig("red");
				const c = sig<StyleMap>({ width: "42px" });
				const elem = uncapture(() => {
					return jsx
						? <div style={[
							a,
							() => [
								[
									{ color: b },
								],
								c.value,
							],
						]} /> as HTMLElement
						: e("div")
							.style([
								a,
								() => [
									[
										{ color: b },
									],
									c.value,
								],
							])
							.elem;
				});
				strictEqual(elem.style.color, "red");
				strictEqual(elem.style.width, "42px");
				c.value = { width: "7px" };
				strictEqual(elem.style.color, "red");
				strictEqual(elem.style.width, "7px");
				a.value = { color: "blue", width: "13px" };
				strictEqual(elem.style.color, "red");
				strictEqual(elem.style.width, "7px");
				b.value = "green";
				strictEqual(elem.style.color, "green");
				strictEqual(elem.style.width, "7px");
				c.value = {};
				strictEqual(elem.style.color, "green");
				strictEqual(elem.style.width, "7px");
				a.value = { color: "gray" };
				strictEqual(elem.style.color, "green");
				strictEqual(elem.style.width, "7px");
				b.value = "silver";
				strictEqual(elem.style.color, "silver");
				strictEqual(elem.style.width, "7px");
			});

			await test("api types", () => {
				const elem = jsx
					? <div /> as HTMLElement
					: e("div").elem;
				strictEqual(elem instanceof HTMLDivElement, true);
				elem.classList.add("foo");
				elem.click();
			});

			await test("node target", () => {
				const elem = jsx
					? <div>
						{{ [NODE]: document.createTextNode("test") }}
					</div> as HTMLElement
					: e("div").append(
						{ [NODE]: document.createTextNode("test") }
					).elem;
				strictEqual(elem.outerHTML, "<div>test</div>");
			});

			await test("nesting", () => {
				const elem = jsx
					? <div>
						<input type="text" />
						{null}
						<>
							foo
							{[[<span>bar{42}</span>]]}
						</>
					</div> as HTMLElement
					: e("div").append(
						e("input").set("type", "text"),
						null,
						[
							"foo",
							[[
								e("span").append("bar", 42),
							]],
						],
					).elem;

				strictEqual(elem.outerHTML, [
					`<div>`,
					`<input type="text">`,
					`foo`,
					`<span>bar42</span>`,
					`</div>`,
				].join(""));
			});

			await test("interop", () => {
				const elem = jsx
					? <div>
						{e("div")}
					</div> as HTMLDivElement
					: e("div").append(<div />).elem;
				strictEqual(elem.outerHTML, "<div><div></div></div>");
			});
		});
	}

	await test("jsx fragment", () => {
		strictEqual(<></>, undefined);
		strictEqual(<>test</>, "test");
		deepStrictEqual(<>{1}{2}</>, [1, 2]);
	});

	await test("ref attribute", () => {
		const events: unknown[] = [];
		uncapture(() => <div
			attr:data-a={() => {
				events.push("a");
			}}
			ref={elem => {
				strictEqual(elem instanceof HTMLDivElement, true);
				events.push("ref");
			}}
			attr:data-b={() => {
				events.push("b");
			}}
		>
			{() => {
				events.push("content");
			}}
		</div> as HTMLDivElement);
		assertEvents(events, ["a", "ref", "b", "content"]);
	});

	await test("ref native attr", () => {
		const elem = <div attr:ref="42" /> as HTMLDivElement;
		strictEqual(elem.getAttribute("ref"), "42");
	});

	await test("ref native prop", () => {
		const elem = <div prop:ref="42" /> as HTMLDivElement;
		strictEqual((elem as any).ref, "42");
	});

	await test("createElement", () => {
		strictEqual(createElement("div", {}, undefined).outerHTML, `<div></div>`);
		strictEqual(createElement("div", { title: "a" }, undefined).outerHTML, `<div title="a"></div>`);
		strictEqual(createElement("div", {}, "b").outerHTML, `<div>b</div>`);
		strictEqual(createElement("div", { title: "a" }, "b").outerHTML, `<div title="a">b</div>`);
	});
});
