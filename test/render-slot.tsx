import test from "ava";
import rvx, { Observable } from "../src";

const html = (content: string) => `<!--rvx-->${content}<!--/rvx-->`;

test("appendTo", t => {
	const content = new Observable<any>();
	const container = document.createElement("div");
	rvx.appendTo(container, content);
	t.is(container.innerHTML, html(""));

	content.resolve("foo");
	t.is(container.innerHTML, html("foo"));

	content.resolve(["foo", <div>bar</div>]);
	t.is(container.innerHTML, html("foo<div>bar</div>"));
});

test("replace", t => {
	const content = new Observable<any>();
	const container = document.createElement("div");
	const placeholder = document.createElement("div");
	container.appendChild(placeholder);

	rvx.replace(placeholder, content);
	t.is(container.innerHTML, html(""));

	content.resolve("foo");
	t.is(container.innerHTML, html("foo"));

	content.resolve(["foo", <div>bar</div>]);
	t.is(container.innerHTML, html("foo<div>bar</div>"));
});
