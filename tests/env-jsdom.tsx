import { JSDOM } from "jsdom";
import { ENV } from "rvx";
import { onTeardownLeak } from "rvx/test";

ENV.default = new JSDOM().window;

onTeardownLeak(() => {
	throw new Error("teardown leak");
});
