import { ENV } from "rvx";
import { WINDOW } from "rvx/dom";
import { onTeardownLeak } from "rvx/test";

ENV.default = WINDOW as any;

onTeardownLeak(() => {
	throw new Error("teardown leak");
});

(globalThis as any)[Symbol.for("rvx:test:env-type")] = "rvxdom";
