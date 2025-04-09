import { JSDOM } from "jsdom";
import { ENV, onLeak } from "rvx";

ENV.default = new JSDOM().window;

onLeak(() => {
	throw new Error("teardown leak");
});
