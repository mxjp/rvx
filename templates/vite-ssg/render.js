import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { renderToStringAsync } from "rvx/dom";
import { MemoryRouter, ROUTER } from "rvx/router";

const ctx = dirname(fileURLToPath(import.meta.url));
const dist = join(ctx, "dist");

const { prerender, App } = await import(pathToFileURL(join(dist, "app/app.js")).toString());
const indexHtml = await readFile(join(dist, "client/index.html"), "utf-8");

await cp(join(dist, "client"), join(dist, "static"), { recursive: true, force: true });

for (const path of prerender) {
	console.log("Rendering", JSON.stringify(path));
	const outFile = join(dist, "static", path, ...(path.endsWith(".html") ? [] : ["index.html"]));
	const html = await renderToStringAsync(() => {
		return ROUTER.inject(new MemoryRouter({ path }), App);
	});
	await mkdir(dirname(outFile), { recursive: true });
	await writeFile(outFile, indexHtml.replace("<!--app-->", "<!--app-start-->" + html + "<!--app-end-->"));
}
