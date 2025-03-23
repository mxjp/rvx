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
	boolean: ["headless", "trace", "trace-all"],
	default: {
		headless: true,
	},
	string: ["only", "snapshot"],
});
const headless = args.headless ?? false;
const traceAll = args["trace-all"] ?? false;
const trace = traceAll ? false : (args.trace ?? false);

const traces = join(ctx, "traces");
if (trace || traceAll) {
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

const browsers = (trace || traceAll) ? [chromium] : [chromium, firefox];

let snapshots = await readdir(join(ctx, "src/snapshots"));
if (args.snapshot) {
	snapshots = snapshots.filter(name => {
		return name.startsWith(args.snapshot);
	});
}

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
		if (traceAll) {
			const path = join(traces, `${runId}-all.json`);
			console.log(`Recording trace: ${path}`);
			await browser.startTracing(page, {
				screenshots: false,
				path,
			});
		}
		for (const benchmark of benchmarks) {
			const benchmarkName = benchmark.replace(/\.js$/, "");
			console.group(benchmarkName);
			if (trace) {
				for (const snapshot of snapshots) {
					await page.goto(`http://127.0.0.1:${server.address().port}/`);
					const path = join(traces, `${runId}-${benchmarkName}.json`);
					console.log(`Recording trace: ${path}`);
					await browser.startTracing(page, {
						screenshots: false,
						path,
					});
					const result = await page.evaluate(args => globalThis[Symbol.for("rvx:benchmark")](args), { benchmark, snapshot });
					await browser.stopTracing();
					console.log(`${snapshot.padStart(snapshotNameLength, " ")}: ${formatSamples(result.samples)}`);
				}
			} else {
				const results = new Map(snapshots.map(s => [s, []]));
				for (const snapshot of [...snapshots, ...snapshots.toReversed(), ...snapshots, ...snapshots.toReversed()]) {
					await page.goto(`http://127.0.0.1:${server.address().port}/`);
					const result = await page.evaluate(args => globalThis[Symbol.for("rvx:benchmark")](args), { benchmark, snapshot });
					results.get(snapshot).push(...result.samples);
				}
				for (const snapshot of snapshots) {
					console.log(`${snapshot.padStart(snapshotNameLength, " ")}: ${formatSamples(results.get(snapshot))}`);
				}
			}
			console.groupEnd();
		}
		if (traceAll) {
			await browser.stopTracing();
		}
	} finally {
		await browser.close();
	}
	console.groupEnd();
}

function formatLarge(value) {
	return Math.round(value).toString().replace(/(\d)(?=(\d{3})+$)/g, "$1_");
}

/**
 * @param {{ duration: number, size: number }[]} samples
 */
function formatSamples(samples) {
	const duration = samples.reduce((a, v) => a + v.duration, 0);
	const ops = samples.map(s => s.size / s.duration);
	const mean = ops.reduce((a, v) => a + v, 0) / ops.length;
	const deviation = Math.sqrt(samples.reduce((a, v, i) => a + ((ops[i] - mean) ** 2) * v.duration / duration, 0));
	return `${formatLarge(mean)}/s ±${Number((deviation / mean * 100).toFixed(1))}%`;
}
