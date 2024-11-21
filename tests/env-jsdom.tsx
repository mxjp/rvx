import { JSDOM } from "jsdom";
import { onTeardownLeak } from "rvx/test";
import { ENV } from "rvx";

const dom = new JSDOM();

ENV.default = dom.window as any;

onTeardownLeak(() => {
	throw new Error("teardown leak");
});
