import { ENV, onLeak } from "rvx";
import { WINDOW } from "rvx/dom";

ENV.default = WINDOW;

onLeak(() => {
	throw new Error("teardown leak");
});
