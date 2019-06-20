import test from "ava";
import rvx, { DomVnode, Observable, Subject, Vnode } from "../src";
import { captureErrorContext, renderToHtml } from "./_utility";

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
	const foo = new Subject<string>();
	const bar = new Subject<string>();
	const baz = new Subject<string>();
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
	const content = new Subject<any>();
	const html = renderToHtml(<div>{ content }</div>);
	t.is(html(), "<div></div>");

	content.resolve("foo");
	t.is(html(), "<div>foo</div>");
});

test("renderContent: node", t => {
	const html = renderToHtml(document.createElement("div"));
	t.is(html(), "<div></div>");
});

// test("renderContent: collection", t => {
// 	const { context, errors } = captureErrorContext();
// 	const patches = new Subject<CollectionPatch<any>>();
// 	const collection = new Collection(patches);
// 	const html = renderToHtml(collection, context);
// 	t.is(html(), "");

// 	patches.resolve({ start: false, end: false, items: [] });
// 	t.is(html(), "");

// 	patches.resolve({ start: false, end: false, items: ["foo", "bar"] });
// 	t.is(html(), "foobar");

// 	patches.resolve({ start: 0, end: 1, items: [] });
// 	t.is(html(), "foobar");

// 	patches.resolve({ start: false, end: 1, items: ["baz"] });
// 	t.is(html(), "bazbar");

// 	patches.resolve({ start: 0, end: false, items: ["foo"] });
// 	t.is(html(), "bazfoo");

// 	patches.resolve({ start: false, end: false, items: ["yee"] });
// 	t.is(html(), "yee");

// 	patches.reject("foo");
// 	t.is(html(), "yee");
// 	t.deepEqual(errors, ["foo"]);

// 	patches.end();
// 	t.is(html(), "");
// });

test("renderContent: observable", t => {
	const { context, errors } = captureErrorContext();
	const content = new Subject<any>();
	const html = renderToHtml(content, context);
	content.resolve("foo");
	t.is(html(), "foo");
	content.reject("bar");
	t.is(html(), "");
	t.deepEqual(errors, ["bar"]);
	content.resolve("baz");
	t.is(html(), "baz");
	content.end();
	t.is(html(), "");
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
	const value = new Subject<any>();
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
