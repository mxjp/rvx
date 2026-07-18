import { join, relative } from "node:path";
import { brotliCompressSync, gzipSync } from "node:zlib";
import { rolldown } from "rolldown";
import { bundleName, dist, moduleNames, tscOut } from "./common.js";

const license = `
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
`;

const entries = new Map();
for (const moduleName of moduleNames) {
	const moduleDir = join(tscOut, moduleName);
	entries.set(join(moduleDir, "index.js"), { moduleDir, moduleName });
}

for (const [input, { moduleDir, moduleName }] of entries) {
	console.group("bundle:", moduleName);

	const input = join(tscOut, moduleName);
	const bundle = await rolldown({
		input: input,
		logLevel: "info",
		checks: {
			circularDependency: true,
		},
		plugins: [
			{
				async resolveId(source, importer, options) {
					if (importer) {
						const target = await this.resolve(source, importer, options);
						const rel = relative(moduleDir, target.id);
						if (/^\.\.[\\\/]/.test(rel)) {
							const external = entries.get(target.id);
							if (external) {
								return {
									external: true,
									id: `./${bundleName(external.moduleName)}.js`,
								};
							} else {
								throw new Error(`${JSON.stringify(importer)} imports from internal: ${JSON.stringify(source)}`);
							}
						}
					}
				},
			}
		],
	});

	await bundle.write({
		format: "es",
		file: join(dist, bundleName(moduleName) + ".js"),
		postBanner: `/*!${license}*/`,
		sourcemap: true,
	});

	logOutputStats(await bundle.write({
		format: "es",
		file: join(dist, bundleName(moduleName) + ".min.js"),
		minify: true,
		sourcemap: true,
	}));

	console.groupEnd();
}

function logOutputStats({ output }) {
	function kb(bytes) {
		return (bytes / 1000).toFixed(1) + "kb";
	}
	for (const chunk of output) {
		if (chunk.code) {
			console.group(`${chunk.fileName}: ${kb(chunk.code.length)}`);
			if (chunk.fileName.endsWith(".min.js")) {
				console.log("  gzip:", kb(gzipSync(chunk.code).length));
				console.log("brotli:", kb(brotliCompressSync(chunk.code).length));
			}
			console.groupEnd();
		}
	}
}
