import { defineConfig } from "vite";

export default defineConfig({
	build: {
		target: "esnext",
	},
	esbuild: {
		jsx: "automatic",
		jsxImportSource: "rvx",
	},
});
