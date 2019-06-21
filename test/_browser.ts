// tslint:disable: file-name-casing
import * as browserEnv from "browser-env";

browserEnv();

/*
	The following is a replacement for the animation frame api
	to test animation frame patch aggregation easily.
*/
let animationFrameId = 0;
(global as any).requestAnimationFrame = (callback: (time: number) => void) => {
	// tslint:disable-next-line: no-floating-promises
	Promise.resolve().then(() => {
		callback(performance.now());
	});
	return animationFrameId++;
};
