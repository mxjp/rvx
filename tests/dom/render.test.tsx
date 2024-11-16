import { strictEqual } from "node:assert";
import test, { suite } from "node:test";
import { Context, teardown } from "rvx";
import { Async } from "rvx/async";
import { renderToString, renderToStringAsync } from "rvx/dom";
import { assertEvents } from "../common.js";

await suite("dom/render", async () => {
	await suite("renderToString", async () => {
		await test("basic usage", () => {
			strictEqual(renderToString(() => {}), "");
			strictEqual(renderToString(() => "Hello World!"), "Hello World!");
			strictEqual(renderToString(() => "<div>"), "&lt;div&gt;");
			strictEqual(renderToString(() => <div>Hello World!</div>), "<div>Hello World!</div>");
			strictEqual(renderToString<{ foo: string }>(props => props.foo, { foo: "test" }), "test");
		});

		await test("lifecycle", () => {
			const events: unknown[] = [];
			strictEqual(renderToString(() => {
				teardown(() => events.push("teardown"));
				return "test";
			}), "test");
			assertEvents(events, ["teardown"]);
		});

		await test("context", () => {
			const TEST = new Context<string | undefined>();
			strictEqual(TEST.inject("test", () => {
				return renderToString(() => <>{TEST.current}42</>);
			}), "test42");
		});
	});

	await suite("renderToStringAsync", async () => {
		await test("sync usage", async () => {
			strictEqual(await renderToStringAsync(() => {}), "");
			strictEqual(await renderToStringAsync(() => "Hello World!"), "Hello World!");
			strictEqual(await renderToStringAsync(() => "<div>"), "&lt;div&gt;");
			strictEqual(await renderToStringAsync(() => <div>Hello World!</div>), "<div>Hello World!</div>");
			strictEqual(await renderToStringAsync<{ foo: string }>(props => props.foo, { foo: "test" }), "test");
		});

		await test("async usage", async () => {
			strictEqual(await renderToStringAsync(() => {
				return <Async source={Promise.resolve("Hello World!")}>
					{(message: string) => {
						return <h1>{message}</h1>;
					}}
				</Async>;
			}), "<h1>Hello World!</h1>");
		});

		await test("lifecycle", async () => {
			const events: unknown[] = [];
			strictEqual(await renderToStringAsync(() => {
				teardown(() => events.push("teardown"));
				return <Async source={Promise.resolve("Hello World!")}>
					{(message: string) => {
						events.push("render");
						return <h1>{message}</h1>;
					}}
				</Async>;
			}), "<h1>Hello World!</h1>");
			assertEvents(events, ["render", "teardown"]);
		});

		await test("context", async () => {
			const TEST = new Context<string | undefined>();
			strictEqual(await TEST.inject("test", () => {
				return renderToStringAsync(() => <>{TEST.current}42</>);
			}), "test42");
		});
	});
});
