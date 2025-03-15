import type { StyleValue } from "../element-common.js";
import { watch } from "../signals.js";

type StyleHandler = (name: string, value: unknown) => void;

function watchStyle(value: StyleValue, handler: StyleHandler): void {
	watch(value, value => {
		if (Array.isArray(value)) {
			const overwrites: string[][] = [];
			for (let i = value.length - 1; i >= 0; i--) {
				const self: string[] = [];
				overwrites[i] = self;
				watchStyle(value[i], (name, value) => {
					if (!self.includes(name)) {
						self.push(name);
					}
					for (let o = i + 1; o < overwrites.length; o++) {
						if (overwrites[o].includes(name)) {
							return;
						}
					}
					handler(name, value);
				});
			}
		} else if (value) {
			for (const name in value) {
				watch(value[name]!, value => handler(name, value));
			}
		}
	});
}

export function setStyle(elem: Element, value: StyleValue): void {
	const style = (elem as HTMLElement).style;
	watchStyle(value, (name, value) => style.setProperty(name, value ? String(value) : null));
}
