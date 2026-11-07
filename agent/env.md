# Environment
Rvx accesses all browser APIs through the `ENV` context which provides a window-like object. Imported from `rvx`.

## rvx/dom
Fast minimal DOM implementation with the single purpose of rendering HTML strings on the server or during a build process.
+ `renderToString(component, props?)` - Render a component to HTML.
+ `await renderToStringAsync(component, props?)` - Render a component to HTML waiting for pending `ASYNC` contexts to complete.
+ `WINDOW` - The default rvx dom window object.
+ `VISIBLE_COMMENTS` - Context for controlling if comment nodes are visible in rendered HTML.
+ `isRvxDom()` - Check if `ENV.current` is an rvx dom window object.

### Browser APIs
See [rvx-dom-api.txt](./rvx-dom-api.txt) for a list of supported browser APIs.

+ `new RawHTML(html)` - Non standard node to represent raw inner HTML (node name `#rvx-dom-raw-html`).
+ `element.innerHTML` - Setting a non-empty string replaces all children with a single `RawHTML` node. Parsing is not supported.
+ All DOM event related APIs are no-ops.
+ `node.dispatchEvent` exists but throws an error at runtime.

## Notes
+ `rvx/element` captures the global default at module load time. Set `ENV.default` before importing it in non-browser environments.
+ See [`docs/reference/environments.md`](../docs/reference/environments.md) for details.
