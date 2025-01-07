import { deepStrictEqual, strictEqual } from "node:assert";
import test, { suite } from "node:test";
import { $, capture, ClassValue, Context, e, ENV, ExpressionResult, NODE, StyleMap, uncapture } from "rvx";
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
				const a = new ENV.current.CustomEvent("click");
				elem.dispatchEvent(a);
				assertEvents(events, [a]);
				const b = new ENV.current.CustomEvent("custom-event");
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

						const elem = uncapture(() => {
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
					assertClass(elem, ["foo", "b", "c"]);
					d.value = true;
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
					assertClass(elem, ["a"]);
					assertEvents(events, [["setAttribute", "class", "a"]]);

					signal.value = ["b", "c"];
					assertClass(elem, ["b", "c"]);
					assertEvents(events, [["remove", "a"], ["add", "b", "c"]]);

					signal.value = { "d": true, "e": false };
					assertClass(elem, ["d"]);
					assertEvents(events, [["remove", "b", "c"], ["add", "d"]]);

					signal.value = ["f", "d"];
					assertClass(elem, ["d", "f"]);
					// This is not optimal, but a rare edge case:
					assertEvents(events, [["remove", "d"], ["add", "d", "f"]]);

					signal.value = "f";
					assertClass(elem, ["f"]);
					// This is not optimal, but a rare edge case:
					assertEvents(events, [["remove", "d", "f"], ["add", "f"]]);

					signal.value = null;
					assertClass(elem, []);
					assertEvents(events, [["remove", "f"]]);
				});

				await test("external mutation behavior", () => {
					const events: unknown[] = [];
					const signal = $<ExpressionResult<ClassValue>>(undefined);
					const elem = createElem(signal, events);
					assertEvents(events, []);
					elem.classList.add("a");
					assertClass(elem, ["a"]);
					assertEvents(events, [["add", "a"]]);

					signal.value = "b";
					assertClass(elem, ["a", "b"]);
					assertEvents(events, [["add", "b"]]);

					elem.classList.remove("b");
					assertClass(elem, ["a"]);
					assertEvents(events, [["remove", "b"]]);

					signal.notify();
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
					assertClass(elem, ["a", "b", "c"]);
					assertEvents(events, [["add", "c"]]);

					signal.value = ["a", "d"];
					assertClass(elem, ["a", "b", "d"]);
					assertEvents(events, [["remove", "c"], ["add", "d"]]);

					const nestedA = $(false);
					const nestedC = $(true);
					signal.value = { "a": nestedA, "c": nestedC };
					assertClass(elem, ["a", "b", "c"]);
					assertEvents(events, [["remove", "d"], ["add", "c"]]);

					nestedA.value = true;
					assertClass(elem, ["a", "b", "c"]);
					assertEvents(events, []);

					nestedC.value = false;
					assertClass(elem, ["a", "b"]);
					assertEvents(events, [["remove", "c"]]);

					nestedA.value = false;
					assertClass(elem, ["a", "b"]);
					assertEvents(events, []);

					nestedC.value = true;
					assertClass(elem, ["a", "b", "c"]);
					assertEvents(events, [["add", "c"]]);

					nestedC.notify();
					assertClass(elem, ["a", "b", "c"]);
					// This is not optimal, but a rare edge case:
					// (This also supports restoration of externally removed classes)
					assertEvents(events, [["remove", "c"], ["add", "c"]]);

					signal.value = "e";
					assertClass(elem, ["a", "b", "e"]);
					assertEvents(events, [["remove", "c"], ["add", "e"]]);

					signal.value = "c";
					assertClass(elem, ["a", "b", "c"]);
					assertEvents(events, [["remove", "e"], ["add", "c"]]);

					nestedC.value = false;
					assertClass(elem, ["a", "b", "c"]);
					assertEvents(events, []);

					signal.value = [["a", "b", "c"], ["b", "d"]];
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
					assertClass(elem, ["a", "b", "e", "d"]);
					dispose();
					assertClass(elem, ["a", "b", "e", "d"]);
					signalA.value = ["f"];
					signalB.value = false;
					assertClass(elem, ["a", "b", "e", "d"]);
				});
			});

			await test("style attribute", () => {
				const a = $<StyleMap>({ color: "blue" });
				const b = $("red");
				const c = $<StyleMap>({ width: "42px" });
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
				strictEqual(elem.style.getPropertyValue("color"), "red");
				strictEqual(elem.style.getPropertyValue("width"), "42px");
				c.value = { width: "7px" };
				strictEqual(elem.style.getPropertyValue("color"), "red");
				strictEqual(elem.style.getPropertyValue("width"), "7px");
				a.value = { color: "blue", width: "13px" };
				strictEqual(elem.style.getPropertyValue("color"), "red");
				strictEqual(elem.style.getPropertyValue("width"), "7px");
				b.value = "green";
				strictEqual(elem.style.getPropertyValue("color"), "green");
				strictEqual(elem.style.getPropertyValue("width"), "7px");
				c.value = {};
				strictEqual(elem.style.getPropertyValue("color"), "green");
				strictEqual(elem.style.getPropertyValue("width"), "7px");
				a.value = { color: "gray" };
				strictEqual(elem.style.getPropertyValue("color"), "green");
				strictEqual(elem.style.getPropertyValue("width"), "7px");
				b.value = "silver";
				strictEqual(elem.style.getPropertyValue("color"), "silver");
				strictEqual(elem.style.getPropertyValue("width"), "7px");
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
		const elem = uncapture(() => {
			return <div>{1}{2}</div> as HTMLElement;
		});
		deepStrictEqual(elem.textContent, "12");
	});

	await test("jsx spread operator", () => {
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
		const elem = uncapture(() => {
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

	await test("ref attribute", () => {
		const events: unknown[] = [];
		uncapture(() => <div
			attr:data-a={() => {
				events.push("a");
			}}
			ref={elem => {
				if (isRvxDom()) {
					strictEqual(elem instanceof ENV.current.Element, true);
				} else {
					strictEqual(elem instanceof ENV.current.HTMLDivElement, true);
				}
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
});
