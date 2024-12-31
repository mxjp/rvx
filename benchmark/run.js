#!/usr/bin/env node
import express from "express";
import { mkdir, readdir } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, firefox } from "playwright";
import yargsParser from "yargs-parser";

const ctx = dirname(fileURLToPath(import.meta.url));
const args = yargsParser(process.argv.slice(2), {
	boolean: ["headless", "extended", "trace"],
	default: {
		headless: true,
	},
	string: ["only"],
});
const extended = args.extended ?? false;
const headless = args.headless ?? false;
const trace = args.trace ?? false;

const traces = join(ctx, "traces");
if (trace) {
	await mkdir(traces, { recursive: true });
}

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

const browsers = trace ? [chromium] : [chromium, firefox];

const snapshots = await readdir(join(ctx, "src/snapshots"));
const snapshotNameLength = Math.max(...snapshots.map(s => s.length));

let benchmarks = await readdir(join(ctx, "src/benchmarks"));
if (args.only) {
	const filter = args.only;
	benchmarks = benchmarks.filter(name => {
		return name.startsWith(filter);
	});
}

const runId = Math.floor(Date.now() / 1000);

for (const browserDef of browsers) {
	console.group(browserDef.name());
	const browser = await browserDef.launch({ headless });
	try {
		const page = await browser.newPage();
		page.on("console", msg => console.log("[client]", msg.text()));
		for (const benchmark of benchmarks) {
			const benchmarkName = benchmark.replace(/\.js$/, "");
			try {
				console.group(benchmarkName);
				if (trace) {
					const path = join(traces, `${runId}-${benchmarkName}.json`);
					console.log(`Recording trace: ${path}`);
					await browser.startTracing(page, {
						screenshots: false,
						path,
					});
				}
				await page.goto(`http://127.0.0.1:${server.address().port}/`);
				const { entries, tries } = await page.evaluate(args => globalThis[Symbol.for("rvx:benchmark")](args), { benchmark, snapshots, extended });
				console.log(`${entries[0].length} samples (${tries - entries[0].length} warmup)`);
				for (let i = 0; i < snapshots.length; i++) {
					const samples = entries[i];
					const ops = samples.map(r => 1000 * r.size / r.duration);
					const average = ops.reduce((a, s) => a + s, 0) / ops.length;
					const span = Math.max(...ops) - Math.min(...ops);
					const spanPercent = 100 * span / average;
					console.log(`  => ${snapshots[i].padStart(snapshotNameLength, " ")}: ${Math.round(average)} ops/s (±${Number(spanPercent.toFixed(2))}%, ${samples.length} samples)`);
				}
				if (trace) {
					await browser.stopTracing();
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
