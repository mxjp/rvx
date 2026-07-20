# Web Components
Rvx supports using web components just like any other native element.

=== "JSX"
	```jsx
	<some-web-component />
	```

=== "No Build"
	```jsx
	e("some-web-component");
	```

To implement a web component, you can extend the `RvxElement` class which takes care of creating a shadow root and renders content when the element is connected to the document:

=== "JSX"
	```jsx
	import { RvxElement } from "rvx/element";

	class ExampleComponent extends RvxElement {
		render() {
			return <h1>Hello World!</h1>;
		}
	}

	customElements.define("example-component", ExampleComponent);
	```

=== "No Build"
	```jsx
	import { e } from "./rvx.js";
	import { RvxElement } from "./rvx.element.js";

	class ExampleComponent extends RvxElement {
		render() {
			return e("h1").append("Hello World!");
		}
	}

	customElements.define("example-component", ExampleComponent);
	```

## Reflecting Attributes
The `reflect` function can be used to get a signal that reflects an attribute value.

=== "JSX"
	```jsx
	import { RvxElement } from "rvx/element";

	class ExampleCounter extends RvxElement {
		// Allow this component to detect changes to the "count" attribute:
		static observedAttributes = ["count"];

		// Create a signal that reflects the "count" attribute:
		#count = this.reflect("count");

		render() {
			return <button on:click={() => {
				const newCount = Number(this.#count) + 1;

				// Updating the signal will also update the "count" attribute:
				this.#count.value = newCount;

				// Dispatch an event to notify users of your web component:
				this.dispatchEvent(new CustomEvent("count-changed", { detail: newCount }));
			}}>
				Clicked {this.#count} times!
			</button>;
		}

		// Optionally, you can implement property accessors:
		get count() {
			return Number(this.#count.value);
		}
		set count(value: number) {
			this.#count.value = String(value);
		}
	}

	customElements.define("example-counter", ExampleCounter);
	```

=== "No Build"
	```jsx
	import { e } from "./rvx.js";
	import { RvxElement } from "./rvx.element.js";

	class ExampleCounter extends RvxElement {
		// Allow this component to detect changes to the "count" attribute:
		static observedAttributes = ["count"];

		// Create a signal that reflects the "count" attribute:
		#count = this.reflect("count");

		render() {
			return e("button")
				.on("click", () => {
					const newCount = Number(this.#count) + 1;

					// Updating the signal will also update the "count" attribute:
					this.#count.value = newCount;

					// Dispatch an event to notify users of your web component:
					this.dispatchEvent(new CustomEvent("count-changed", { detail: newCount }));
				})
				.append(
					"Clicked ", this.#count, " times!"
				);
		}

		// Optionally, you can implement property accessors:
		get count() {
			return Number(this.#count.value);
		}
		set count(value) {
			this.#count.value = String(value);
		}
	}

	customElements.define("example-counter", ExampleCounter);
	```

## Lifecycle
By default, the component starts rendering in `connectedCallback` and disposes in `disconnectedCallback`.

You can skip this default behavior by overriding the respecitve methods:
```jsx
class ExampleElement extends RvxElement {
	connectedCallback() {}
	disconnectedCallback() {}
}
```

You can always start or dispose the component manually:

=== "JSX"
	```jsx
	const elem = <example-element /> as ExampleElement;

	// Start rendering the component:
	elem.start();

	// Dispose the component:
	elem.dispose();
	```

=== "No Build"
	```jsx
	const elem = e("example-element");

	// Start rendering the component:
	elem.start();

	// Dispose the component:
	elem.dispose();
	```

Note that components can be started and disposed multiple times.

## Shadow DOM
If an open shadow root is attached before rendering, content is attached to that shadow root or the element itself otherwise.
```jsx
class ExampleElement extends RvxElement {
	constructor() {
		super();
		this.attachShadow({ mode: "open" });
	}
}
```
