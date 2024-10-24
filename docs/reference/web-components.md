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
	import { RvxElement, e } from "./rvx.js";

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
	import { RvxElement, e } from "./rvx.js";

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

## Manual Implementation
Due to it's simple lifecycle system, you can also implement web components manually:

=== "JSX"
	```jsx
	import { mount, capture, teardown, TeardownHook } from "rvx";

	class ExampleComponent extends HTMLElement {
		#dispose?: TeardownHook;

		constructor() {
			super();
			this.attachShadow({ mode: "open" });
		}

		connectedCallback() {
			this.#dispose = capture(() => {
				// Create and append content to the shadow root:
				const view = mount(
					this.shadowRoot,
					<h1>Hello World!</h1>,
				);

				// Remove content from the shadow root when disposed:
				teardown(() => view.detach());
			});
		}

		disconnectedCallback() {
			// Run teardown hooks:
			this.#dispose?.();
			this.#dispose = undefined;
		}
	}
	```

=== "No Build"
	```jsx
	import { mount, capture, teardown, TeardownHook, e } from "./rvx.js";

	class ExampleComponent extends HTMLElement {
		#dispose?: TeardownHook;

		constructor() {
			super();
			this.attachShadow({ mode: "open" });
		}

		connectedCallback() {
			this.#dispose = capture(() => {
				// Create and append content to the shadow root:
				const view = mount(
					this.shadowRoot,
					e("h1").append("Hello World!"),
				);

				// Remove content from the shadow root when disposed:
				teardown(() => view.detach());
			});
		}

		disconnectedCallback() {
			// Run teardown hooks:
			this.#dispose?.();
			this.#dispose = undefined;
		}
	}
	```
