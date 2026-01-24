import { deepStrictEqual, notStrictEqual, strictEqual, throws } from "node:assert";
import test, { suite } from "node:test";
import { $, Attach, capture, Component, ENV, For, Index, memo, mount, movable, Nest, render, Show, teardown, uncapture, View, watch, watchUpdates } from "rvx";
import { wrap } from "rvx/store";
import { assertViewState } from "rvx/test";
import { assertEvents, boundaryEvents, computeMapArrayDiffEvents, lifecycleEvent, TestView, testView, text, viewText, withMsg } from "../common.js";

await suite("view", async () => {
	await test("init incomplete", () => {
		throws(() => new View(() => {}), withMsg("G1"));
		throws(() => new View(setBoundary => {
			setBoundary(ENV.current.document.createTextNode("test"), undefined);
		}), withMsg("G1"));
		throws(() => new View(setBoundary => {
			setBoundary(undefined, ENV.current.document.createTextNode("test"));
		}), withMsg("G1"));
	});

	await test("init single node", () => {
		const view = new View((setBoundary, self) => {
			const node = <div>test</div> as HTMLElement;
			throws(() => assertViewState(self));
			setBoundary(node, node);
			assertViewState(self);
		});

		strictEqual(view.parent, undefined);
		strictEqual(view.first, view.last);
		strictEqual(text(view.first), "test");
	});

	await test("init different nodes", () => {
		const { view } = testView();
		strictEqual(view.parent instanceof ENV.current.DocumentFragment, true);
		strictEqual(text(view.first), "f");
		strictEqual(text(view.last), "l");
	});

	await test("boundary owner", () => {
		const events: unknown[] = [];
		const view = testView();

		const unset = capture(() => {
			view.view.setBoundaryOwner(boundaryEvents(events));
		});
		assertEvents(events, []);

		const a = view.nextFirst();
		strictEqual(view.view.first, a);
		assertEvents(events, ["f0l"]);

		const b = view.nextLast();
		strictEqual(view.view.last, b);
		assertEvents(events, ["f0l1"]);

		throws(() => view.view.setBoundaryOwner(() => {}), withMsg("G2"));
		unset();
		uncapture(() => view.view.setBoundaryOwner(() => {}));

		const c = view.nextFirst();
		strictEqual(view.view.first, c);
		const d = view.nextLast();
		strictEqual(view.view.last, d);
		assertEvents(events, []);
	});

	await suite("appendTo", async () => {
		await test("single node", () => {
			const view = render(<div>a</div>);
			const parent = <div>p</div> as HTMLElement;
			view.appendTo(parent);
			strictEqual(parent.textContent, "pa");
			strictEqual(view.parent, parent);
		});

		await test("multiple nodes", () => {
			const view = render([
				<div>a</div>,
				<div>b</div>,
				<div>c</div>
			]);
			notStrictEqual(view.first, view.last);
			const parent = <div>p</div> as HTMLElement;
			view.appendTo(parent);
			strictEqual(parent.textContent, "pabc");
			strictEqual(view.parent, parent);
		});
	});

	await suite("insertBefore", async () => {
		await test("single node", () => {
			const view = render(<div>c</div>);
			const parent = <div>{["a", "b"]}</div> as HTMLElement;
			view.insertBefore(parent, parent.lastChild!);
			strictEqual(parent.textContent, "acb");
			strictEqual(view.parent, parent);
		});

		await test("multiple nodes", () => {
			const view = render([
				<div>c</div>,
				<div>d</div>,
				<div>e</div>
			]);
			notStrictEqual(view.first, view.last);
			const parent = <div>{["a", "b"]}</div> as HTMLElement;
			view.insertBefore(parent, parent.lastChild!);
			strictEqual(parent.textContent, "acdeb");
			strictEqual(view.parent, parent);
		});
	});

	await suite("detach", async () => {
		await test("single node", () => {
			let node!: Node;
			let parent!: Node;
			const view = new View((setBoundary, self) => {
				node = <div>test</div> as HTMLElement;
				parent = <div>{node}</div> as HTMLElement;
				setBoundary(node, node);
				assertViewState(self);
			});
			strictEqual(node.parentNode, parent);
			view.detach();
			assertViewState(view);
			strictEqual(node.parentNode, null);
		});

		await test("detach multiple nodes", () => {
			const { view } = testView();
			const parent = view.parent;
			view.detach();
			assertViewState(view);
			strictEqual(view.first.parentNode instanceof ENV.current.DocumentFragment, true);
			strictEqual(view.first.parentNode, view.last.parentNode);
			notStrictEqual(view.first.parentNode, parent);
		});
	});

	await test("mount", async () => {
		const root = <div /> as HTMLElement;
		strictEqual(text(root), "");
		let view!: View;
		const signal = $(1);
		const dispose = capture(() => {
			view = mount(root, () => `test${signal.value}`);
			assertViewState(view);
		});
		strictEqual(text(root), "test1");
		signal.value = 2;
		assertViewState(view);
		strictEqual(text(root), "test2");
		dispose();
		strictEqual(text(root), "");
		strictEqual(viewText(view), "test2");
		signal.value = 3;
		assertViewState(view);
		strictEqual(viewText(view), "test2");
	});

	await suite("Nest", async () => {
		await test("lifecycle", () => {
			const events: unknown[] = [];
			const signal = $(0);

			let view!: View;
			const dispose = capture(() => {
				view = <Nest watch={signal}>
					{value => {
						if (value === 0) {
							return undefined;
						}
						events.push(`+${value}`);
						teardown(() => {
							events.push(`-${value}`);
						});
						return <div>{value}</div> as HTMLElement;
					}}
				</Nest> as View;
				assertViewState(view);
			});

			strictEqual(viewText(view), "");
			assertEvents(events, []);

			signal.value = 1;
			assertViewState(view);
			strictEqual(viewText(view), "1");
			assertEvents(events, ["+1"]);

			signal.value = 2;
			assertViewState(view);
			strictEqual(viewText(view), "2");
			assertEvents(events, ["-1", "+2"]);

			dispose();
			assertViewState(view);
			assertEvents(events, ["-2"]);
		});

		await test("boundary", () => {
			const events: unknown[] = [];

			const inner = $<TestView | undefined>(undefined);

			let view!: View;
			capture(() => {
				view = <Nest watch={inner}>
					{inner => inner?.view}
				</Nest> as View;
				assertViewState(view);
				view.setBoundaryOwner(boundaryEvents(events));
				assertViewState(view);
			});

			strictEqual(viewText(view), "");

			inner.value = testView("a");
			assertViewState(view);
			strictEqual(viewText(view), "afl");
			assertEvents(events, ["afl"]);

			inner.value.nextFirst();
			assertViewState(view);
			strictEqual(viewText(view), "af0l");
			assertEvents(events, ["af0l"]);

			inner.value.nextLast();
			assertViewState(view);
			strictEqual(viewText(view), "af0l1");
			assertEvents(events, ["af0l1"]);

			inner.value = testView("b");
			assertViewState(view);
			strictEqual(viewText(view), "bfl");
			assertEvents(events, ["bfl"]);

			inner.value = undefined;
			assertViewState(view);
			strictEqual(viewText(view), "");
			assertEvents(events, [""]);
		});

		await test("render side effects", () => {
			const events: unknown[] = [];
			const signal = $(0);
			let view!: View;
			uncapture(() => {
				view = <Nest watch={signal}>
					{value => {
						lifecycleEvent(events, `${value}`);
						if (value < 3) {
							signal.value++;
						}
						return value;
					}}
				</Nest> as View;
				assertViewState(view);
			});
			strictEqual(viewText(view), "3");
			assertEvents(events, ["s:0", "e:0", "s:1", "e:1", "s:2", "e:2", "s:3"]);
		});

		await suite("error handling", async () => {
			await test("expression, initialization", () => {
				const signal = $(42);
				throws(() => {
					capture(() => {
						<Nest watch={() => {
							signal.access();
							throw new Error("test");
						}}>
							{() => {
								throw new Error();
							}}
						</Nest> as View;
					});
				}, withMsg("test"));
				signal.value = 77;
			});

			await test("expression, signal update", () => {
				const signal = $(42);
				let view!: View;
				const dispose = capture(() => {
					view = <Nest watch={() => {
						const value = signal.value;
						if (value === 77) {
							throw new Error("test");
						}
						return value;
					}}>
						{value => value}
					</Nest> as View;
					assertViewState(view);
				});
				strictEqual(viewText(view), "42");

				throws(() => {
					signal.value = 77;
				}, withMsg("test"));
				assertViewState(view);
				strictEqual(viewText(view), "42");

				signal.value = 123;
				assertViewState(view);
				strictEqual(viewText(view), "123");

				dispose();
				signal.value = 11;
				assertViewState(view);
				strictEqual(viewText(view), "123");
			});

			await test("component, initialization", () => {
				const signal = $(42);
				throws(() => {
					capture(() => {
						<Nest watch={signal}>
							{() => {
								throw new Error("test");
							}}
						</Nest> as View;
					});
				}, withMsg("test"));
				signal.value = 77;
			});

			await test("component, signal update", () => {
				const signal = $(42);
				let view!: View;
				const dispose = capture(() => {
					view = <Nest watch={signal}>
						{value => {
							if (value === 77) {
								throw new Error("test");
							}
							return value;
						}}
					</Nest> as View;
					assertViewState(view);
				});
				strictEqual(viewText(view), "42");

				throws(() => {
					signal.value = 77;
				}, withMsg("test"));
				assertViewState(view);
				strictEqual(viewText(view), "42");

				signal.value = 123;
				assertViewState(view);
				strictEqual(viewText(view), "123");

				dispose();
				signal.value = 11;
				assertViewState(view);
				strictEqual(viewText(view), "123");
			});
		});

		await test("component memo", () => {
			const events: unknown[] = [];
			const signal = $(0);

			function A() {
				lifecycleEvent(events, "a");
				return <>a{signal}</>;
			}

			function B() {
				lifecycleEvent(events, "b");
				return <>b{signal}</>;
			}

			const view = uncapture(() => {
				return <Nest watch={memo<Component>(() => signal.value < 2 ? A : B)}>
					{comp => comp()}
				</Nest> as View;
			});

			assertViewState(view);
			assertEvents(events, ["s:a"]);
			strictEqual(viewText(view), "a0");

			signal.value = 1;
			assertViewState(view);
			assertEvents(events, []);
			strictEqual(viewText(view), "a1");

			signal.value = 2;
			assertViewState(view);
			assertEvents(events, ["e:a", "s:b"]);
			strictEqual(viewText(view), "b2");

			signal.value = 3;
			assertViewState(view);
			assertEvents(events, []);
			strictEqual(viewText(view), "b3");
		});

		await test("external state reset", () => {
			const events: unknown[] = [];
			const signal = $();
			const count = $(0);

			const view = uncapture(() => {
				return <Nest watch={signal}>
					{() => {
						const version = `v${count.value}`;
						lifecycleEvent(events, version);
						return <>{version}:{count}</>;
					}}
				</Nest> as View;
			});

			assertViewState(view);
			assertEvents(events, ["s:v0"]);
			strictEqual(viewText(view), "v0:0");

			count.value++;
			assertViewState(view);
			assertEvents(events, []);
			strictEqual(viewText(view), "v0:1");

			signal.notify();
			assertViewState(view);
			assertEvents(events, ["e:v0", "s:v1"]);
			strictEqual(viewText(view), "v1:1");

			count.value++;
			assertViewState(view);
			assertEvents(events, []);
			strictEqual(viewText(view), "v1:2");
		});

		await test("explicit component from signal", () => {
			const events: unknown[] = [];
			const comp = $<Component | undefined>(undefined);
			const view = uncapture(() => <Nest watch={comp}>{c => c?.()}</Nest> as View);

			assertViewState(view);
			assertEvents(events, []);
			strictEqual(viewText(view), "");

			comp.value = () => {
				lifecycleEvent(events, "a");
				return "a";
			};
			assertViewState(view);
			assertEvents(events, ["s:a"]);
			strictEqual(viewText(view), "a");

			comp.value = () => {
				lifecycleEvent(events, "b");
				return "b";
			};
			assertViewState(view);
			assertEvents(events, ["e:a", "s:b"]);
			strictEqual(viewText(view), "b");

			comp.notify();
			assertViewState(view);
			assertEvents(events, ["e:b", "s:b"]);
			strictEqual(viewText(view), "b");
		});

		await test("implicit component from signal", () => {
			const events: unknown[] = [];
			const comp = $<Component | undefined | null>(undefined);
			const view = uncapture(() => <Nest watch={comp} /> as View);

			assertViewState(view);
			assertEvents(events, []);
			strictEqual(viewText(view), "");

			comp.value = () => {
				lifecycleEvent(events, "a");
				return "a";
			};
			assertViewState(view);
			assertEvents(events, ["s:a"]);
			strictEqual(viewText(view), "a");

			comp.value = () => {
				lifecycleEvent(events, "b");
				return "b";
			};
			assertViewState(view);
			assertEvents(events, ["e:a", "s:b"]);
			strictEqual(viewText(view), "b");

			comp.notify();
			assertViewState(view);
			assertEvents(events, ["e:b", "s:b"]);
			strictEqual(viewText(view), "b");

			comp.value = null;
			assertViewState(view);
			assertEvents(events, ["e:b"]);
			strictEqual(viewText(view), "");
		});

		await suite("direct content reuse", async () => {
			await test("leading view, detached", () => {
				const signal = $();
				const inner = render(<>{0}{1}</>);
				assertViewState(inner);
				const outer = uncapture(() => {
					return <Nest watch={signal}>
						{() => <>{inner}x</>}
					</Nest> as View;
				});
				assertViewState(inner);
				assertViewState(outer);
				strictEqual(viewText(outer), "01x");
				signal.notify();
				assertViewState(inner);
				assertViewState(outer);
				strictEqual(viewText(outer), "01x");
			});

			await test("trailing view, detached", () => {
				const signal = $();
				const inner = render(<>{0}{1}</>);
				assertViewState(inner);
				const outer = uncapture(() => {
					return <Nest watch={signal}>
						{() => <>x{inner}</>}
					</Nest> as View;
				});
				assertViewState(inner);
				assertViewState(outer);
				strictEqual(viewText(outer), "x01");
				signal.notify();
				assertViewState(inner);
				assertViewState(outer);
				strictEqual(viewText(outer), "x01");
			});

			await test("leading view, attached", () => {
				const signal = $();
				const inner = render(<>{0}{1}</>);
				assertViewState(inner);
				const outer = uncapture(() => {
					return <Nest watch={signal}>
						{() => <>{inner}x</>}
					</Nest> as View;
				});
				assertViewState(inner);
				assertViewState(outer);
				const parent = render(<>a{outer}b</>);
				strictEqual(viewText(parent), "a01xb");
				signal.notify();
				assertViewState(inner);
				assertViewState(outer);
				strictEqual(viewText(parent), "a01xb");
			});

			await test("trailing view, attached", () => {
				const signal = $();
				const inner = render(<>{0}{1}</>);
				assertViewState(inner);
				const outer = uncapture(() => {
					return <Nest watch={signal}>
						{() => <>x{inner}</>}
					</Nest> as View;
				});
				assertViewState(inner);
				assertViewState(outer);
				const parent = render(<>a{outer}b</>);
				strictEqual(viewText(parent), "ax01b");
				signal.notify();
				assertViewState(inner);
				assertViewState(outer);
				strictEqual(viewText(parent), "ax01b");
			});
		});
	});

	await test("Show", () => {
		const events: unknown[] = [];
		const signal = $(0);

		const view = uncapture(() => {
			return <Show when={signal} else={() => {
				events.push("+f");
				teardown(() => {
					events.push("-f");
				});
				return "f";
			}}>
				{value => {
					events.push(`+${value}`);
					teardown(() => {
						events.push(`-${value}`);
					});
					return value;
				}}
			</Show> as View;
		});

		assertViewState(view);
		strictEqual(viewText(view), "f");
		assertEvents(events, ["+f"]);

		signal.value = 1;
		assertViewState(view);
		strictEqual(viewText(view), "1");
		assertEvents(events, ["-f", "+1"]);

		capture(() => {
			watch(signal, value => void events.push(`e${value}`));
			assertEvents(events, ["e1"]);

			signal.value = 2;
			assertViewState(view);
			strictEqual(viewText(view), "2");
			assertEvents(events, ["-1", "+2", "e2"]);

			signal.value = 2;
			assertViewState(view);
			assertEvents(events, []);

			signal.notify();
			assertViewState(view);
			strictEqual(viewText(view), "2");
			assertEvents(events, ["e2"]);
		})();

		signal.value = 0;
		assertViewState(view);
		strictEqual(viewText(view), "f");
		assertEvents(events, ["-2", "+f"]);

		capture(() => {
			watch(signal, value => void events.push(`e${value}`));
			assertEvents(events, ["e0"]);

			signal.value = 0;
			assertViewState(view);
			assertEvents(events, []);

			signal.notify();
			assertViewState(view);
			strictEqual(viewText(view), "f");
			assertEvents(events, ["e0"]);
		})();
	});

	await suite("For", async () => {
		function sequenceTest(sequence: number[][], prefix: string | null, suffix: string | null) {
			const events: unknown[] = [];
			const signal = $(sequence[0]);

			let view!: View;
			const dispose = capture(() => {
				const inner = <For each={signal}>
					{(value, index) => {
						events.push(`+${value}`);
						teardown(() => {
							events.push(`-${value}`);
						});
						return <>[{value}:{index}]</>;
					}}
				</For> as View;

				view = render([
					...(prefix === null ? [] : [prefix]),
					inner,
					...(suffix === null ? [] : [suffix]),
				]);
			});

			assertState(sequence[0]);
			assertEvents(events, computeMapArrayDiffEvents([], sequence[0]));

			for (let i = 1; i < sequence.length; i++) {
				signal.value = sequence[i];
				assertState(sequence[i]);
				assertEvents(events, computeMapArrayDiffEvents(sequence[i - 1], sequence[i]));
			}

			dispose();
			assertState(sequence[sequence.length - 1]);
			assertEvents(events, computeMapArrayDiffEvents(sequence[sequence.length - 1], []));

			function assertState(values: number[]) {
				strictEqual(viewText(view), (prefix ?? "") + values.map((v, i) => `[${v}:${i}]`).join("") + (suffix ?? ""));
			}
		}

		function contextSequenceTest(sequence: number[][]) {
			sequenceTest(sequence, null, null);
			sequenceTest(sequence, "prefix", "suffix");
			sequenceTest(sequence, "prefix", null);
			sequenceTest(sequence, null, "suffix");
		}

		await test("fixed sequence", () => {
			contextSequenceTest([
				[1, 2, 3, 4, 5],
				[2, 4],
				[1, 4, 3, 2, 5],
				[],
				[1, 2, 3, 4, 5],
				[5, 3, 1],
				[2, 4],
				[1, 2, 3, 4, 5, 6, 7],
				[2, 9, 10, 7, 8, 1, 5],
				[2, 2, 1, 1, 5, 5],
				[2, 1, 5, 3, 2, 1, 3, 5, 2, 5, 1],
				[3, 5, 1, 2],
				[1, 1, 3, 2, 2, 5, 2, 5, 1, 2],
				[1, 2, 1, 5, 3, 2, 2, 1, 2, 5],
				[1, 2, 2, 5, 2],
				[2, 5, 3, 2, 2],
				[2, 5, 2, 5, 3, 2, 2],
				[2, 5, 2, 5, 3, 2, 2, 5, 3],
				[2, 5, 1, 3, 2, 2],
				[2, 5, 1, 2, 5, 3, 2, 2],
				[2, 5, 1, 2, 5, 3, 2, 2, 5, 3],
				[1, 2, 3, 4, 5, 6, 7],
				[1, 2, 3, 4, 5, 6, 7],
				[2, 9, 10, 7, 8, 1, 5],
				[2, 9, 10, 7, 8, 1, 5],
				[2, 2, 1, 1, 5, 5],
				[2, 2, 1, 1, 5, 5],
				[1, 2, 3, 4, 5, 6, 7, 8, 9],
				[1, 5, 6, 7, 8, 2, 3, 4, 9],
				[1, 2, 3, 4, 5, 6, 7, 8, 9],
				[1, 6, 7, 8, 2, 3, 4, 5, 9],
			]);
		});

		await suite("random sequences", async () => {
			function randomSequenceTest(count: number, maxLength: number, maxValue: number) {
				return () => {
					const sequence: number[][] = [];
					for (let i = 0; i < count; i++) {
						const values: number[] = [];
						const length = Math.floor(Math.random() * maxLength);
						for (let v = 0; v < length; v++) {
							values.push(1 + Math.floor(Math.random() * maxValue));
						}
						sequence.push(values);
					}
					contextSequenceTest(sequence);
				};
			}

			await test(randomSequenceTest(256, 16, 8));
			await test(randomSequenceTest(256, 8, 16));
		});
	});

	await suite("Index", async () => {
		function sequenceTest(sequence: unknown[][], withErrors: boolean) {
			if (withErrors) {
				sequence = structuredClone(sequence);
				for (let i = 1; i < sequence.length; i++) {
					sequence[i].push(new Error(`${i}`), "unreachable value", new Error(`unreachable error`));
				}
			}

			const events: unknown[] = [];
			const signal = $(sequence[0]);

			let view!: View;
			const dispose = capture(() => {
				view = <Index each={signal}>
					{(value, index) => {
						if (value instanceof Error) {
							throw value;
						}
						events.push(`+${value}`);
						teardown(() => {
							events.push(`-${value}`);
						});
						return <>[{value}:{index}]</>;
					}}
				</Index> as View;
			});

			let lastValues: unknown[] = [];
			function assertItems(values: unknown[], errorIndex: number, assertContent: boolean) {
				if (errorIndex >= 0) {
					values = values.slice(0, errorIndex);
				}

				if (assertContent) {
					strictEqual(viewText(view), values.map((v, i) => `[${v}:${i}]`).join(""));
				}

				const expectedEvents: unknown[] = [];
				for (let i = 0; i < values.length; i++) {
					if (i < lastValues.length) {
						const last = lastValues[i];
						if (last === values[i]) {
							continue;
						}
						expectedEvents.push(`-${last}`);
					}
					expectedEvents.push(`+${values[i]}`);
				}
				for (let i = values.length; i < lastValues.length; i++) {
					expectedEvents.push(`-${lastValues[i]}`);
				}
				assertEvents(events, expectedEvents);
				lastValues = values;
			}

			assertViewState(view);
			assertItems(sequence[0], -1, true);
			for (let i = 1; i < sequence.length; i++) {
				const values = sequence[i];
				const errorIndex = values.findIndex(v => v instanceof Error);
				if (errorIndex >= 0) {
					throws(() => {
						signal.value = values;
					}, error => error === values[errorIndex]);
				} else {
					signal.value = values;
				}
				assertViewState(view);
				assertItems(values, errorIndex, true);
			}

			const lastContent = text(view!.detach());
			assertViewState(view);
			dispose();
			assertViewState(view);
			assertItems([], -1, false);
			strictEqual(viewText(view), lastContent);
		}

		for (const withErrors of [false, true]) {
			await suite(withErrors ? "diff" : "error handling", async () => {
				await test("fixed sequence", () => {
					sequenceTest([
						[1, 2, 3],
						[1, 4, 3],
						[1, 4],
						[2, 4, 5, 6],
						[1, 2, 3],
						[],
					], withErrors);
				});

				await test("random", ctx => {
					const SEQ_SIZE = 100;
					const MAX_COUNT = 20;
					const MAX_VALUE = 5;

					const sequence: unknown[][] = [];
					for (let i = 0; i < SEQ_SIZE; i++) {
						const count = Math.floor(Math.random() * MAX_COUNT);
						const values: unknown[] = [];
						for (let c = 0; c < count; c++) {
							values.push(Math.floor(Math.random() * MAX_VALUE));
						}
						sequence.push(values);
					}

					try {
						sequenceTest(sequence, withErrors);
					} catch (error) {
						ctx.diagnostic(`Broken sequence: ${JSON.stringify(sequence)}`);
						throw error;
					}
				});
			});
		}

		for (const context of [capture, uncapture]) {
			await test(`initial iteration error handling (${context.name})`, () => {
				const events: unknown[] = [];
				throws(() => {
					context(() => {
						<Index each={(function * () {
							yield 0;
							yield 1;
							events.push("e");
							throw new Error("test");
						})()}>
							{value => {
								events.push(`+${value}`);
								teardown(() => {
									events.push(`-${value}`);
								});
							}}
						</Index>;
					});
				});
				assertEvents(events, context === capture ? ["+0", "+1", "e", "-0", "-1"] : ["+0", "+1", "e"]);
			});

			await test(`initial render error handling (${context.name})`, () => {
				const events: unknown[] = [];
				throws(() => {
					context(() => {
						<Index each={[0, 1, 2, 3]}>
							{value => {
								events.push(`+${value}`);
								teardown(() => {
									events.push(`-${value}`);
								});
								if (value === 2) {
									events.push("e");
									throw new Error("test");
								}
							}}
						</Index>;
					});
				});
				assertEvents(events, context === capture ? ["+0", "+1", "+2", "e", "-2", "-0", "-1"] : ["+0", "+1", "+2", "e", "-2"]);
			});
		}

		await test("sequential item render side effects", () => {
			const events: unknown[] = [];
			const signal = $([1]);
			const view = uncapture(() => {
				return <Index each={signal}>
					{value => {
						if (value === 3) {
							signal.value = [5];
						}
						lifecycleEvent(events, String(value));
						return value;
					}}
				</Index> as View;
			});
			assertViewState(view);
			assertEvents(events, ["s:1"]);
			strictEqual(viewText(view), "1");
			signal.value = [2, 3, 4];
			assertViewState(view);
			deepStrictEqual(signal.value, [5]);
			assertEvents(events, ["e:1", "s:2", "s:3", "s:4", "e:2", "s:5", "e:3", "e:4"]);
			strictEqual(viewText(view), "5");
		});

		function lifecycleTest(options: {
			sequence: [values: unknown[], ...expectedEvents: unknown[]][];
			disposeEvents: unknown[];
		}): void {
			const events: unknown[] = [];
			const signal = $<unknown[]>([]);

			let view!: View;
			const dispose = capture(() => {
				view = <Index each={signal}>
					{(value, index) => {
						events.push(["create", value, index]);
						watchUpdates(index, index => {
							events.push(["index", value, index]);
						});
						teardown(() => {
							events.push(["dispose", value, index]);
						});
					}}
				</Index> as View;
			});

			assertViewState(view);
			assertEvents(events, []);
			for (const [values, ...expectedEvents] of options.sequence) {
				signal.value = values;
				assertViewState(view);
				assertEvents(events, expectedEvents);
			}

			dispose();
			assertViewState(view);
			assertEvents(events, options.disposeEvents);
		}

		await test("lifecycle & update order", () => {
			lifecycleTest({
				sequence: [
					[
						["a", "b"],
						["create", "a", 0],
						["create", "b", 1],
					],
					[
						["a", "c", "b"],
						["dispose", "b", 1],
						["create", "c", 1],
						["create", "b", 2],
					],
					[
						["a", "d", "b"],
						["dispose", "c", 1],
						["create", "d", 1],
					],
					[
						["a", "b"],
						["dispose", "d", 1],
						["create", "b", 1],
						["dispose", "b", 2],
					],
					[
						["b", "a"],
						["dispose", "a", 0],
						["create", "b", 0],
						["dispose", "b", 1],
						["create", "a", 1],
					],
				],
				disposeEvents: [
					["dispose", "b", 0],
					["dispose", "a", 1],
				],
			});
		});

		await test("lifecycle & update order (NaN)", () => {
			lifecycleTest({
				sequence: [
					[
						[NaN, NaN, "a"],
						["create", NaN, 0],
						["create", NaN, 1],
						["create", "a", 2],
					],
					[
						["b", NaN, "a"],
						["dispose", NaN, 0],
						["create", "b", 0],
					],
					[
						["b", NaN, "a"],
					],
				],
				disposeEvents: [
					["dispose", "b", 0],
					["dispose", NaN, 1],
					["dispose", "a", 2],
				],
			});
		});

		await test("iterator internal updates", () => {
			const proxy = wrap(["a", "b"]);
			const view = uncapture(() => {
				return <Index each={proxy}>{v => v}</Index> as View;
			});
			assertViewState(view);
			strictEqual(viewText(view), "ab");
			proxy.splice(1, 0, "c");
			assertViewState(view);
			strictEqual(viewText(view), "acb");
		});

		await test("component access isolation", () => {
			const events: unknown[] = [];
			const values = $([1]);
			const signal = $(2);
			const view = uncapture(() => {
				return <Index each={() => {
					events.push("iter");
					return values.value;
				}}>
					{value => value + signal.value}
				</Index> as View;
			});
			assertViewState(view);
			strictEqual(viewText(view), "3");
			assertEvents(events, ["iter"]);
			signal.value = 4;
			assertViewState(view);
			strictEqual(viewText(view), "3");
			assertEvents(events, []);
			values.value = [5];
			assertViewState(view);
			strictEqual(viewText(view), "9");
			assertEvents(events, ["iter"]);
		});

		await test("expression & iteration lifecycle", () => {
			const events: unknown[] = [];
			const signal = $(0);
			const view = uncapture(() => {
				return <Index each={function * () {
					lifecycleEvent(events, "a");
					yield signal.value;
					lifecycleEvent(events, "b");
				}}>
					{value => {
						lifecycleEvent(events, value);
						return value;
					}}
				</Index> as View;
			});
			assertViewState(view);
			assertEvents(events, ["s:a", "s:0", "s:b"]);
			signal.value++;
			assertViewState(view);
			assertEvents(events, ["e:b", "e:a", "s:a", "e:0", "s:1", "s:b"]);
		});
	});

	await suite("movable", async () => {
		await test("basic usage", () => {
			const inner = $(1);
			const view = uncapture(() => movable(<>
				inner:{inner}
			</>));

			const a = uncapture(view.move);
			assertViewState(a);
			strictEqual(viewText(a), "inner:1");

			const b = uncapture(view.move);
			assertViewState(a);
			assertViewState(b);
			strictEqual(viewText(a), "");
			strictEqual(a.first instanceof ENV.current.Comment, true);
			strictEqual(a.first, a.last);
			strictEqual(viewText(b), "inner:1");
			inner.value = 2;
			assertViewState(a);
			assertViewState(b);
			strictEqual(viewText(b), "inner:2");
			view.detach();
			assertViewState(a);
			assertViewState(b);
			inner.value = 3;
			assertViewState(a);
			assertViewState(b);
			strictEqual(text(b.detach()), "");
			strictEqual(b.first instanceof ENV.current.Comment, true);
			strictEqual(b.first, b.last);
			notStrictEqual(a.first, b.first);

			const c = uncapture(view.move);
			assertViewState(a);
			assertViewState(b);
			assertViewState(c);
			strictEqual(text(c.detach()), "inner:3");
			assertViewState(c);
		});

		await test("lifecycle", () => {
			const view = uncapture(() => movable(<>test</>));
			let a!: View;
			const disposeA = capture(() => {
				a = render(<>0{view.move()}1</>);
			});
			strictEqual(viewText(a), "0test1");
			disposeA();
			view.detach();
			strictEqual(viewText(a), "0test1");
			const b = uncapture(() => render(<>2{view.move()}3</>));
			strictEqual(viewText(a), "01");
			strictEqual(viewText(b), "2test3");
		});
	});

	await test("Attach", async () => {
		const signal = $(false);
		const inner = $(1);

		const view = uncapture(() => {
			return <Attach when={signal}>
				inner:{inner}
			</Attach> as View;
		});
		assertViewState(view);

		inner.value = 2;
		assertViewState(view);
		strictEqual(viewText(view), "");
		signal.value = true;
		assertViewState(view);
		strictEqual(viewText(view), "inner:2");
		inner.value = 3;
		assertViewState(view);
		strictEqual(viewText(view), "inner:3");
		signal.value = false;
		assertViewState(view);
		strictEqual(viewText(view), "");
		inner.value = 4;
		assertViewState(view);
		strictEqual(viewText(view), "");
		signal.value = true;
		assertViewState(view);
		strictEqual(viewText(view), "inner:4");
		signal.notify();
		assertViewState(view);
		strictEqual(viewText(view), "inner:4");
	});
});
