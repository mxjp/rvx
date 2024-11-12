import { JSDOM } from "jsdom";
import { onTeardownLeak } from "rvx/test";
import { ENV } from "rvx";

const dom = new JSDOM(`
	<!DOCTYPE html>
	<html lang="en">
		<head>
			<meta charset="UTF-8">
			<title>rvx!</title>
		</head>
		<body></body>
	</html>
`);

ENV.default = dom.window as any;

onTeardownLeak(() => {
	throw new Error("teardown leak");
});
