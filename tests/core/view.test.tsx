import { notStrictEqual, strictEqual, throws } from "node:assert";
import test, { suite } from "node:test";
import { $, Attach, capture, Component, ENV, For, Index, memo, mount, movable, Nest, render, Show, teardown, uncapture, View, watch } from "rvx";
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
			assertViewState(view);
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
			assertViewState(view);
		});

		await test("same position", () => {
			const inner = render([
				<div>a</div>,
				<div>b</div>,
				<div>c</div>,
			]);
			const outer = uncapture(() => render([
				"0",
				inner,
			]));
			strictEqual(viewText(outer), "0abc");
			inner.appendTo(outer.parent!);
			strictEqual(viewText(outer), "0abc");
			assertViewState(inner);
			assertViewState(outer);
		});
	});

	await suite("insertBefore", async () => {
		await test("single node", () => {
			const view = render(<div>c</div>);
			const parent = <div>{["a", "b"]}</div> as HTMLElement;
			view.insertBefore(parent, parent.lastChild!);
			strictEqual(parent.textContent, "acb");
			strictEqual(view.parent, parent);
			assertViewState(view);
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
			assertViewState(view);
		});

		await test("same position", () => {
			const inner = render([
				<div>a</div>,
				<div>b</div>,
				<div>c</div>,
			]);
			const ref = <div>r</div> as HTMLElement;
			const outer = render([
				"0",
				inner,
				ref,
				"1",
			]);
			strictEqual(viewText(outer), "0abcr1");
			inner.insertBefore(outer.parent!, ref);
			strictEqual(viewText(outer), "0abcr1");
			assertViewState(inner);
			assertViewState(outer);
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
			let inner!: View;
			const dispose = capture(() => {
				inner = <For each={signal}>
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
				assertViewState(view);
				assertViewState(inner);
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
		function sequenceTest(sequence: number[][], prefix: string | null, suffix: string | null) {
			const events: unknown[] = [];
			const signal = $(sequence[0]);

			let view!: View;
			let inner!: View;
			const dispose = capture(() => {
				inner = <Index each={signal}>
					{(value, index) => {
						events.push(`+${index}`);
						teardown(() => {
							events.push(`-${index}`);
						});
						return <>[{value}:{index}]</>;
					}}
				</Index> as View;

				view = render([
					...(prefix === null ? [] : [prefix]),
					inner,
					...(suffix === null ? [] : [suffix]),
				]);
			});

			assertState(sequence[0]);
			assertEvents(events, computeDiffEvents([], sequence[0]));

			for (let i = 1; i < sequence.length; i++) {
				signal.value = sequence[i];
				assertState(sequence[i]);
				assertEvents(events, computeDiffEvents(sequence[i - 1], sequence[i]));
			}

			dispose();
			assertState(sequence[sequence.length - 1]);
			assertEvents(events, computeDiffEvents(sequence[sequence.length - 1], []));

			function computeDiffEvents(prev: number[], next: number[]) {
				const events: unknown[] = [];
				let length = prev.length;
				while (length < next.length) {
					events.push(`+${length}`);
					length++;
				}
				while (length > next.length) {
					length--;
					events.push(`-${length}`);
				}
				return events;
			}

			function assertState(values: number[]) {
				assertViewState(view);
				assertViewState(inner);
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

		await test("render side effects", () => {
			const events: unknown[] = [];
			const signal = $([1]);
			const view = uncapture(() => {
				return <Index each={signal}>
					{(value, index) => {
						lifecycleEvent(events, String(index));
						if (index === 1) {
							signal.value = [5];
						}
						return value;
					}}
				</Index> as View;
			});
			assertViewState(view);
			assertEvents(events, ["s:0"]);
			strictEqual(viewText(view), "1");
			signal.value = [2, 3, 4];
			assertViewState(view);
			assertEvents(events, ["s:1", "s:2", "e:2", "e:1"]);
			strictEqual(viewText(view), "5");
		});

		await test("component isolation", () => {
			const values = $([1]);
			const signal = $(1);
			const view = uncapture(() => {
				return <Index each={values}>
					{value => {
						const signalValue = signal.value;
						return () => value() + signalValue;
					}}
				</Index> as View;
			});
			strictEqual(viewText(view), "2");
			signal.value++;
			strictEqual(viewText(view), "2");
			values.value = [2];
			strictEqual(viewText(view), "3");
			values.value = [];
			values.value = [2];
			strictEqual(viewText(view), "4");
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
