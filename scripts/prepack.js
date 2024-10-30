import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = join(fileURLToPath(import.meta.url), "../..");
const packageJsonFilename = join(root, "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonFilename));
delete packageJson.scripts;
delete packageJson.devDependencies;
writeFileSync(packageJsonFilename, JSON.stringify(packageJson, null, "\t") + "\n");

for (const path in packageJson.exports) {
	const info = packageJson.exports[path];
	if (path !== "." && info?.default?.endsWith?.(".js")) {
		const code = `export * from ${JSON.stringify(info.default)};\n`;
		writeFileSync(join(root, path + ".js"), code);
		writeFileSync(join(root, path + ".d.ts"), code);
	}
}
