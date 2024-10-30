#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { access, copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import yargsParser from "yargs-parser";

const ctx = dirname(fileURLToPath(import.meta.url));
const repo = join(ctx, "..");
const snapshots = join(ctx, "src/snapshots");

const args = yargsParser(process.argv.slice(2));

if (args.build ?? true) {
	await Promise.all([
		exec(repo, "npm run build:es"),
		exec(repo, "npm run build:types"),
	]);
}
if (args.bundle ?? true) {
	await exec(repo, "npm run build:bundle:all");
}

await mkdir(snapshots, { recursive: true });

const baseExists = await access(join(snapshots, "base.js")).then(() => true, () => false);
const name = args.name ?? (baseExists ? "update" : "base");
if (typeof name !== "string" || !/^[a-z0-9\-]+$/.test(name)) {
	throw new Error("invalid name");
}

await copyFile(join(repo, "dist/rvx.all.js"), join(snapshots, `${name}.js`));

function exec(cwd, command) {
	return new Promise((resolve, reject) => {
		const proc = spawn(command, { cwd, shell: true, stdio: "inherit" });
		proc.on("error", reject);
		proc.on("exit", (code, signal) => {
			if (code || signal) {
				reject(new Error(`Command failed: ${code || signal}`));
			} else {
				resolve();
			}
		});
	});
}
