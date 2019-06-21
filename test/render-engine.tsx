import test from "ava";
import { Collection, DomVnode, Observable, RenderEngine, Vnode } from "../src";
import { rvx } from "./_rvx";
import { captureErrorContext, microtick, renderToHtml } from "./_utility";

test("create dom vnode", t => {
	const vnode: Vnode = <div foo="bar">baz</div>;
	t.true(vnode instanceof DomVnode);
	t.deepEqual(vnode.props, { foo: "bar" });
	t.deepEqual(vnode.children, ["baz"]);
	t.is(vnode.engine, rvx);
});

test("create custom vnode", t => {
	class CustomNode extends Vnode<{ foo: string }> {
		protected render() { }
	}

	const vnode: Vnode = <CustomNode foo="bar">baz</CustomNode>;
	t.true(vnode instanceof CustomNode);
	t.deepEqual(vnode.props, { foo: "bar" });
	t.deepEqual(vnode.children, ["baz"]);
	t.is(vnode.engine, rvx);
});

test("renderContent: array", t => {
	const foo = new Observable<string>();
	const bar = new Observable<string>();
	const baz = new Observable<string>();
	const html = renderToHtml([foo, bar, baz]);
	t.is(html(), "");

	foo.resolve("foo");
	t.is(html(), "foo");

	baz.resolve("baz");
	t.is(html(), "foobaz");

	bar.resolve("bar");
	t.is(html(), "foobarbaz");
});

test("renderContent: vnode", t => {
	const content = new Observable<any>();
	const html = renderToHtml(<div>{ content }</div>);
	t.is(html(), "<div></div>");

	content.resolve("foo");
	t.is(html(), "<div>foo</div>");
});

test("renderContent: node", t => {
	const html = renderToHtml(document.createElement("div"));
	t.is(html(), "<div></div>");
});

test("renderContent: collection", t => {
	const { context, errors } = captureErrorContext();
	const collection = new Collection();
	const html = renderToHtml(collection, rvx, context);
	t.is(html(), "");

	collection.resolve({ start: 0, count: 0, items: [] });
	t.is(html(), "");

	collection.resolve({ start: 0, count: 0, items: ["foo", "bar"] });
	t.is(html(), "foobar");

	collection.resolve({ start: 0, count: 1, items: ["baz"] });
	t.is(html(), "bazbar");

	collection.resolve({ start: 1, count: 1, items: ["foo"] });
	t.is(html(), "bazfoo");

	collection.resolve({ start: 1, count: 0, items: ["bar"] });
	t.is(html(), "bazbarfoo");

	collection.reject("foo");
	t.is(html(), "bazbarfoo");
	t.deepEqual(errors, ["foo"]);

	collection.resolve({ start: 0, count: 3, items: [] });
	t.is(html(), "");
});

test("renderContent: observable", t => {
	const { context, errors } = captureErrorContext();
	const content = new Observable<any>();
	const html = renderToHtml(content, rvx, context);
	content.resolve("foo");
	t.is(html(), "foo");
	content.reject("bar");
	t.is(html(), "");
	t.deepEqual(errors, ["bar"]);
	content.resolve("baz");
	t.is(html(), "baz");
});

test("renderContent: primitives", t => {
	t.is(renderToHtml(null)(), "");
	t.is(renderToHtml(undefined)(), "");
	t.is(renderToHtml(NaN)(), "");
	t.is(renderToHtml("foo")(), "foo");
	t.is(renderToHtml(42)(), "42");
	t.is(renderToHtml(BigInt(42))(), "42");
	t.is(renderToHtml(true)(), "true");
	t.is(renderToHtml(false)(), "false");
});

test("renderAttributes: observable", t => {
	const value = new Observable<any>();
	const html = renderToHtml(<div foo={ value }></div>);
	t.is(html(), "<div></div>");

	value.resolve("bar");
	t.is(html(), `<div foo="bar"></div>`);

	value.resolve(Observable.value("baz"));
	t.is(html(), `<div foo="baz"></div>`);
});

test("renderAttributes: primitives", t => {
	t.is(renderToHtml(<div foo={ null }></div>)(), `<div></div>`);
	t.is(renderToHtml(<div foo={ undefined }></div>)(), `<div></div>`);
	t.is(renderToHtml(<div foo={ NaN }></div>)(), `<div></div>`);
	t.is(renderToHtml(<div foo="bar"></div>)(), `<div foo="bar"></div>`);
	t.is(renderToHtml(<div foo={ 42 }></div>)(), `<div foo="42"></div>`);
	t.is(renderToHtml(<div foo={ BigInt(42) }></div>)(), `<div foo="42"></div>`);
	t.is(renderToHtml(<div foo={ true }></div>)(), `<div foo=""></div>`);
	t.is(renderToHtml(<div foo={ false }></div>)(), `<div></div>`);
});

test("async patch mode", async t => {
	const rvx = new RenderEngine();
	t.is(rvx.patchMode, "async");

	const a = new Observable();
	const b = new Observable();

	const html = renderToHtml([a, b], rvx);
	await microtick();
	t.is(html(), "");
});
