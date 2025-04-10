import { join } from "node:path";
import { bundleName, importName, moduleNames, root } from "./common.js";
import { readFile, writeFile } from "node:fs/promises";

const filename = join(root, "docs/installation.md");
const markdown = await readFile(filename, "utf-8");

const START = "<!-- RVX:MODULES:START -->";
const END = "<!-- RVX:MODULES:END -->";

const start = markdown.indexOf(START);
const end = markdown.indexOf(END);
if (start < 0 || end < 0) {
	throw new Error("missing module marker");
}

function * createBundleTable(getUrl) {
	yield `| Npm Module | Human Readable | Minified | Types |`;
	yield `|-|-|-|-|`;

	for (const moduleName of moduleNames) {
		const name = bundleName(moduleName);
		yield `| ${importName(moduleName)} | [${name}.js](${getUrl(name + ".js")}) | [${name}.min.js](${getUrl(name + ".min.js")}) | [${name}.d.ts](${getUrl(name + ".d.ts")}) |`;
	}
}

function * indent(str, lines) {
	for (const line of lines) {
		yield str + line;
	}
}

const lines = [
	`=== "unpkg.com"`,
	...indent("\t", createBundleTable(file => `https://unpkg.com/rvx/dist/${file}`)),
	"",
	`=== "jsdelivr.com"`,
	...indent("\t", createBundleTable(file => `https://cdn.jsdelivr.net/npm/rvx/dist/${file}`)),
];

await writeFile(filename, markdown.slice(0, start + START.length) + "\n" + lines.join("\n") + "\n" + markdown.slice(end));
