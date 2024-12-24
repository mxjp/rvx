# Installation

## Buildless Options
Rvx can be used without any build system by directly using one of the es module bundles listed below. Note, that these bundles don't include any JSX related code.

You can find all of these bundles in the [npm package's](#npm-package) `dist/` directory or use one of the CDNs below:

=== "unpkg.com"
	| Modules | Human Readable | Minified | Types |
	|-|-|-|-|
	| Core | [rvx.js](https://unpkg.com/rvx/dist/rvx.js) | [rvx.min.js](https://unpkg.com/rvx/dist/rvx.min.js) | [rvx.d.ts](https://unpkg.com/rvx/dist/rvx.d.ts) |
	| All | [rvx.all.js](https://unpkg.com/rvx/dist/rvx.all.js) | [rvx.all.min.js](https://unpkg.com/rvx/dist/rvx.all.min.js) | [rvx.all.d.ts](https://unpkg.com/rvx/dist/rvx.all.d.ts) |

=== "jsdelivr.com"
	| Modules | Human Readable | Minified | Types |
	|-|-|-|-|
	| Core | [rvx.js](https://cdn.jsdelivr.net/npm/rvx/dist/rvx.js) | [rvx.min.js](https://cdn.jsdelivr.net/npm/rvx/dist/rvx.min.js) | [rvx.d.ts](https://cdn.jsdelivr.net/npm/rvx/dist/rvx.d.ts) |
	| All | [rvx.all.js](https://cdn.jsdelivr.net/npm/rvx/dist/rvx.all.js) | [rvx.all.min.js](https://cdn.jsdelivr.net/npm/rvx/dist/rvx.all.min.js) | [rvx.all.d.ts](https://cdn.jsdelivr.net/npm/rvx/dist/rvx.all.d.ts) |

If none of these fit your needs, you can [create a custom bundle](#custom-bundles).

## Npm Package
Rvx is available as an [npm package](https://www.npmjs.com/package/rvx).
```bash
npm i rvx
```

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

### Custom Bundles
If the bundles above don't fit your needs, you can build a custom bundle that only includes the modules you need:
```bash
git clone https://github.com/mxjp/rvx
cd rvx

npm ci
npm run build
node scripts/bundle.js [...args]

# Bundle "core" and "async" into "./custom.js", "./custom.min.js" and "./custom.d.ts":
node scripts/bundle.js -m core async -o ./custom
```

+ `--modules | -m <...modules>`
	+ Specify what modules to include.
	+ This can be any directory or filename that exists in the [src](https://github.com/mxjp/rvx/tree/main/src) directory without file extension.
	+ Default is `core`
+ `--output | -o <path>`
	+ Specify the output path of the bundle without extension.
	+ Default is `./dist/rvx.custom`
+ `--no-readable` - Skip generating the human readable bundle.
+ `--no-minified` - Skip generating the minified bundle.
+ `--no-types` - Skip generating the type definition bundle.
+ `--no-license` - Omit the license banner. The license banner is always omitted from minified bundles.
