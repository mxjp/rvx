import { ENV } from "rvx";
import { RvxWindow } from "rvx/dom";
import { onTeardownLeak } from "rvx/test";

ENV.default = new RvxWindow() as any;

onTeardownLeak(() => {
	throw new Error("teardown leak");
});

(globalThis as any)[Symbol.for("rvx:test:env-type")] = "rvxdom";
