import { deepStrictEqual, strictEqual } from "node:assert";
import test, { suite } from "node:test";
import { $, $v, capture, ClassValue, Context, dispatch, e, ENV, ExpressionResult, leak, NODE, StyleMap } from "rvx";
import { isRvxDom } from "rvx/dom";
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

			await test("events", { skip: isRvxDom() }, () => {
				const events: unknown[] = [];

				const ctx = new Context<string | undefined>();
				const elem = ctx.provide("bar", () => {
					return jsx
						? <div
							on:click={event => {
								strictEqual(ctx.current, "bar");
								// Don't remove, only for testing the type:
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
								const _: MouseEvent = event;
								events.push(event);
							})
							.on("custom-event", event => {
								strictEqual(ctx.current, "bar");
								events.push(event);
							}, { capture: true })
							.elem;
				});
				const a = new ENV.current.CustomEvent("click");
				elem.dispatchEvent(a);
				assertEvents(events, [a]);
				const b = new ENV.current.CustomEvent("custom-event");
				elem.dispatchEvent(b);
				assertEvents(events, [b]);
			});

			await test("attributes", () => {
				const elem = leak(() => {
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
				strictEqual(elem.getAttribute("data-bar"), "baz");
				strictEqual(elem.getAttribute("data-baz"), "boo");
				// TODO: Support dataset:
				if (!isRvxDom()) {
					strictEqual(elem.dataset.bar, "baz");
					strictEqual(elem.dataset.baz, "boo");
				}
				strictEqual(elem.title, "example");
			});

			await test("removed attribute", () => {
				const signal = $<any>(false);
				const elem = leak(() => {
					return jsx
						? <div test-attr={signal} /> as HTMLElement
						: e("div").set("test-attr", signal).elem;
				});
				strictEqual(elem.getAttribute("test-attr"), null);

				signal.value = true;
				dispatch();
				strictEqual(elem.getAttribute("test-attr"), "");

				signal.value = 42;
				dispatch();
				strictEqual(elem.getAttribute("test-attr"), "42");

				signal.value = null;
				dispatch();
				strictEqual(elem.getAttribute("test-attr"), null);

				signal.value = "abc";
				dispatch();
				strictEqual(elem.getAttribute("test-attr"), "abc");

				signal.value = undefined;
				dispatch();
				strictEqual(elem.getAttribute("test-attr"), null);
			});

			await suite("class attribute", async () => {
				function assertClass(target: HTMLElement, classList: string[]) {
					deepStrictEqual(Array.from(target.classList).sort(), classList.sort());
				}

				function createElem(value: ClassValue, events?: unknown[]) {
					const env = ENV.current;
					const createElementOriginal = env.document.createElementNS;
					try {
						if (events) {
							env.document.createElementNS = ((ns: string, name: string) => {
								const elem = createElementOriginal.call(env.document, ns, name);
								const setAttributeOriginal = elem.setAttribute;
								elem.setAttribute = (name, value) => {
									events.push(["setAttribute", name, value]);
									setAttributeOriginal.call(elem, name, value);
								};
								const classList = elem.classList;
								const addOriginal = classList.add;
								const removeOriginal = classList.remove;
								classList.add = (...tokens) => {
									events.push(["add", ...tokens.toSorted()]);
									addOriginal.call(classList, ...tokens);
								};
								classList.remove = (...tokens) => {
									events.push(["remove", ...tokens.toSorted()]);
									removeOriginal.call(classList, ...tokens);
								};
								return elem;
							}) as typeof document.createElementNS;
						}

						const elem = leak(() => {
							return jsx
								? <div class={value} /> as HTMLElement
								: e("div").class(value).elem;
						});
						return elem;
					} finally {
						env.document.createElementNS = createElementOriginal;
					}
				}

				function assertInitialValue(value: ClassValue, classList: string[]) {
					const events: unknown[] = [];
					const elem = createElem(value, events);
					assertClass(elem, classList);
					assertEvents(events, [["setAttribute", "class", classList.join(" ")]]);
				}

				await test("normal usage", () => {
					const a = $("a");
					const d = $(false);
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
					dispatch();
					assertClass(elem, ["foo", "b", "c"]);
					d.value = true;
					dispatch();
					assertClass(elem, ["foo", "b", "c", "d"]);
				});

				await test("initial values", () => {
					assertInitialValue("test", ["test"]);
					assertInitialValue(["a", "b"], ["a", "b"]);
					assertInitialValue([["a", "b"]], ["a", "b"]);
					assertInitialValue([["a"], "b"], ["a", "b"]);
					assertInitialValue([["a"], { b: true }], ["a", "b"]);
					assertInitialValue([["a"], [{ b: true }]], ["a", "b"]);
					assertInitialValue([["a", "b"], { b: true }], ["a", "b"]);
					assertInitialValue([["a", () => "b"]], ["a", "b"]);
					assertInitialValue([["a", () => "b"], () => ({ c: () => true })], ["a", "b", "c"]);
				});

				await test("top level updates", () => {
					const events: unknown[] = [];
					const signal = $<ExpressionResult<ClassValue>>(undefined);
					const elem = createElem(signal, events);
					assertClass(elem, []);
					assertEvents(events, []);

					signal.value = "a";
					assertEvents(events, []);
					dispatch();
					assertClass(elem, ["a"]);
					assertEvents(events, [["setAttribute", "class", "a"]]);

					signal.value = ["b", "c"];
					assertEvents(events, []);
					dispatch();
					assertClass(elem, ["b", "c"]);
					assertEvents(events, [["remove", "a"], ["add", "b", "c"]]);

					signal.value = { "d": true, "e": false };
					assertEvents(events, []);
					dispatch();
					assertClass(elem, ["d"]);
					assertEvents(events, [["remove", "b", "c"], ["add", "d"]]);

					signal.value = ["f", "d"];
					assertEvents(events, []);
					dispatch();
					assertClass(elem, ["d", "f"]);
					// This is not optimal, but a rare edge case:
					assertEvents(events, [["remove", "d"], ["add", "d", "f"]]);

					signal.value = "f";
					assertEvents(events, []);
					dispatch();
					assertClass(elem, ["f"]);
					// This is not optimal, but a rare edge case:
					assertEvents(events, [["remove", "d", "f"], ["add", "f"]]);

					signal.value = null;
					assertEvents(events, []);
					dispatch();
					assertClass(elem, []);
					assertEvents(events, [["remove", "f"]]);
				});

				await test("external mutation behavior", () => {
					const events: unknown[] = [];
					const signal = $<ExpressionResult<ClassValue>>(undefined);
					const versioned = $v();
					const elem = createElem(() => {
						versioned.access();
						return signal.value;
					}, events);
					assertEvents(events, []);
					elem.classList.add("a");
					assertClass(elem, ["a"]);
					assertEvents(events, [["add", "a"]]);

					signal.value = "b";
					assertEvents(events, []);
					dispatch();
					assertClass(elem, ["a", "b"]);
					assertEvents(events, [["add", "b"]]);

					elem.classList.remove("b");
					assertClass(elem, ["a"]);
					assertEvents(events, [["remove", "b"]]);

					versioned.notify();
					assertEvents(events, []);
					dispatch();
					assertClass(elem, ["a", "b"]);
					// This is not optimal, but a rare edge case:
					assertEvents(events, [["remove", "b"], ["add", "b"]]);
				});

				await test("nested updates", () => {
					const events: unknown[] = [];
					const signal = $<ExpressionResult<ClassValue>>(undefined);
					const elem = createElem(["a", signal, "b"], events);
					assertClass(elem, ["a", "b"]);
					assertEvents(events, [["setAttribute", "class", "a b"]]);

					signal.value = "c";
					assertEvents(events, []);
					dispatch();
					assertClass(elem, ["a", "b", "c"]);
					assertEvents(events, [["add", "c"]]);

					signal.value = ["a", "d"];
					assertEvents(events, []);
					dispatch();
					assertClass(elem, ["a", "b", "d"]);
					assertEvents(events, [["remove", "c"], ["add", "d"]]);

					const nestedA = $(false);
					const nestedC = $(true);
					const versionedC = $v();
					signal.value = { "a": nestedA, "c": () => {
						versionedC.access();
						return nestedC.value;
					} };
					assertEvents(events, []);
					dispatch();
					assertClass(elem, ["a", "b", "c"]);
					assertEvents(events, [["remove", "d"], ["add", "c"]]);

					nestedA.value = true;
					assertEvents(events, []);
					dispatch();
					assertClass(elem, ["a", "b", "c"]);
					assertEvents(events, []);

					nestedC.value = false;
					assertEvents(events, []);
					dispatch();
					assertClass(elem, ["a", "b"]);
					assertEvents(events, [["remove", "c"]]);

					nestedA.value = false;
					assertEvents(events, []);
					dispatch();
					assertClass(elem, ["a", "b"]);
					assertEvents(events, []);

					nestedC.value = true;
					assertEvents(events, []);
					dispatch();
					assertClass(elem, ["a", "b", "c"]);
					assertEvents(events, [["add", "c"]]);

					versionedC.notify();
					assertEvents(events, []);
					dispatch();
					assertClass(elem, ["a", "b", "c"]);
					assertEvents(events, [["remove", "c"], ["add", "c"]]);

					signal.value = "e";
					assertEvents(events, []);
					dispatch();
					assertClass(elem, ["a", "b", "e"]);
					assertEvents(events, [["remove", "c"], ["add", "e"]]);

					signal.value = "c";
					assertEvents(events, []);
					dispatch();
					assertClass(elem, ["a", "b", "c"]);
					assertEvents(events, [["remove", "e"], ["add", "c"]]);

					nestedC.value = false;
					assertEvents(events, []);
					dispatch();
					assertClass(elem, ["a", "b", "c"]);
					assertEvents(events, []);

					signal.value = [["a", "b", "c"], ["b", "d"]];
					assertEvents(events, []);
					dispatch();
					assertClass(elem, ["a", "b", "c", "d"]);
					// This is not optimal, but a rare edge case:
					assertEvents(events, [["remove", "c"], ["add", "c", "d"]]);
				});

				await test("teardown", () => {
					let elem!: HTMLElement;
					const signalA = $(["c"]);
					const signalB = $(false);
					const value: ClassValue = ["a", { b: true }, signalA, () => ({ d: signalB })];
					const dispose = capture(() => {
						elem = jsx
							? <div class={value} /> as HTMLElement
							: e("div").class(value).elem;
					});
					assertClass(elem, ["a", "b", "c"]);
					signalA.value = ["e"];
					signalB.value = true;
					dispatch();
					assertClass(elem, ["a", "b", "e", "d"]);
					dispose();
					assertClass(elem, ["a", "b", "e", "d"]);
					signalA.value = ["f"];
					signalB.value = false;
					assertClass(elem, ["a", "b", "e", "d"]);
					dispatch();
					assertClass(elem, ["a", "b", "e", "d"]);
				});
			});

			await test("style attribute", () => {
				const a = $<StyleMap>({ color: "blue" });
				const b = $<unknown>("red");
				const c = $<StyleMap>({ width: "42px" });
				const elem = leak(() => {
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
				strictEqual(elem.style.getPropertyValue("color"), "red");
				strictEqual(elem.style.getPropertyValue("width"), "42px");
				c.value = { width: "7px" };
				dispatch();
				strictEqual(elem.style.getPropertyValue("color"), "red");
				strictEqual(elem.style.getPropertyValue("width"), "7px");
				a.value = { color: "blue", width: "13px" };
				dispatch();
				strictEqual(elem.style.getPropertyValue("color"), "red");
				strictEqual(elem.style.getPropertyValue("width"), "7px");
				b.value = "green";
				dispatch();
				strictEqual(elem.style.getPropertyValue("color"), "green");
				strictEqual(elem.style.getPropertyValue("width"), "7px");
				c.value = {};
				dispatch();
				strictEqual(elem.style.getPropertyValue("color"), "green");
				strictEqual(elem.style.getPropertyValue("width"), "7px");
				a.value = { color: "gray" };
				dispatch();
				strictEqual(elem.style.getPropertyValue("color"), "green");
				strictEqual(elem.style.getPropertyValue("width"), "7px");
				b.value = "silver";
				dispatch();
				strictEqual(elem.style.getPropertyValue("color"), "silver");
				strictEqual(elem.style.getPropertyValue("width"), "7px");
				a.value = { "--foo": 0 };
				dispatch();
				strictEqual(elem.style.getPropertyValue("--foo"), "0");
				a.value = { "--foo": null };
				dispatch();
				strictEqual(elem.style.getPropertyValue("--foo"), "");
				a.value = { "--foo": undefined };
				dispatch();
				strictEqual(elem.style.getPropertyValue("--foo"), "undefined");
				a.value = { "--foo": "null" };
				dispatch();
				strictEqual(elem.style.getPropertyValue("--foo"), "null");
				a.value = { "--foo": 42n };
				dispatch();
				strictEqual(elem.style.getPropertyValue("--foo"), "42");
			});

			await test("api types", () => {
				const elem = jsx
					? <div /> as HTMLElement
					: e("div").elem;
				if (isRvxDom()) {
					strictEqual(elem instanceof ENV.current.Element, true);
				} else {
					strictEqual(elem instanceof ENV.current.HTMLDivElement, true);
				}
				elem.classList.add("foo");
			});

			await test("node target", () => {
				const elem = jsx
					? <div>
						{{ [NODE]: ENV.current.document.createTextNode("test") }}
					</div> as HTMLElement
					: e("div").append(
						{ [NODE]: ENV.current.document.createTextNode("test") }
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

	await test("jsx complex content", () => {
		const elem = leak(() => {
			return <div>{1}{2}</div> as HTMLElement;
		});
		deepStrictEqual(elem.textContent, "12");
	});

	await test("jsx spread operator", () => {
		const elem = leak(() => {
			return <div foo="a" {...{ baz: "c" }} bar="b" /> as HTMLElement;
		});
		strictEqual(elem.getAttribute("foo"), "a");
		strictEqual(elem.getAttribute("bar"), "b");
		strictEqual(elem.getAttribute("baz"), "c");
	});

	function TestComponent(props: { foo?: string, bar?: number, children?: unknown }) {
		return props;
	}

	await test("jsx component", () => {
		const props = <TestComponent foo="a" bar={1} /> as Parameters<typeof TestComponent>[0];
		deepStrictEqual(props, { foo: "a", bar: 1 });
	});

	await test("jsx component without props", () => {
		const props = <TestComponent /> as Parameters<typeof TestComponent>[0];
		deepStrictEqual(props, {});
	});

	await test("jsx implicit component children", () => {
		const props = <TestComponent foo="a" bar={1}>{2}</TestComponent> as Parameters<typeof TestComponent>[0];
		deepStrictEqual(props, { foo: "a", bar: 1, children: 2 });
	});

	await test("jsx implicit component complex children", () => {
		const props = <TestComponent foo="a" bar={1}>{2}{3}</TestComponent> as Parameters<typeof TestComponent>[0];
		deepStrictEqual(props, { foo: "a", bar: 1, children: [2, 3] });
	});

	await test("jsx explicit component children", () => {
		const props = <TestComponent foo="a" bar={1} children={2} /> as Parameters<typeof TestComponent>[0];
		deepStrictEqual(props, { foo: "a", bar: 1, children: 2 });
	});

	await test("jsx element key property", () => {
		const elem = leak(() => {
			return <div key="foo" bar="baz" /> as HTMLElement;
		});
		strictEqual(elem.getAttribute("key"), "foo");
		strictEqual(elem.getAttribute("bar"), "baz");
	});

	await test("jsx component key property", () => {
		function Component(props: { key: number, bar: string }) {
			return props;
		}
		const props = <Component key={42} bar="baz" />;
		deepStrictEqual(props, { key: 42, bar: "baz" });
	});
});
