import { deepStrictEqual, strictEqual, throws } from "node:assert";
import test, { suite } from "node:test";
import { htmlEscapeAppendTo, RvxNode } from "rvx/dom";

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

		await test("remove first child", () => {
			const parent = new RvxNode();
			const a = new RvxNode();
			const b = new RvxNode();
			parent.appendChild(a);
			parent.appendChild(b);
			parent.removeChild(a);
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
			assertRoot(parent, [
				{ is: a },
				{ is: c },
			]);
		});
	});
});
