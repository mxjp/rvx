import { deepStrictEqual, notStrictEqual, strictEqual, throws } from "node:assert";
import test, { suite } from "node:test";

import { Attach, capture, Component, For, IndexFor, memo, mount, movable, Nest, render, Show, sig, teardown, uncapture, View, watch, watchUpdates } from "rvx";
import { wrap } from "rvx/store";

import { assertEvents, boundaryEvents, lifecycleEvent, TestView, testView, text, withMsg } from "../common.js";

await suite("view", async () => {
	await test("init incomplete", () => {
		throws(() => new View(() => {}), withMsg("G1"));
		throws(() => new View(setBoundary => {
			setBoundary(document.createTextNode("test"), undefined);
		}), withMsg("G1"));
		throws(() => new View(setBoundary => {
			setBoundary(undefined, document.createTextNode("test"));
		}), withMsg("G1"));
	});

	await test("init single node", () => {
		const view = new View(setBoundary => {
			const node = <div>test</div> as HTMLElement;
			setBoundary(node, node);
		});

		strictEqual(view.parent, undefined);
		strictEqual(view.first, view.last);
		strictEqual(text(view.first), "test");
	});

	await test("init different nodes", () => {
		const { view } = testView();
		strictEqual(view.parent instanceof DocumentFragment, true);
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

	await test("take single node", () => {
		let node!: Node;
		let parent!: Node;
		const view = new View(setBoundary => {
			node = <div>test</div> as HTMLElement;
			parent = <div>{node}</div> as HTMLElement;
			setBoundary(node, node);
		});
		strictEqual(node.parentNode, parent);
		strictEqual(node, view.take());
		strictEqual(node.parentNode, parent);
	});

	await test("detach single node", () => {
		let node!: Node;
		let parent!: Node;
		const view = new View(setBoundary => {
			node = <div>test</div> as HTMLElement;
			parent = <div>{node}</div> as HTMLElement;
			setBoundary(node, node);
		});
		strictEqual(node.parentNode, parent);
		view.detach();
		strictEqual(node.parentNode, null);
	});

	await test("take multiple nodes", () => {
		const { view } = testView();
		const frag = view.take();
		strictEqual(frag instanceof DocumentFragment, true);
		strictEqual(view.first, frag.firstChild);
		strictEqual(view.last, frag.lastChild);
	});

	await test("detach multiple nodes", () => {
		const { view } = testView();
		const parent = view.parent;
		view.detach();
		strictEqual(view.first.parentNode instanceof DocumentFragment, true);
		strictEqual(view.first.parentNode, view.last.parentNode);
		notStrictEqual(view.first.parentNode, parent);
	});

	await test("mount", async () => {
		const root = <div /> as HTMLElement;
		strictEqual(text(root), "");
		let view!: View;
		const signal = sig(1);
		const dispose = capture(() => {
			view = mount(root, () => `test${signal.value}`);
		});
		strictEqual(text(root), "test1");
		signal.value = 2;
		strictEqual(text(root), "test2");
		dispose();
		strictEqual(text(root), "");
		strictEqual(text(view.take()), "test2");
		signal.value = 3;
		strictEqual(text(view.take()), "test2");
	});

	await suite("Nest", async () => {
		await test("lifecycle", () => {
			const events: unknown[] = [];
			const signal = sig(0);

			let view!: View;
			const dispose = capture(() => {
				view = <Nest>
					{() => {
						const value = signal.value;
						if (value === 0) {
							return undefined;
						}
						return () => {
							events.push(`+${value}`);
							teardown(() => {
								events.push(`-${value}`);
							});
							return <div>{value}</div> as HTMLElement;
						};
					}}
				</Nest> as View;
			});

			strictEqual(text(view.take()), "");
			assertEvents(events, []);

			signal.value = 1;
			strictEqual(text(view.take()), "1");
			assertEvents(events, ["+1"]);

			signal.value = 2;
			strictEqual(text(view.take()), "2");
			assertEvents(events, ["-1", "+2"]);

			dispose();
			assertEvents(events, ["-2"]);
		});

		await test("boundary", () => {
			const events: unknown[] = [];

			const inner = sig<TestView | undefined>(undefined);

			let view!: View;
			capture(() => {
				view = <Nest>
					{() => {
						const view = inner.value?.view;
						return () => view;
					}}
				</Nest> as View;
				view.setBoundaryOwner(boundaryEvents(events));
			});

			strictEqual(text(view.take()), "");

			inner.value = testView("a");
			strictEqual(text(view.take()), "afl");
			assertEvents(events, ["afl"]);

			inner.value.nextFirst();
			strictEqual(text(view.take()), "af0l");
			assertEvents(events, ["af0l"]);

			inner.value.nextLast();
			strictEqual(text(view.take()), "af0l1");
			assertEvents(events, ["af0l1"]);

			inner.value = testView("b");
			strictEqual(text(view.take()), "bfl");
			assertEvents(events, ["bfl"]);

			inner.value = undefined;
			strictEqual(text(view.take()), "");
			assertEvents(events, [""]);
		});

		await test("render side effects", () => {
			const events: unknown[] = [];
			const signal = sig(0);
			let view!: View;
			uncapture(() => {
				view = <Nest>
					{() => {
						const value = signal.value;
						return () => {
							lifecycleEvent(events, `${value}`);
							if (value < 3) {
								signal.value++;
							}
							return value;
						};
					}}
				</Nest> as View;
			});
			strictEqual(text(view.take()), "3");
			assertEvents(events, ["s:0", "e:0", "s:1", "e:1", "s:2", "e:2", "s:3"]);
		});

		await suite("error handling", async () => {
			await test("expression, initialization", () => {
				const signal = sig(42);
				throws(() => {
					capture(() => {
						<Nest>
							{() => {
								signal.access();
								throw new Error("test");
							}}
						</Nest> as View;
					});
				}, withMsg("test"));
				signal.value = 77;
			});

			await test("expression, signal update", () => {
				const signal = sig(42);
				let view!: View;
				const dispose = capture(() => {
					view = <Nest>
						{() => {
							const value = signal.value;
							if (value === 77) {
								throw new Error("test");
							}
							return () => value;
						}}
					</Nest> as View;
				});
				strictEqual(text(view.take()), "42");

				throws(() => {
					signal.value = 77;
				}, withMsg("test"));
				strictEqual(text(view.take()), "42");

				signal.value = 123;
				strictEqual(text(view.take()), "123");

				dispose();
				signal.value = 11;
				strictEqual(text(view.take()), "123");
			});

			await test("component, initialization", () => {
				const signal = sig(42);
				throws(() => {
					capture(() => {
						<Nest>
							{() => {
								signal.access();
								return () => {
									throw new Error("test");
								};
							}}
						</Nest> as View;
					});
				}, withMsg("test"));
				signal.value = 77;
			});

			await test("component, signal update", () => {
				const signal = sig(42);
				let view!: View;
				const dispose = capture(() => {
					view = <Nest>
						{() => {
							const value = signal.value;
							return () => {
								if (value === 77) {
									throw new Error("test");
								}
								return value;
							};
						}}
					</Nest> as View;
				});
				strictEqual(text(view.take()), "42");

				throws(() => {
					signal.value = 77;
				}, withMsg("test"));
				strictEqual(text(view.take()), "42");

				signal.value = 123;
				strictEqual(text(view.take()), "123");

				dispose();
				signal.value = 11;
				strictEqual(text(view.take()), "123");
			});
		});

		await test("component memo", () => {
			const events: unknown[] = [];
			const signal = sig(0);

			function A() {
				lifecycleEvent(events, "a");
				return <>a {signal}</>;
			}

			function B() {
				lifecycleEvent(events, "b");
				return <>b {signal}</>;
			}

			const view = uncapture(() => {
				return <Nest>
					{memo(() => signal.value < 2 ? A : B)}
				</Nest> as View;
			});

			assertEvents(events, ["s:a"]);
			strictEqual(text(view.take()), "a 0");

			signal.value = 1;
			assertEvents(events, []);
			strictEqual(text(view.take()), "a 1");

			signal.value = 2;
			assertEvents(events, ["e:a", "s:b"]);
			strictEqual(text(view.take()), "b 2");

			signal.value = 3;
			assertEvents(events, []);
			strictEqual(text(view.take()), "b 3");
		});

		await test("external state reset", () => {
			const events: unknown[] = [];
			const signal = sig();
			const count = sig(0);

			function Content() {
				const version = `v${count.value}`;
				lifecycleEvent(events, version);
				return <>{version} {count}</>;
			}

			const view = uncapture(() => {
				return <Nest>
					{() => {
						signal.access();
						return Content;
					}}
				</Nest> as View;
			});

			assertEvents(events, ["s:v0"]);
			strictEqual(text(view.take()), "v0 0");

			count.value++;
			assertEvents(events, []);
			strictEqual(text(view.take()), "v0 1");

			signal.notify();
			assertEvents(events, ["e:v0", "s:v1"]);
			strictEqual(text(view.take()), "v1 1");

			count.value++;
			assertEvents(events, []);
			strictEqual(text(view.take()), "v1 2");
		});

		await test("internal state reset", () => {
			const events: unknown[] = [];
			const signal = sig();
			const count = sig(0);

			const view = uncapture(() => {
				return <Nest>
					{() => {
						signal.access();
						return () => {
							const version = `v${count.value}`;
							lifecycleEvent(events, version);
							return <>{version} {count}</>;
						};
					}}
				</Nest> as View;
			});

			assertEvents(events, ["s:v0"]);
			strictEqual(text(view.take()), "v0 0");

			count.value++;
			assertEvents(events, []);
			strictEqual(text(view.take()), "v0 1");

			signal.notify();
			assertEvents(events, ["e:v0", "s:v1"]);
			strictEqual(text(view.take()), "v1 1");

			count.value++;
			assertEvents(events, []);
			strictEqual(text(view.take()), "v1 2");
		});

		await test("component from signal", () => {
			const events: unknown[] = [];
			const comp = sig<Component | undefined>(undefined);
			const view = uncapture(() => <Nest>{comp}</Nest> as View);

			assertEvents(events, []);
			strictEqual(text(view.take()), "");

			comp.value = () => {
				lifecycleEvent(events, "a");
				return "a";
			};
			assertEvents(events, ["s:a"]);
			strictEqual(text(view.take()), "a");

			comp.value = () => {
				lifecycleEvent(events, "b");
				return "b";
			};
			assertEvents(events, ["e:a", "s:b"]);
			strictEqual(text(view.take()), "b");

			comp.notify();
			assertEvents(events, ["e:b", "s:b"]);
			strictEqual(text(view.take()), "b");
		});
	});

	await test("Show", () => {
		const events: unknown[] = [];

		const signal = sig(0);

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

		strictEqual(text(view.take()), "f");
		assertEvents(events, ["+f"]);

		signal.value = 1;
		strictEqual(text(view.take()), "1");
		assertEvents(events, ["-f", "+1"]);

		capture(() => {
			watch(signal, value => void events.push(`e${value}`));
			assertEvents(events, ["e1"]);

			signal.value = 2;
			strictEqual(text(view.take()), "2");
			assertEvents(events, ["-1", "+2", "e2"]);

			signal.value = 2;
			assertEvents(events, []);

			signal.notify();
			strictEqual(text(view.take()), "2");
			assertEvents(events, ["e2"]);
		})();

		signal.value = 0;
		strictEqual(text(view.take()), "f");
		assertEvents(events, ["-2", "+f"]);

		capture(() => {
			watch(signal, value => void events.push(`e${value}`));
			assertEvents(events, ["e0"]);

			signal.value = 0;
			assertEvents(events, []);

			signal.notify();
			strictEqual(text(view.take()), "f");
			assertEvents(events, ["e0"]);
		})();
	});

	await suite("For", async () => {
		function sequenceTest(sequence: unknown[][], withErrors: boolean) {
			if (withErrors) {
				sequence = structuredClone(sequence);
				for (let i = 1; i < sequence.length; i++) {
					sequence[i].push(new Error(`${i}`), "unreachable value", new Error(`unreachable error`));
				}
			}

			const events: unknown[] = [];
			const signal = sig(sequence[0]);

			let view!: View;
			const dispose = capture(() => {
				return view = <For each={signal}>
					{(value, index) => {
						if (value instanceof Error) {
							events.push("+e");
							teardown(() => {
								events.push("-e");
							});
							throw value;
						}
						events.push(`+${value}`);
						teardown(() => {
							events.push(`-${value}`);
						});
						return <>[{value}:{index}]</>;
					}}
				</For> as View;
			});

			let lastValues = new Set<unknown>();
			function assertItems(values: unknown[], errorIndex: number, assertContent: boolean) {
				const expectedEvents = [];
				if (errorIndex >= 0) {
					expectedEvents.push("+e", "-e");
					values = values.slice(0, errorIndex);
				}

				if (assertContent) {
					strictEqual(text(view.take()), [...new Set(values)].map((v, i) => `[${v}:${i}]`).join(""));
				}

				const valueSet = new Set(values);
				for (const value of valueSet) {
					if (!lastValues.has(value)) {
						expectedEvents.push(`+${value}`);
					}
				}
				for (const value of lastValues) {
					if (!valueSet.has(value)) {
						expectedEvents.push(`-${value}`);
					}
				}

				lastValues = valueSet;
				assertEvents(events.sort(), expectedEvents.sort());
			}

			assertItems(sequence[0], -1, true);
			for (let i = 1; i < sequence.length; i++) {
				const values = sequence[i];
				const errorIndex = values.findIndex(v => v instanceof Error);
				if (errorIndex >= 0) {
					throws(() => {
						signal.value = sequence[i];
					}, error => error === values[errorIndex]);
				} else {
					signal.value = sequence[i];
				}
				assertItems(sequence[i], errorIndex, true);
			}

			const lastContent = text(view.take());
			dispose();
			assertItems([], -1, false);
			strictEqual(text(view.take()), lastContent);
		}

		for (const withErrors of [false, true]) {
			await suite(withErrors ? "diff" : "error handling", async () => {
				await test("fixed sequence", () => {
					sequenceTest([
						// Initial items:
						[1, 2, 3, 4, 5],
						// Remove boundary & middle parts:
						[2, 4],
						// Shuffle & insert:
						[1, 4, 3, 2, 5],
						// Remove all:
						[],
						// Re-insert items:
						[1, 2, 3, 4, 5],
						// Shuffle & remove:
						[5, 3, 1],
						// Remove and insert new:
						[2, 4],
						// Insert many:
						[1, 2, 3, 4, 5, 6, 7],
						// Shuffle, insert & remove:
						[2, 9, 10, 7, 8, 1, 5],
						// Remove & insert duplicates:
						[2, 2, 1, 1, 5, 5],
						// Shuffle & insert mixed duplicates:
						[2, 1, 5, 3, 2, 1, 3, 5, 2, 5, 1],
						// Shuffle & remove duplicates only:
						[3, 5, 1, 2],
					], withErrors);
				});

				await test("random", ctx => {
					const SEQ_SIZE = 100;
					const MAX_COUNT = 20;
					const MAX_OFFSET = 8;
					const MAX_DUPLICATES = 4;

					const sequence: unknown[][] = [];
					for (let i = 0; i < SEQ_SIZE; i++) {
						const count = Math.floor(Math.random() * MAX_COUNT);
						const offset = Math.floor(Math.random() * MAX_OFFSET);
						const duplicates = Math.floor(Math.random() * MAX_DUPLICATES);
						const values: unknown[] = [];
						for (let c = 0; c < count; c++) {
							values.splice(Math.floor(Math.random() * (values.length + 1)), 0, c + offset);
						}
						if (count > 0) {
							for (let d = 0; d < duplicates; d++) {
								const value = values[Math.floor(Math.random() * values.length)];
								values.splice(Math.floor(Math.random() * (values.length + 1)), 0, value);
							}
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
						<For each={(function * () {
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
						</For>;
					});
				}, withMsg("test"));
				assertEvents(events, context === capture ? ["+0", "+1", "e", "-0", "-1"] : ["+0", "+1", "e"]);
			});

			await test(`initial render error handling (${context.name})`, () => {
				const events: unknown[] = [];
				throws(() => {
					context(() => {
						<For each={[0, 1, 2, 3]}>
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
						</For>;
					});
				}, withMsg("test"));
				assertEvents(events, context === capture ? ["+0", "+1", "+2", "e", "-2", "-0", "-1"] : ["+0", "+1", "+2", "e", "-2"]);
			});
		}

		await test("sequential item render side effects", () => {
			const events: unknown[] = [];
			const signal = sig([1]);
			const view = uncapture(() => {
				return <For each={signal}>
					{value => {
						if (value === 3) {
							signal.value = [5];
						}
						lifecycleEvent(events, String(value));
						return value;
					}}
				</For> as View;
			});
			assertEvents(events, ["s:1"]);
			strictEqual(text(view.take()), "1");
			signal.value = [2, 3, 4];
			deepStrictEqual(signal.value, [5]);
			assertEvents(events, ["s:2", "s:3", "s:4", "e:1", "s:5", "e:2", "e:3", "e:4"]);
			strictEqual(text(view.take()), "5");
		});

		function lifecycleTest(options: {
			sequence: [values: unknown[], ...expectedEvents: unknown[]][];
			disposeEvents: unknown[];
		}): void {
			const events: unknown[] = [];
			const signal = sig<unknown[]>([]);

			const dispose = capture(() => {
				<For each={signal}>
					{(value, index) => {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-call
						events.push(["create", value, index()]);
						watchUpdates(index, index => {
							events.push(["index", value, index]);
						});
						teardown(() => {
							// eslint-disable-next-line @typescript-eslint/no-unsafe-call
							events.push(["dispose", value, index()]);
						});
					}}
				</For>;
			});

			assertEvents(events, []);
			for (const [values, ...expectedEvents] of options.sequence) {
				signal.value = values;
				assertEvents(events, expectedEvents);
			}

			dispose();
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
						["create", "c", 1],
						["index", "b", 2],
					],
					[
						["a", "d", "b"],
						["create", "d", 1],
						["dispose", "c", 1],
					],
					[
						["a", "b"],
						["index", "b", 1],
						["dispose", "d", 1],
					],
					[
						["a", "b"],
					],
					[
						["b", "a"],
						["index", "b", 0],
						["index", "a", 1],
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
						["create", "a", 1],
					],
					[
						["b", NaN, "a"],
						["create", "b", 0],
						["index", NaN, 1],
						["index", "a", 2],
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

		await test("iterator internal updates", async () => {
			const proxy = wrap(["a", "b"]);
			const view = uncapture(() => {
				return <For each={proxy}>{v => v}</For> as View;
			});
			strictEqual(text(view.take()), "ab");
			proxy.splice(1, 0, "c");
			strictEqual(text(view.take()), "acb");
		});
	});

	await suite("IndexFor", async () => {
		function sequenceTest(sequence: unknown[][], withErrors: boolean) {
			if (withErrors) {
				sequence = structuredClone(sequence);
				for (let i = 1; i < sequence.length; i++) {
					sequence[i].push(new Error(`${i}`), "unreachable value", new Error(`unreachable error`));
				}
			}

			const events: unknown[] = [];
			const signal = sig(sequence[0]);

			let view!: View;
			const dispose = capture(() => {
				view = <IndexFor each={signal}>
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
				</IndexFor> as View;
			});

			let lastValues: unknown[] = [];
			function assertItems(values: unknown[], errorIndex: number, assertContent: boolean) {
				if (errorIndex >= 0) {
					values = values.slice(0, errorIndex);
				}

				if (assertContent) {
					strictEqual(text(view.take()), values.map((v, i) => `[${v}:${i}]`).join(""));
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
				assertItems(values, errorIndex, true);
			}

			const lastContent = text(view!.take());
			dispose();
			assertItems([], -1, false);
			strictEqual(text(view.take()), lastContent);
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
						<IndexFor each={(function * () {
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
						</IndexFor>;
					});
				});
				assertEvents(events, context === capture ? ["+0", "+1", "e", "-0", "-1"] : ["+0", "+1", "e"]);
			});

			await test(`initial render error handling (${context.name})`, () => {
				const events: unknown[] = [];
				throws(() => {
					context(() => {
						<IndexFor each={[0, 1, 2, 3]}>
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
						</IndexFor>;
					});
				});
				assertEvents(events, context === capture ? ["+0", "+1", "+2", "e", "-2", "-0", "-1"] : ["+0", "+1", "+2", "e", "-2"]);
			});
		}

		await test("sequential item render side effects", () => {
			const events: unknown[] = [];
			const signal = sig([1]);
			const view = uncapture(() => {
				return <IndexFor each={signal}>
					{value => {
						if (value === 3) {
							signal.value = [5];
						}
						lifecycleEvent(events, String(value));
						return value;
					}}
				</IndexFor> as View;
			});
			assertEvents(events, ["s:1"]);
			strictEqual(text(view.take()), "1");
			signal.value = [2, 3, 4];
			deepStrictEqual(signal.value, [5]);
			assertEvents(events, ["e:1", "s:2", "s:3", "s:4", "e:2", "s:5", "e:3", "e:4"]);
			strictEqual(text(view.take()), "5");
		});

		function lifecycleTest(options: {
			sequence: [values: unknown[], ...expectedEvents: unknown[]][];
			disposeEvents: unknown[];
		}): void {
			const events: unknown[] = [];
			const signal = sig<unknown[]>([]);

			const dispose = capture(() => {
				<IndexFor each={signal}>
					{(value, index) => {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-call
						events.push(["create", value, index]);
						watchUpdates(index, index => {
							events.push(["index", value, index]);
						});
						teardown(() => {
							// eslint-disable-next-line @typescript-eslint/no-unsafe-call
							events.push(["dispose", value, index]);
						});
					}}
				</IndexFor>;
			});

			assertEvents(events, []);
			for (const [values, ...expectedEvents] of options.sequence) {
				signal.value = values;
				assertEvents(events, expectedEvents);
			}

			dispose();
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

		await test("iterator internal updates", async () => {
			const proxy = wrap(["a", "b"]);
			const view = uncapture(() => {
				return <IndexFor each={proxy}>{v => v}</IndexFor> as View;
			});
			strictEqual(text(view.take()), "ab");
			proxy.splice(1, 0, "c");
			strictEqual(text(view.take()), "acb");
		});
	});

	await test("movable", async () => {
		const inner = sig(1);
		const view = uncapture(() => movable(<>
			inner: {inner}
		</>));

		const a = render(view.move());
		strictEqual(text(a.take()), "inner: 1");

		const b = render(view.move());
		strictEqual(text(a.take()), "");
		strictEqual(a.first instanceof Comment, true);
		strictEqual(a.first, a.last);
		strictEqual(text(b.take()), "inner: 1");
		inner.value = 2;
		strictEqual(text(b.take()), "inner: 2");

		view.detach();
		inner.value = 3;
		strictEqual(text(b.take()), "");
		strictEqual(b.first instanceof Comment, true);
		strictEqual(b.first, b.last);
		notStrictEqual(a.first, b.first);

		const c = render(view.move());
		strictEqual(text(c.take()), "inner: 3");
	});

	await test("Attach", async () => {
		const signal = sig(false);
		const inner = sig(1);

		const view = uncapture(() => {
			return <Attach when={signal}>
				inner: {inner}
			</Attach> as View;
		});

		inner.value = 2;
		strictEqual(text(view.take()), "");
		signal.value = true;
		strictEqual(text(view.take()), "inner: 2");
		inner.value = 3;
		strictEqual(text(view.take()), "inner: 3");
		signal.value = false;
		strictEqual(text(view.take()), "");
		inner.value = 4;
		strictEqual(text(view.take()), "");
		signal.value = true;
		strictEqual(text(view.take()), "inner: 4");
	});
});
