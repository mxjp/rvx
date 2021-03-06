import test from "ava";
import { Subject } from "../src";
import { rvx } from "./_rvx";

const html = (content: string) => `<!--rvx-->${content}<!--/rvx-->`;

test("appendTo", t => {
	const content = new Subject<any>();
	const container = document.createElement("div");
	rvx.appendTo(container, content);
	t.is(container.innerHTML, html(""));

	content.resolve("foo");
	t.is(container.innerHTML, html("foo"));

	content.resolve(["foo", <div>bar</div>]);
	t.is(container.innerHTML, html("foo<div>bar</div>"));
});

test("replace", t => {
	const content = new Subject<any>();
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
