import test from "ava";
import { DomVnode, Observable, RenderEngine, State, Subject, Vnode } from "../src";
import { rvx } from "./_rvx";
import { captureErrorContext, CollectionSubject, macro, renderToHtml } from "./_utility";

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

test("renderContent: collection", t => {
	const { context, errors } = captureErrorContext();
	const collection = new CollectionSubject();
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
	const content = new Subject<any>();
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

test("renderAttributes: events (function)", t => {
	let clicked = false;
	const vn: DomVnode = <div on-click={ () => {
		clicked = true;
	} }></div>;
	t.is(renderToHtml(vn)(), `<div></div>`);
	(vn.element as HTMLElement).click();
	t.true(clicked);
});

test("renderAttributes: events (observer)", t => {
	const clicks = new State<Event>();
	const vn: DomVnode = <div on-click={ clicks }></div>;
	t.is(renderToHtml(vn)(), `<div></div>`);
	t.is(clicks.value, undefined);
	(vn.element as HTMLElement).click();
	t.true(clicks.value instanceof MouseEvent);
});

test("renderAttributes: events (observable observer)", t => {
	const a = new State<Event>();
	const b = new State<Event>();
	const channel = new State<State<Event>>(a);
	const vn: DomVnode = <div on-click={ channel.wrap() }></div>;
	t.is(renderToHtml(vn)(), `<div></div>`);
	(vn.element as HTMLElement).click();
	t.true(a.value instanceof MouseEvent);
	t.is(b.value, undefined);
	channel.resolve(b);
	(vn.element as HTMLElement).click();
	t.true(b.value instanceof MouseEvent);
});

test("patchMode: frame", async t => {
	const rvx = new RenderEngine({
		patchMode: "frame"
	});

	const a = new Subject();
	const b = new Subject();
	const c = new Subject();

	const html = renderToHtml([a, b, c], rvx);
	await macro();
	t.is(html(), "");

	a.resolve("a");
	b.resolve("b");
	c.resolve("c");
	await macro();
	t.is(html(), "abc");

	a.resolve(["1", "2"]);
	await macro();
	t.is(html(), "12bc");

	c.resolve(["4", "5"]);
	await macro();
	t.is(html(), "12b45");

	b.resolve("3");
	await macro();
	t.is(html(), "12345");

	a.resolve(null);
	await macro();
	t.is(html(), "345");

	c.resolve(null);
	await macro();
	t.is(html(), "3");

	b.resolve(null);
	await macro();
	t.is(html(), "");
});
