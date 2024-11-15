import { JSDOM } from "jsdom";

const dom = new JSDOM(`
	<!DOCTYPE html>
	<html lang="en">
		<head>
			<meta charset="UTF-8">
			<title>rvx!</title>
		</head>
		<body></body>
	</html>
`);

for (const key of [
	"Comment",
	"customElements",
	"CustomEvent",
	"document",
	"DocumentFragment",
	"Element",
	"HTMLDivElement",
	"HTMLElement",
	"MouseEvent",
	"Node",
	"Range",
	"Text",
	"window",
]) {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	(globalThis as any)[key] = dom.window[key];
}

const { onTeardownLeak } = await import("rvx/test");

onTeardownLeak(() => {
	throw new Error("teardown leak");
});

(globalThis as any)[Symbol.for("rvx:test:env-type")] = "jsdom-global";
