import { deepStrictEqual, strictEqual, throws } from "node:assert";
import test, { suite } from "node:test";
import { htmlEscapeAppendTo, RvxComment, rvxDocument, RvxDocumentFragment, RvxNode, RvxText } from "rvx/dom";

await suite("dom/model", async () => {
	await test("htmlEscape", () => {
		strictEqual(htmlEscapeAppendTo("", ""), "");
		strictEqual(htmlEscapeAppendTo("", "abc"), "abc");
		strictEqual(htmlEscapeAppendTo("&123;", ""), "&123;");
		strictEqual(htmlEscapeAppendTo("&123;", "abc"), "&123;abc");
		strictEqual(htmlEscapeAppendTo("&123;", "&&&"), "&123;&amp;&amp;&amp;");
		strictEqual(htmlEscapeAppendTo("&123;", "\"'<>&\"'<>&"), "&123;&#34;&#39;&lt;&gt;&amp;&#34;&#39;&lt;&gt;&amp;");
		strictEqual(htmlEscapeAppendTo("&123;", "01\"23'45<67>89&ab"), "&123;01&#34;23&#39;45&lt;67&gt;89&amp;ab");
	});

	await suite("tree", async () => {
		type ChildNode = {
			is: RvxNode,
			children?: ChildNode[],
		};

		function assertTree(node: RvxNode, children: ChildNode[]) {
			let index = 0;
			let child = node.firstChild;
			while (child !== null) {
				strictEqual(child, children[index].is);
				if (index === 0) {
					strictEqual(child.previousSibling, null);
					strictEqual(node.firstChild, child);
				} else {
					strictEqual(child.previousSibling?.nextSibling, child);
				}
				if (index === children.length - 1) {
					strictEqual(child.nextSibling, null);
					strictEqual(node.lastChild, child);
				} else {
					strictEqual(child.nextSibling?.previousSibling, child);
				}
				assertTree(child, children[index].children ?? []);
				child = child.nextSibling;
				index++;
			}
			strictEqual(index, children.length);
			if (children.length === 0) {
				strictEqual(node.firstChild, null);
				strictEqual(node.lastChild, null);
			}

			strictEqual(node.hasChildNodes(), children.length > 0);
			strictEqual(node.childNodes.length, children.length);

			const thisArg = {};
			const forEachNodes: RvxNode[] = [];
			node.childNodes.forEach(function (this: unknown, child, index, childNodes) {
				strictEqual(childNodes, node.childNodes);
				strictEqual(this, thisArg);
				strictEqual(forEachNodes.length, index);
				forEachNodes.push(child);
			}, thisArg);

			const iteratorNodes = Array.from(node.childNodes);
			deepStrictEqual(iteratorNodes, children.map(c => c.is));
		}

		function assertRoot(node: RvxNode, children?: ChildNode[]) {
			strictEqual(node.parentNode, null);
			strictEqual(node.previousSibling, null);
			strictEqual(node.nextSibling, null);
			if (children) {
				assertTree(node, children);
			}
		}

		await test("empty node", () => {
			const node = new RvxNode();
			assertRoot(node, []);
		});

		await test("remove non child", () => {
			const parent = new RvxNode();
			const child = new RvxNode();
			throws(() => parent.removeChild(child));
			assertRoot(parent, []);
			assertRoot(child, []);
		});

		await test("append child", () => {
			const parent = new RvxNode();
			const a = new RvxNode();
			strictEqual(parent.appendChild(a), a);
			assertRoot(parent, [
				{ is: a },
			]);
			const b = new RvxNode();
			strictEqual(parent.appendChild(b), b);
			assertRoot(parent, [
				{ is: a },
				{ is: b },
			]);
			strictEqual(parent.appendChild(a), a);
			assertRoot(parent, [
				{ is: b },
				{ is: a },
			]);
			strictEqual(parent.appendChild(a), a);
			assertRoot(parent, [
				{ is: b },
				{ is: a },
			]);
		});

		await test("append from other parent", () => {
			const parentA = new RvxNode();
			const parentB = new RvxNode();
			const child = new RvxNode();
			parentA.appendChild(child);
			assertRoot(parentA, [
				{ is: child },
			]);
			parentB.appendChild(child);
			assertRoot(parentA, []);
			assertRoot(parentB, [
				{ is: child },
			]);
		});

		await test("append empty fragment to empty", () => {
			const parent = new RvxNode();
			const fragment = new RvxDocumentFragment();
			strictEqual(parent.appendChild(fragment), fragment);
			assertRoot(parent, []);
			assertRoot(fragment, []);
		});

		await test("append empty fragment", () => {
			const parent = new RvxNode();
			const a = new RvxNode();
			parent.appendChild(a);
			const fragment = new RvxDocumentFragment();
			strictEqual(parent.appendChild(fragment), fragment);
			assertRoot(parent, [
				{ is: a },
			]);
			assertRoot(fragment, []);
		});

		await test("append fragment to empty", () => {
			const parent = new RvxNode();
			const fragment = new RvxDocumentFragment();
			const a = new RvxNode();
			const b = new RvxNode();
			fragment.appendChild(a);
			fragment.appendChild(b);
			assertRoot(fragment, [
				{ is: a },
				{ is: b },
			]);
			strictEqual(parent.appendChild(fragment), fragment);
			assertRoot(fragment, []);
			assertRoot(parent, [
				{ is: a },
				{ is: b },
			]);
		});

		await test("append fragment", () => {
			const parent = new RvxNode();
			const a = new RvxNode();
			parent.appendChild(a);
			const fragment = new RvxDocumentFragment();
			const b = new RvxNode();
			const c = new RvxNode();
			fragment.appendChild(b);
			fragment.appendChild(c);
			assertRoot(fragment, [
				{ is: b },
				{ is: c },
			]);
			strictEqual(parent.appendChild(fragment), fragment);
			assertRoot(fragment, []);
			assertRoot(parent, [
				{ is: a },
				{ is: b },
				{ is: c },
			]);
		});

		await test("insert child", () => {
			const parent = new RvxNode();
			const ref = new RvxNode();
			parent.appendChild(ref);
			const a = new RvxNode();
			strictEqual(parent.insertBefore(a, ref), a);
			assertRoot(parent, [
				{ is: a },
				{ is: ref },
			]);
			const b = new RvxNode();
			strictEqual(parent.insertBefore(b, ref), b);
			assertRoot(parent, [
				{ is: a },
				{ is: b },
				{ is: ref },
			]);
			strictEqual(parent.insertBefore(a, ref), a);
			assertRoot(parent, [
				{ is: b },
				{ is: a },
				{ is: ref },
			]);
		});

		await test("insert from other parent", () => {
			const parentA = new RvxNode();
			const parentB = new RvxNode();
			const ref = new RvxNode();
			const node = new RvxNode();
			parentA.appendChild(node);
			parentB.appendChild(ref);
			strictEqual(parentB.insertBefore(node, ref), node);
			assertRoot(parentA, []);
			assertRoot(parentB, [
				{ is: node },
				{ is: ref },
			]);
		});

		await test("insert empty fragment", () => {
			const parent = new RvxNode();
			const ref = new RvxNode();
			const fragment = new RvxDocumentFragment();
			parent.appendChild(ref);
			strictEqual(parent.insertBefore(fragment, ref), fragment);
			assertRoot(fragment, []);
			assertRoot(parent, [
				{ is: ref },
			]);
		});

		await test("insert empty fragment behind", () => {
			const parent = new RvxNode();
			const ref = new RvxNode();
			const node = new RvxNode();
			const fragment = new RvxDocumentFragment();
			parent.appendChild(node);
			parent.appendChild(ref);
			strictEqual(parent.insertBefore(fragment, ref), fragment);
			assertRoot(fragment, []);
			assertRoot(parent, [
				{ is: node },
				{ is: ref },
			]);
		});

		await test("insert fragment", () => {
			const parent = new RvxNode();
			const ref = new RvxNode();
			const a = new RvxNode();
			const b = new RvxNode();
			const fragment = new RvxDocumentFragment();
			parent.appendChild(ref);
			fragment.appendChild(a);
			fragment.appendChild(b);
			strictEqual(parent.insertBefore(fragment, ref), fragment);
			assertRoot(fragment, []);
			assertRoot(parent, [
				{ is: a },
				{ is: b },
				{ is: ref },
			]);
		});

		await test("insert fragment behind", () => {
			const parent = new RvxNode();
			const node = new RvxNode();
			const ref = new RvxNode();
			const a = new RvxNode();
			const b = new RvxNode();
			const fragment = new RvxDocumentFragment();
			parent.appendChild(node);
			parent.appendChild(ref);
			fragment.appendChild(a);
			fragment.appendChild(b);
			strictEqual(parent.insertBefore(fragment, ref), fragment);
			assertRoot(fragment, []);
			assertRoot(parent, [
				{ is: node },
				{ is: a },
				{ is: b },
				{ is: ref },
			]);
		});

		await test("replace child", () => {
			const parent = new RvxNode();
			const ref = new RvxNode();
			const node = new RvxNode();
			parent.appendChild(ref);
			strictEqual(parent.replaceChild(node, ref), ref);
			assertRoot(ref, []);
			assertRoot(parent, [
				{ is: node },
			]);
		});

		await test("replace first", () => {
			const parent = new RvxNode();
			const last = new RvxNode();
			const ref = new RvxNode();
			const node = new RvxNode();
			parent.appendChild(ref);
			parent.appendChild(last);
			strictEqual(parent.replaceChild(node, ref), ref);
			assertRoot(ref, []);
			assertRoot(parent, [
				{ is: node },
				{ is: last },
			]);
		});

		await test("replace last", () => {
			const parent = new RvxNode();
			const first = new RvxNode();
			const ref = new RvxNode();
			const node = new RvxNode();
			parent.appendChild(first);
			parent.appendChild(ref);
			strictEqual(parent.replaceChild(node, ref), ref);
			assertRoot(ref, []);
			assertRoot(parent, [
				{ is: first },
				{ is: node },
			]);
		});

		await test("replace middle", () => {
			const parent = new RvxNode();
			const first = new RvxNode();
			const last = new RvxNode();
			const ref = new RvxNode();
			const node = new RvxNode();
			parent.appendChild(first);
			parent.appendChild(ref);
			parent.appendChild(last);
			strictEqual(parent.replaceChild(node, ref), ref);
			assertRoot(ref, []);
			assertRoot(parent, [
				{ is: first },
				{ is: node },
				{ is: last },
			]);
		});

		await test("replace empty fragment", () => {
			const parent = new RvxNode();
			const ref = new RvxNode();
			const fragment = new RvxDocumentFragment();
			parent.appendChild(ref);
			strictEqual(parent.replaceChild(fragment, ref), ref);
			assertRoot(fragment, []);
			assertRoot(ref, []);
			assertRoot(parent, []);
		});

		await test("replace first empty fragment", () => {
			const parent = new RvxNode();
			const last = new RvxNode();
			const ref = new RvxNode();
			const fragment = new RvxDocumentFragment();
			parent.appendChild(ref);
			parent.appendChild(last);
			strictEqual(parent.replaceChild(fragment, ref), ref);
			assertRoot(fragment, []);
			assertRoot(ref, []);
			assertRoot(parent, [
				{ is: last },
			]);
		});

		await test("replace last empty fragment", () => {
			const parent = new RvxNode();
			const first = new RvxNode();
			const ref = new RvxNode();
			const fragment = new RvxDocumentFragment();
			parent.appendChild(first);
			parent.appendChild(ref);
			strictEqual(parent.replaceChild(fragment, ref), ref);
			assertRoot(fragment, []);
			assertRoot(ref, []);
			assertRoot(parent, [
				{ is: first },
			]);
		});

		await test("replace middle empty fragment", () => {
			const parent = new RvxNode();
			const first = new RvxNode();
			const last = new RvxNode();
			const ref = new RvxNode();
			const fragment = new RvxDocumentFragment();
			parent.appendChild(first);
			parent.appendChild(ref);
			parent.appendChild(last);
			strictEqual(parent.replaceChild(fragment, ref), ref);
			assertRoot(fragment, []);
			assertRoot(ref, []);
			assertRoot(parent, [
				{ is: first },
				{ is: last },
			]);
		});

		await test("replace fragment", () => {
			const parent = new RvxNode();
			const ref = new RvxNode();
			const fragment = new RvxDocumentFragment();
			const a = new RvxNode();
			const b = new RvxNode();
			fragment.appendChild(a);
			fragment.appendChild(b);
			parent.appendChild(ref);
			strictEqual(parent.replaceChild(fragment, ref), ref);
			assertRoot(fragment, []);
			assertRoot(ref, []);
			assertRoot(parent, [
				{ is: a },
				{ is: b },
			]);
		});

		await test("replace first fragment", () => {
			const parent = new RvxNode();
			const last = new RvxNode();
			const ref = new RvxNode();
			const fragment = new RvxDocumentFragment();
			const a = new RvxNode();
			const b = new RvxNode();
			fragment.appendChild(a);
			fragment.appendChild(b);
			parent.appendChild(ref);
			parent.appendChild(last);
			strictEqual(parent.replaceChild(fragment, ref), ref);
			assertRoot(fragment, []);
			assertRoot(ref, []);
			assertRoot(parent, [
				{ is: a },
				{ is: b },
				{ is: last },
			]);
		});

		await test("replace last fragment", () => {
			const parent = new RvxNode();
			const first = new RvxNode();
			const ref = new RvxNode();
			const fragment = new RvxDocumentFragment();
			const a = new RvxNode();
			const b = new RvxNode();
			fragment.appendChild(a);
			fragment.appendChild(b);
			parent.appendChild(first);
			parent.appendChild(ref);
			strictEqual(parent.replaceChild(fragment, ref), ref);
			assertRoot(fragment, []);
			assertRoot(ref, []);
			assertRoot(parent, [
				{ is: first },
				{ is: a },
				{ is: b },
			]);
		});

		await test("replace middle fragment", () => {
			const parent = new RvxNode();
			const first = new RvxNode();
			const last = new RvxNode();
			const ref = new RvxNode();
			const fragment = new RvxDocumentFragment();
			const a = new RvxNode();
			const b = new RvxNode();
			fragment.appendChild(a);
			fragment.appendChild(b);
			parent.appendChild(first);
			parent.appendChild(ref);
			parent.appendChild(last);
			strictEqual(parent.replaceChild(fragment, ref), ref);
			assertRoot(fragment, []);
			assertRoot(ref, []);
			assertRoot(parent, [
				{ is: first },
				{ is: a },
				{ is: b },
				{ is: last },
			]);
		});

		await test("remove first child", () => {
			const parent = new RvxNode();
			const a = new RvxNode();
			const b = new RvxNode();
			parent.appendChild(a);
			parent.appendChild(b);
			parent.removeChild(a);
			assertRoot(a, []);
			assertRoot(parent, [
				{ is: b },
			]);
		});

		await test("remove last child", () => {
			const parent = new RvxNode();
			const a = new RvxNode();
			const b = new RvxNode();
			parent.appendChild(a);
			parent.appendChild(b);
			parent.removeChild(b);
			assertRoot(b, []);
			assertRoot(parent, [
				{ is: a },
			]);
		});

		await test("remove middle child", () => {
			const parent = new RvxNode();
			const a = new RvxNode();
			const b = new RvxNode();
			const c = new RvxNode();
			parent.appendChild(a);
			parent.appendChild(b);
			parent.appendChild(c);
			parent.removeChild(b);
			assertRoot(b, []);
			assertRoot(parent, [
				{ is: a },
				{ is: c },
			]);
		});
	});

	await test("node text content", () => {
		const parent = new RvxNode();
		parent.appendChild(new RvxText("foo"));
		parent.appendChild(new RvxComment("bar"));
		parent.appendChild(new RvxText("baz"));
		strictEqual(parent.textContent, "foobaz");
	});

	await test("comment", () => {
		const node = new RvxComment("foo");
		strictEqual(node.nodeType, 8);
		strictEqual(node.textContent, "foo");
		strictEqual(node.outerHTML, `<!--foo-->`);

		node.textContent = "";
		strictEqual(node.textContent, "");
		strictEqual(node.outerHTML, `<!---->`);

		node.textContent = "-->";
		strictEqual(node.textContent, "-->");
		strictEqual(node.outerHTML, `<!---->-->`);
	});

	await test("text", () => {
		const node = new RvxText("foo");
		strictEqual(node.nodeType, 3);
		strictEqual(node.textContent, "foo");

		node.textContent = "\"'<>&";
		strictEqual(node.textContent, "\"'<>&");
		strictEqual(node.outerHTML, "&#34;&#39;&lt;&gt;&amp;");
	});

	await suite("document", async () => {
		await test("owner document", () => {
			strictEqual(new RvxNode().ownerDocument, rvxDocument);
		});

		await test("createTextNode", () => {
			const node = rvxDocument.createTextNode("test");
			strictEqual(node instanceof RvxText, true);
			strictEqual(node.textContent, "test");
		});

		await test("createComment", () => {
			const node = rvxDocument.createComment("test");
			strictEqual(node instanceof RvxComment, true);
			strictEqual(node.textContent, "test");
		});

		await test("createDocumentFragment", () => {
			const node = rvxDocument.createDocumentFragment();
			strictEqual(node instanceof RvxDocumentFragment, true);
			strictEqual(node.childNodes.length, 0);
		})
	});
});
