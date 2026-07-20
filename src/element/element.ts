import { $, capture, Content, ENV, leak, render, Signal, TeardownHook, watchUpdates } from "../core/index.js";

const moduleEnv = ENV.current;

export abstract class RvxElement extends moduleEnv.HTMLElement {
	static observedAttributes?: string[];

	#signals = new Map<string, Signal<string | null>>();
	#dispose?: TeardownHook;

	/**
	 * Called to render the content of this element.
	 *
	 * @returns The content to attach to this element or the shadow root if it exists.
	 */
	abstract render(): Content;

	/**
	 * Get a signal that reflects an attribute value.
	 *
	 * + `null` represents a missing attribute.
	 * + This signal is only updated if the name is part of the static `observedAttributes` array.
	 * + Updating the signal value will also update or remove the attribute.
	 * + This signal will be kept alive until neither this element nor the signal is referenced anymore.
	 *
	 * @param name The attribute name.
	 * @returns The signal.
	 */
	reflect(name: string): Signal<string | null> {
		let signal = this.#signals.get(name);
		if (signal === undefined) {
			signal = $(this.getAttribute(name));
			this.#signals.set(name, signal);
			leak(() => {
				watchUpdates(signal!, value => {
					if (value === null) {
						this.removeAttribute(name);
					} else {
						this.setAttribute(name, value);
					}
				});
			});
		}
		return signal;
	}

	/**
	 * Manually initialize this element.
	 *
	 * This has no effect if the element is already initialized.
	 */
	start(): void {
		if (this.#dispose === undefined) {
			this.#dispose = capture(() => {
				ENV.provide(moduleEnv, () => {
					const view = render(this.render());
					const parent = this.shadowRoot ?? this;
					parent.innerHTML = "";
					view.appendTo(parent);
				});
			});
		}
	}

	/**
	 * Manually dispose this element.
	 *
	 * This will leave rendered content as is.
	 */
	dispose(): void {
		this.#dispose?.();
		this.#dispose = undefined;
	}

	connectedCallback() {
		this.start();
	}

	disconnectedCallback() {
		this.dispose();
	}

	attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
		const signal = this.#signals.get(name);
		if (signal !== undefined) {
			signal.value = newValue;
		}
	}
}
