# Installation

## Npm Package
Rvx is available as an [npm package](https://www.npmjs.com/package/rvx).
```bash
npm i rvx
```

## Buildless Options
Rvx can be used without any build system by directly using one of the es module bundles listed below. Note, that these bundles don't include any JSX related code.

You can find all of these bundles in the [npm package's](#npm-package) `dist/` directory or use one of the CDNs below:

<!-- RVX:MODULES:START -->
_This table is created when building the docs._
<!-- RVX:MODULES:END -->

Note, that the bundles above depend on each other in different ways. Any additional dependencies that may be introduced in the future are considered breaking changes.

## JSX
Rvx provides a react 17 and a legacy JSX runtime.

### TypeScript
To use JSX with typescript, add the following options to your tsconfig:
```js
{
	"compilerOptions": {
		"jsx": "react-jsx",
		"jsxImportSource": "rvx"
	}
}
```

### Babel
When using TypeScript, it is recommended to use the [compiler options](#typescript) specified abvove instead.

If you are using Babel with plain JavaScript, you can use the `@babel/plugin-transform-react-jsx` plugin with the following babel options:
```js
{
	"plugins": [
		[
			"@babel/plugin-transform-react-jsx",
			{
				"runtime": "automatic",
				"importSource": "rvx"
			}
		]
	]
}
```

### esbuild & Vite
When using TypeScript, it is recommended to use the [compiler options](#typescript) specified abvove instead.

If you are using esbuild or vite with plain JavaScript, you can add the options below:
```js
// esbuild.config.mjs
import * as esbuild from "esbuild";

await esbuild.build({
	jsx: "automatic",
	jsxImportSource: "rvx",
});
```
```js
// vite.config.mjs
import { defineConfig } from "vite";

export default defineConfig({
	esbuild: {
		jsx: "automatic",
		jsxImportSource: "rvx",
	},
});
```

### Other Build Systems
Although not documented here, you can also use any other build system that supports JSX.

To use the react 17 runtime (also called "automatic runtime"), use `rvx` as the import source.

To use the legacy runtime, you can manually import the `jsx` factory and the `Fragment` factory or automatically inject it using your build tool:
```js
import { jsx, Fragment } from "rvx/jsx";
```
