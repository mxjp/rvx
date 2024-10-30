#!/usr/bin/env node
import express from "express";
import { readdir } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, firefox } from "playwright";
import yargsParser from "yargs-parser";

const ctx = dirname(fileURLToPath(import.meta.url));
const args = yargsParser(process.argv.slice(2));
const headless = args.headless ?? false;

const app = express();
app.use((_req, res, next) => {
	// Required for high timing precision:
	res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
	res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
	next();
});
app.get("/favicon.ico", (_req, res) => {
	res.end();
});
app.use("/", express.static(join(ctx, "src")));

const server = await new Promise((resolve, reject) => {
	const server = createServer(app);
	server.unref();
	server.listen(0, "127.0.0.1", () => resolve(server));
	server.on("error", reject);
});

const browsers = [chromium, firefox];

const snapshots = await readdir(join(ctx, "src/snapshots"));
const snapshotNameLength = Math.max(...snapshots.map(s => s.length));

const benchmarks = await readdir(join(ctx, "src/benchmarks"));

for (const browserDef of browsers) {
	console.group(browserDef.name());
	const browser = await browserDef.launch({ headless });
	try {
		const page = await browser.newPage();
		page.on("console", msg => console.log("[client]", msg.text()));
		for (const benchmark of benchmarks) {
			try {
				console.group(benchmark);
				await page.goto(`http://127.0.0.1:${server.address().port}/`);
				const { entries, tries } = await page.evaluate(args => globalThis[Symbol.for("rvx:benchmark")](args), { benchmark, snapshots });
				console.log(`${entries[0].length} samples (${tries - entries[0].length} warmup)`);
				for (let i = 0; i < snapshots.length; i++) {
					const ops = entries[i].map(r => 1000 * r.size / r.duration);
					const average = ops.reduce((a, s) => a + s, 0) / ops.length;
					const span = Math.max(...ops) - Math.min(...ops);
					const spanPercent = 100 * span / average;
					console.log(`  => ${snapshots[i].padStart(snapshotNameLength, " ")}: ${Math.round(average)} ops/s (±${Number(spanPercent.toFixed(2))}%)`);
				}
			} finally {
				console.groupEnd();
			}
		}
	} finally {
		await browser.close();
	}
	console.groupEnd();
}
