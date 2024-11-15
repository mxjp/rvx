import { deepStrictEqual, strictEqual } from "node:assert";
import test, { suite } from "node:test";
import { render } from "rvx";
import { querySelector, querySelectorAll } from "rvx/test";
import { ENV_TYPE, text } from "../common.js";

await suite("test/view", async () => {
	await test("querySelector", { skip: ENV_TYPE === "rvxdom" }, () => {
		const view = render(<>
			<div>a</div>
			<span>
				<div>b</div>
			</span>
		</>);
		const div = querySelector(view, "div")!;
		strictEqual(text(div), "a");
	});

	await test("querySelectorAll", { skip: ENV_TYPE === "rvxdom" }, () => {
		const view = render(<>
			<div>a</div>
			<span>
				<div>b</div>
			</span>
		</>);
		const divs = querySelectorAll(view, "div")!;
		deepStrictEqual(divs.map(text), ["a", "b"]);
	});
});
