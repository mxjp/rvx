
export function polyfillAnimationFrames(): void {
	if (globalThis.requestAnimationFrame!) {
		return;
	}
	let nextHandle = 0;
	const handles = new Map<number, number | NodeJS.Timeout>();
	globalThis.requestAnimationFrame = (callback: FrameRequestCallback) => {
		const handle = nextHandle++;
		handles.set(handle, setTimeout(() => {
			handles.delete(handle);
			callback(performance.now());
		}, 0));
		return handle;
	};
	globalThis.cancelAnimationFrame = handle => {
		const timer = handles.get(handle);
		if (timer !== undefined) {
			handles.delete(handle);
			clearTimeout(timer);
		}
	};
}
