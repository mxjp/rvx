import { ENV } from "../core/env.js";
import { capture, TeardownHook, uncapture } from "../core/lifecycle.js";
import { render } from "../core/render.js";
import { sig, Signal, watchUpdates } from "../core/signals.js";

export type StartTrigger = "on-connect" | "manual";
export type DisposeTrigger = "on-disconnect" | "manual";

export interface RvxElementOptions {
	/**
	 * Shadow root options to use or false to attach content to the element directly.
	 *
	 * By default and when `true`, an open shadow root is attached immediately.
	 */
	shadow?: boolean | ShadowRootInit;

	/**
	 * When to render this element's content.
	 *
	 * + `on-connect` - Default. Render when this element is connected.
	 * + `manual` - Render only when `.start()` is called.
	 */
	start?: StartTrigger;

	/**
	 * When to dispose this element's content.
	 *
	 * + `on-disconnect` - Default. Dispose when this element is disconnected or when `.dispose()` is called.
	 * + `manual` - Dispose only when `.dispose()` is called.
	 */
	dispose?: DisposeTrigger;
}

const moduleEnv = ENV.current;

export abstract class RvxElement extends moduleEnv.HTMLElement {
	static observedAttributes?: string[];

	#signals = new Map<string, Signal<string | null>>();
	#startTrigger: StartTrigger;
	#disposeTrigger: DisposeTrigger;
	#shadow?: ShadowRoot;
	#dispose?: TeardownHook;

	constructor(options?: RvxElementOptions) {
		super();

		this.#startTrigger = options?.start ?? "on-connect";
		this.#disposeTrigger = options?.dispose ?? "on-disconnect";

		const shadowInit = (options?.shadow === true ? undefined : options?.shadow) ?? { mode: "open" };
		if (shadowInit !== false) {
			this.#shadow = this.attachShadow(shadowInit);
		}
	}

	/**
	 * Called to render the content of this element.
	 *
	 * @returns The content to attach to this element or the shadow root if it exists.
	 */
	abstract render(): unknown;

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
			signal = sig(this.getAttribute(name));
			this.#signals.set(name, signal);
			uncapture(() => {
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
				ENV.inject(moduleEnv, () => {
					(this.#shadow ?? this).replaceChildren(render(this.render()).take());
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

	connectedCallback(): void {
		if (this.#startTrigger === "on-connect") {
			this.start();
		}
	}

	disconnectedCallback(): void {
		if (this.#disposeTrigger === "on-disconnect") {
			this.dispose();
		}
	}

	attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
		const signal = this.#signals.get(name);
		if (signal !== undefined) {
			signal.value = newValue;
		}
	}
}
