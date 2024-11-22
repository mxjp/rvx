import { ENV } from "rvx";
import { WINDOW } from "rvx/dom";
import { onTeardownLeak } from "rvx/test";

ENV.default = WINDOW;

onTeardownLeak(() => {
	throw new Error("teardown leak");
});
