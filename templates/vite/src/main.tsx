import { leak, mount } from "rvx";

leak(() => {
	mount(
		document.body,
		<h1>Hello World!</h1>
	);
});
