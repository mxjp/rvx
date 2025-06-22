import { deepStrictEqual, strictEqual, throws } from "node:assert";
import test, { suite } from "node:test";
import { HTML, MATHML, SVG } from "rvx";
import { Comment, Document, DocumentFragment, Element, Node, RawHTML, Text, VISIBLE_COMMENTS, Window } from "rvx/dom";

await suite("dom/model", async () => {
	await suite("tree", async () => {
		type ChildNode = {
			is: Node,
			children?: ChildNode[],
		};

		function assertTree(node: Node, children: ChildNode[]) {
			let index = 0;
			let child = node.firstChild;
			while (child !== null) {
				strictEqual(child.parentNode, node);
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
			const forEachNodes: Node[] = [];
			node.childNodes.forEach(function (this: unknown, child, index, childNodes) {
				strictEqual(childNodes, node.childNodes);
				strictEqual(this, thisArg);
				strictEqual(forEachNodes.length, index);
				forEachNodes.push(child);
			}, thisArg);

			const iteratorNodes = Array.from(node.childNodes);
			deepStrictEqual(iteratorNodes, children.map(c => c.is));
		}

		function assertRoot(node: Node, children?: ChildNode[]) {
			strictEqual(node.parentNode, null);
			strictEqual(node.previousSibling, null);
			strictEqual(node.nextSibling, null);
			if (children) {
				assertTree(node, children);
			}
		}

		await test("empty node", () => {
			const node = new Node();
			assertRoot(node, []);
		});

		await test("remove non child", () => {
			const parent = new Node();
			const child = new Node();
			throws(() => parent.removeChild(child));
			assertRoot(parent, []);
			assertRoot(child, []);
		});

		await test("append child", () => {
			const parent = new Node();
			const a = new Node();
			strictEqual(parent.appendChild(a), a);
			assertRoot(parent, [
				{ is: a },
			]);
			const b = new Node();
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
			const parentA = new Node();
			const parentB = new Node();
			const child = new Node();
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
			const parent = new Node();
			const fragment = new DocumentFragment();
			strictEqual(parent.appendChild(fragment), fragment);
			assertRoot(parent, []);
			assertRoot(fragment, []);
		});

		await test("append empty fragment", () => {
			const parent = new Node();
			const a = new Node();
			parent.appendChild(a);
			const fragment = new DocumentFragment();
			strictEqual(parent.appendChild(fragment), fragment);
			assertRoot(parent, [
				{ is: a },
			]);
			assertRoot(fragment, []);
		});

		await test("append fragment to empty", () => {
			const parent = new Node();
			const fragment = new DocumentFragment();
			const a = new Node();
			const b = new Node();
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
			const parent = new Node();
			const a = new Node();
			parent.appendChild(a);
			const fragment = new DocumentFragment();
			const b = new Node();
			const c = new Node();
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
			const parent = new Node();
			const ref = new Node();
			parent.appendChild(ref);
			const a = new Node();
			strictEqual(parent.insertBefore(a, ref), a);
			assertRoot(parent, [
				{ is: a },
				{ is: ref },
			]);
			const b = new Node();
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
			const parentA = new Node();
			const parentB = new Node();
			const ref = new Node();
			const node = new Node();
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
			const parent = new Node();
			const ref = new Node();
			const fragment = new DocumentFragment();
			parent.appendChild(ref);
			strictEqual(parent.insertBefore(fragment, ref), fragment);
			assertRoot(fragment, []);
			assertRoot(parent, [
				{ is: ref },
			]);
		});

		await test("insert empty fragment behind", () => {
			const parent = new Node();
			const ref = new Node();
			const node = new Node();
			const fragment = new DocumentFragment();
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
			const parent = new Node();
			const ref = new Node();
			const a = new Node();
			const b = new Node();
			const fragment = new DocumentFragment();
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
			const parent = new Node();
			const node = new Node();
			const ref = new Node();
			const a = new Node();
			const b = new Node();
			const fragment = new DocumentFragment();
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
			const parent = new Node();
			const ref = new Node();
			const node = new Node();
			parent.appendChild(ref);
			strictEqual(parent.replaceChild(node, ref), ref);
			assertRoot(ref, []);
			assertRoot(parent, [
				{ is: node },
			]);
		});

		await test("replace first", () => {
			const parent = new Node();
			const last = new Node();
			const ref = new Node();
			const node = new Node();
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
			const parent = new Node();
			const first = new Node();
			const ref = new Node();
			const node = new Node();
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
			const parent = new Node();
			const first = new Node();
			const last = new Node();
			const ref = new Node();
			const node = new Node();
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
			const parent = new Node();
			const ref = new Node();
			const fragment = new DocumentFragment();
			parent.appendChild(ref);
			strictEqual(parent.replaceChild(fragment, ref), ref);
			assertRoot(fragment, []);
			assertRoot(ref, []);
			assertRoot(parent, []);
		});

		await test("replace first empty fragment", () => {
			const parent = new Node();
			const last = new Node();
			const ref = new Node();
			const fragment = new DocumentFragment();
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
			const parent = new Node();
			const first = new Node();
			const ref = new Node();
			const fragment = new DocumentFragment();
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
			const parent = new Node();
			const first = new Node();
			const last = new Node();
			const ref = new Node();
			const fragment = new DocumentFragment();
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
			const parent = new Node();
			const ref = new Node();
			const fragment = new DocumentFragment();
			const a = new Node();
			const b = new Node();
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
			const parent = new Node();
			const last = new Node();
			const ref = new Node();
			const fragment = new DocumentFragment();
			const a = new Node();
			const b = new Node();
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
			const parent = new Node();
			const first = new Node();
			const ref = new Node();
			const fragment = new DocumentFragment();
			const a = new Node();
			const b = new Node();
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
			const parent = new Node();
			const first = new Node();
			const last = new Node();
			const ref = new Node();
			const fragment = new DocumentFragment();
			const a = new Node();
			const b = new Node();
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
			const parent = new Node();
			const a = new Node();
			const b = new Node();
			parent.appendChild(a);
			parent.appendChild(b);
			parent.removeChild(a);
			assertRoot(a, []);
			assertRoot(parent, [
				{ is: b },
			]);
		});

		await test("remove last child", () => {
			const parent = new Node();
			const a = new Node();
			const b = new Node();
			parent.appendChild(a);
			parent.appendChild(b);
			parent.removeChild(b);
			assertRoot(b, []);
			assertRoot(parent, [
				{ is: a },
			]);
		});

		await test("remove middle child", () => {
			const parent = new Node();
			const a = new Node();
			const b = new Node();
			const c = new Node();
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

		await test("contains", () => {
			const root = new Node();
			const a = new Node();
			const b = new Node();
			const c = new Node();
			const d = new Node();
			const e = new Node();
			root.appendChild(a);
			root.appendChild(b);
			b.appendChild(c);
			b.appendChild(d);
			assertRoot(e, []);
			assertRoot(root, [
				{ is: a },
				{ is: b, children: [
					{ is: c },
					{ is: d },
				] },
			]);
			const nodes = [root, a, b, c, d, e];
			const contains = [
				/*          root   a      b      c      d      e */
				/* root */ [ true,  true,  true,  true,  true, false],
				/* a    */ [false,  true, false, false, false, false],
				/* b    */ [false, false,  true,  true,  true, false],
				/* c    */ [false, false, false,  true, false, false],
				/* d    */ [false, false, false, false,  true, false],
				/* e    */ [false, false, false, false, false,  true],
			];
			for (let y = 0; y < nodes.length; y++) {
				strictEqual(nodes[y].contains(null), false);
				for (let x = 0; x < nodes.length; x++) {
					strictEqual(nodes[y].contains(nodes[x]), contains[y][x]);
				}
			}
		});

		await test("remove", () => {
			const parent = new Node();
			const node = new Node();
			parent.appendChild(node);
			node.remove();
			assertRoot(parent, []);
			assertRoot(node, []);
			node.remove();
			assertRoot(node, []);
		});

		await test("append", () => {
			const node = new Node();
			node.append(
				"test",
				new Element(HTML, "br"),
			);
			strictEqual(node.childNodes.length, 2);
			strictEqual(node.firstChild instanceof Text, true);
			strictEqual(node.lastChild instanceof Element, true);
		});

		await test("replace children", () => {
			const parent = new Node();
			const a = new Node();
			const c = new Node();
			const d = new Node();

			parent.replaceChildren(a, "b");

			const b = parent.lastChild!;
			strictEqual(b instanceof Text, true);
			assertRoot(parent, [
				{ is: a },
				{ is: b },
			]);

			parent.replaceChildren();
			assertRoot(parent);
			assertRoot(a);
			assertRoot(b);

			parent.replaceChildren(b, a);
			assertRoot(parent, [
				{ is: b },
				{ is: a },
			]);

			parent.replaceChildren(c, a, d);
			assertRoot(parent, [
				{ is: c },
				{ is: a },
				{ is: d },
			]);
		});
	});

	await test("node text content", () => {
		const parent = new Node();
		parent.appendChild(new Text("foo"));
		parent.appendChild(new Comment("bar"));
		parent.appendChild(new Text("baz"));
		strictEqual(parent.textContent, "foobaz");
	});

	await suite("comment", async () => {
		await test("usage", () => {
			const node = new Comment("foo");
			strictEqual(node.nodeType, 8);
			strictEqual(node.nodeName, "#comment");
			strictEqual(node.textContent, "foo");
			strictEqual(node.outerHTML, "");

			node.textContent = "";
			strictEqual(node.textContent, "");
			strictEqual(node.outerHTML, "");

			node.textContent = "-->";
			strictEqual(node.textContent, "-->");
			strictEqual(node.outerHTML, "");

			node.textContent = 42 as any;
			strictEqual(node.textContent, "42");
			strictEqual(node.outerHTML, "");
		});

		await test("visible", () => {
			VISIBLE_COMMENTS.inject(true, () => {
				const node = new Comment("foo");
				strictEqual(node.outerHTML, "<!--foo-->");
				node.textContent = "-->";
				strictEqual(node.outerHTML, "<!---->-->");
			});
		});
	});

	await test("text", () => {
		const node = new Text("foo");
		strictEqual(node.nodeType, 3);
		strictEqual(node.nodeName, "#text");
		strictEqual(node.textContent, "foo");

		node.textContent = "\"'<>&";
		strictEqual(node.textContent, "\"'<>&");
		strictEqual(node.outerHTML, "&#34;&#39;&lt;&gt;&amp;");

		node.textContent = 42 as any;
		strictEqual(node.textContent, "42");
		strictEqual(node.outerHTML, "42");
	});

	await suite("document", async () => {
		await test("createTextNode", () => {
			const node = new Document().createTextNode("test");
			strictEqual(node instanceof Text, true);
			strictEqual(node.textContent, "test");
		});

		await test("createComment", () => {
			const node = new Document().createComment("test");
			strictEqual(node instanceof Comment, true);
			strictEqual(node.textContent, "test");
		});

		await test("createDocumentFragment", () => {
			const node = new Document().createDocumentFragment();
			strictEqual(node instanceof DocumentFragment, true);
			strictEqual(node.childNodes.length, 0);
		});

		await test("createElement", () => {
			const node = new Document().createElement("div");
			strictEqual(node instanceof Element, true);
			strictEqual(node.namespaceURI, HTML);
			strictEqual(node.tagName, "div");
		});

		await test("createElement, svg named html element", () => {
			const node = new Document().createElement("svg");
			strictEqual(node instanceof Element, true);
			strictEqual(node.namespaceURI, HTML);
			strictEqual(node.tagName, "svg");
		});

		await test("createElementNS, html", () => {
			const node = new Document().createElementNS(HTML, "div");
			strictEqual(node instanceof Element, true);
			strictEqual(node.namespaceURI, HTML);
			strictEqual(node.tagName, "div");
		});

		await test("createElementNS, svg", () => {
			const node = new Document().createElementNS(SVG, "div");
			strictEqual(node instanceof Element, true);
			strictEqual(node.namespaceURI, SVG);
			strictEqual(node.tagName, "div");
		});

		await test("createElementNS, mathml", () => {
			const node = new Document().createElementNS(MATHML, "div");
			strictEqual(node instanceof Element, true);
			strictEqual(node.namespaceURI, MATHML);
			strictEqual(node.tagName, "div");
		});
	});

	await test("window", () => {
		const window = new Window();
		strictEqual(window.window, window);
		strictEqual(window.document instanceof Document, true);
	});

	await suite("element", async () => {
		await test("create", () => {
			const elem = new Element(HTML, "div");
			strictEqual(elem.namespaceURI, HTML);
			strictEqual(elem.nodeName, "div");
			strictEqual(elem.nodeType, 1);
			strictEqual(elem.tagName, "div");
		});

		await test("node innerHTML", () => {
			const elem = new Element(HTML, "div");
			strictEqual(elem.innerHTML, "");
			elem.appendChild(new Text("test"));
			strictEqual(elem.innerHTML, "test");
			elem.appendChild(new Element(HTML, "br"));
			strictEqual(elem.innerHTML, "test<br>");
		});

		await test("raw innerHTML", () => {
			const elem = new Element(HTML, "div");
			elem.innerHTML = "test";

			strictEqual(elem.innerHTML, "test");
			strictEqual(elem.outerHTML, "<div>test</div>");

			elem.innerHTML = "<input><!--test-->";
			strictEqual(elem.outerHTML, "<div><input><!--test--></div>");

			const raw = elem.firstChild;
			strictEqual(elem.lastChild, raw);
			strictEqual(raw instanceof RawHTML, true);
			strictEqual((raw as RawHTML).outerHTML, "<input><!--test-->");
		});

		await suite("attributes", async () => {
			await test("usage", () => {
				const elem = new Element(HTML, "div");
				strictEqual(elem.hasAttribute("foo"), false);
				strictEqual(elem.getAttribute("foo"), null);
				elem.setAttribute("foo", "");
				strictEqual(elem.hasAttribute("foo"), true);
				strictEqual(elem.getAttribute("foo"), "");
				elem.setAttribute("foo", "bar");
				strictEqual(elem.hasAttribute("foo"), true);
				strictEqual(elem.getAttribute("foo"), "bar");
				elem.removeAttribute("foo");
				strictEqual(elem.hasAttribute("foo"), false);
				strictEqual(elem.getAttribute("foo"), null);
			});

			await test("toggle", () => {
				const elem = new Element(HTML, "div");
				elem.toggleAttribute("foo");
				strictEqual(elem.hasAttribute("foo"), true);
				strictEqual(elem.getAttribute("foo"), "");
				elem.toggleAttribute("foo");
				strictEqual(elem.hasAttribute("foo"), false);
				strictEqual(elem.getAttribute("foo"), null);
				elem.toggleAttribute("foo", true);
				strictEqual(elem.hasAttribute("foo"), true);
				strictEqual(elem.getAttribute("foo"), "");
				elem.toggleAttribute("foo", true);
				strictEqual(elem.hasAttribute("foo"), true);
				strictEqual(elem.getAttribute("foo"), "");
				elem.toggleAttribute("foo", false);
				strictEqual(elem.hasAttribute("foo"), false);
				strictEqual(elem.getAttribute("foo"), null);
				elem.toggleAttribute("foo", false);
				strictEqual(elem.hasAttribute("foo"), false);
				strictEqual(elem.getAttribute("foo"), null);
				elem.setAttribute("foo", "bar");
				elem.toggleAttribute("foo");
				strictEqual(elem.hasAttribute("foo"), false);
				strictEqual(elem.getAttribute("foo"), null);
			});
		});

		await suite("classList", async () => {
			await test("basic usage", () => {
				const elem = new Element(HTML, "div");
				elem.setAttribute("class", "a b");
				strictEqual(elem.classList.length, 2);
				elem.classList.add("c", "d");
				strictEqual(elem.classList.length, 4);
				strictEqual(elem.getAttribute("class"), "a b c d");
				strictEqual(elem.classList.length, 4);
				deepStrictEqual(Array.from(elem.classList), ["a", "b", "c", "d"]);
				deepStrictEqual(Array.from(elem.classList.values()), ["a", "b", "c", "d"]);
			});

			await test("init from missing attribute", () => {
				const elem = new Element(HTML, "div");
				strictEqual(elem.classList.length, 0);
				elem.classList.add("test");
				strictEqual(elem.getAttribute("class"), "test");
			});

			await test("init from existing attribute", () => {
				const elem = new Element(HTML, "div");
				elem.setAttribute("class", "a");
				strictEqual(elem.classList.length, 1);
				elem.classList.add("b");
				strictEqual(elem.getAttribute("class"), "a b");
			});

			await test("invalidate by setAttribute", () => {
				const elem = new Element(HTML, "div");
				elem.classList.add("a");
				elem.setAttribute("class", "b");
				deepStrictEqual(Array.from(elem.classList), ["b"]);
			});

			await test("invalidate by removeAttribute", () => {
				const elem = new Element(HTML, "div");
				elem.classList.add("a");
				elem.removeAttribute("class");
				deepStrictEqual(Array.from(elem.classList), []);
			});

			await test("invalidate by add", () => {
				const elem = new Element(HTML, "div");
				elem.setAttribute("class", "a");
				strictEqual(elem.getAttribute("class"), "a");
				elem.classList.add("b");
				strictEqual(elem.getAttribute("class"), "a b");
			});

			await test("invalidate by remove", () => {
				const elem = new Element(HTML, "div");
				elem.setAttribute("class", "a b");
				strictEqual(elem.getAttribute("class"), "a b");
				elem.classList.remove("b");
				strictEqual(elem.getAttribute("class"), "a");
			});

			await test("invalidate by replace", () => {
				const elem = new Element(HTML, "div");
				elem.setAttribute("class", "a b c");
				strictEqual(elem.getAttribute("class"), "a b c");
				elem.classList.replace("b", "d");
				strictEqual(elem.getAttribute("class"), "a d c");
			});

			await test("invalidate by toggle", () => {
				const elem = new Element(HTML, "div");
				elem.setAttribute("class", "a b c");
				strictEqual(elem.getAttribute("class"), "a b c");
				elem.classList.toggle("b");
				strictEqual(elem.getAttribute("class"), "a c");
			});

			await test("replace", () => {
				const elem = new Element(HTML, "div");
				elem.setAttribute("class", "a b");
				strictEqual(elem.classList.replace("c", "d"), false);
				deepStrictEqual(Array.from(elem.classList), ["a", "b"]);
				strictEqual(elem.classList.replace("a", "c"), true);
				deepStrictEqual(Array.from(elem.classList), ["c", "b"]);
				strictEqual(elem.classList.replace("a", "c"), false);
				deepStrictEqual(Array.from(elem.classList), ["c", "b"]);
			});

			await test("toggle", () => {
				const elem = new Element(HTML, "div");
				elem.setAttribute("class", "a b");
				strictEqual(elem.classList.toggle("c"), true);
				strictEqual(elem.getAttribute("class"), "a b c");

				strictEqual(elem.classList.toggle("c"), false);
				strictEqual(elem.getAttribute("class"), "a b");

				strictEqual(elem.classList.toggle("c", true), true);
				strictEqual(elem.getAttribute("class"), "a b c");
				strictEqual(elem.classList.toggle("c", true), true);
				strictEqual(elem.getAttribute("class"), "a b c");

				strictEqual(elem.classList.toggle("c", false), false);
				strictEqual(elem.getAttribute("class"), "a b");
				strictEqual(elem.classList.toggle("c", false), false);
				strictEqual(elem.getAttribute("class"), "a b");
			});

			await test("hasAttribute", () => {
				const elem = new Element(HTML, "div");
				elem.classList.add("foo");
				strictEqual(elem.hasAttribute("class"), true);
			});

			await test("outerHTML", () => {
				const elem = new Element(HTML, "div");
				elem.classList.add("foo", "bar");
				strictEqual(elem.outerHTML, "<div class=\"foo bar\"></div>");
			});
		});

		await suite("style", async () => {
			await test("basic usage", () => {
				const elem = new Element(HTML, "div");
				elem.style.setProperty("foo", "bar");
				elem.style.setProperty("bar", "baz");
				strictEqual(elem.getAttribute("style"), "foo: bar; bar: baz");
			});

			await test("init from missing attribute", () => {
				const elem = new Element(HTML, "div");
				elem.style.setProperty("foo", "bar");
				strictEqual(elem.getAttribute("style"), "foo: bar");
			});

			await test("init from empty attribute", () => {
				const elem = new Element(HTML, "div");
				elem.setAttribute("style", "");
				elem.style.setProperty("foo", "bar");
				strictEqual(elem.getAttribute("style"), "foo: bar");
			});

			await test("parsing unsupport", () => {
				const elem = new Element(HTML, "div");
				elem.setAttribute("style", "color: red");
				throws(() => elem.style.setProperty("foo", "bar"));
			});

			await test("invalidate by setAttribute", () => {
				const elem = new Element(HTML, "div");
				elem.style.setProperty("foo", "bar");
				strictEqual(elem.getAttribute("style"), "foo: bar");
				elem.setAttribute("style", "color: red");
				strictEqual(elem.getAttribute("style"), "color: red");
			});

			await test("invalidate by removeAttribute", () => {
				const elem = new Element(HTML, "div");
				elem.setAttribute("style", "color: red");
				elem.removeAttribute("style");
				elem.style.setProperty("foo", "bar");
				strictEqual(elem.getAttribute("style"), "foo: bar");
			});

			await test("invalidate by setProperty", () => {
				const elem = new Element(HTML, "div");
				elem.style.setProperty("foo", "bar");
				strictEqual(elem.getAttribute("style"), "foo: bar");
				elem.style.setProperty("bar", "baz");
				strictEqual(elem.getAttribute("style"), "foo: bar; bar: baz");
			});

			await test("non string values", () => {
				const elem = new Element(HTML, "div");
				elem.style.setProperty("foo", 42 as any);
				strictEqual(elem.style.getPropertyValue("foo"), "42");
				strictEqual(elem.getAttribute("style"), "foo: 42");
				elem.style.setProperty("foo", 77 as any);
				strictEqual(elem.style.getPropertyValue("foo"), "77");
				strictEqual(elem.getAttribute("style"), "foo: 77");
			});

			await test("invalidate by removeProperty", () => {
				const elem = new Element(HTML, "div");
				elem.style.setProperty("foo", "bar");
				elem.style.setProperty("bar", "baz");
				strictEqual(elem.getAttribute("style"), "foo: bar; bar: baz");
				elem.style.removeProperty("foo");
				strictEqual(elem.getAttribute("style"), "bar: baz");
			});

			await test("hasAttribute", () => {
				const elem = new Element(HTML, "div");
				elem.style.setProperty("foo", "bar");
				strictEqual(elem.hasAttribute("style"), true);
				elem.style.removeProperty("foo");
				strictEqual(elem.hasAttribute("style"), true);
			});

			await test("outerHTML", () => {
				const elem = new Element(HTML, "div");
				elem.style.setProperty("foo", "bar");
				strictEqual(elem.outerHTML, "<div style=\"foo: bar\"></div>");
			});
		});

		await suite("outerHTML", async () => {
			await test("default", () => {
				const elem = new Element(HTML, "div");
				strictEqual(elem.outerHTML, "<div></div>");
			});

			await test("escaped attribute value", () => {
				const elem = new Element(HTML, "div");
				elem.setAttribute("foo", "\"'<>&");
				strictEqual(elem.outerHTML, "<div foo=\"&#34;&#39;&lt;&gt;&amp;\"></div>");
			});

			await test("void tag", () => {
				const elem = new Element(HTML, "br");
				strictEqual(elem.outerHTML, "<br>");
			});

			await test("void tag with ignored children", () => {
				const elem = new Element(HTML, "br");
				elem.appendChild(new Text("ignored"));
				strictEqual(elem.outerHTML, "<br>");
			});

			await test("default with attributes", () => {
				const elem = new Element(HTML, "div");
				elem.setAttribute("foo", "bar");
				strictEqual(elem.outerHTML, "<div foo=\"bar\"></div>");
				elem.setAttribute("bar", "baz");
				strictEqual(elem.outerHTML, "<div foo=\"bar\" bar=\"baz\"></div>");
			});

			await test("void tag with attributes", () => {
				const elem = new Element(HTML, "br");
				elem.setAttribute("foo", "bar");
				strictEqual(elem.outerHTML, "<br foo=\"bar\">");
				elem.setAttribute("bar", "baz");
				strictEqual(elem.outerHTML, "<br foo=\"bar\" bar=\"baz\">");
			});

			await test("default with children", () => {
				const elem = new Element(HTML, "div");
				elem.appendChild(new Text("test"));
				elem.appendChild(new Element(HTML, "br"));
				strictEqual(elem.outerHTML, "<div>test<br></div>");
			});

			await test("void tag with ignored children", () => {
				const elem = new Element(HTML, "br");
				elem.appendChild(new Text("test"));
				elem.appendChild(new Element(HTML, "br"));
				strictEqual(elem.outerHTML, "<br>");
			});

			await test("default with children and attributes", () => {
				const elem = new Element(HTML, "div");
				elem.setAttribute("foo", "bar");
				elem.setAttribute("bar", "baz");
				elem.appendChild(new Text("test"));
				elem.appendChild(new Element(HTML, "br"));
				strictEqual(elem.outerHTML, "<div foo=\"bar\" bar=\"baz\">test<br></div>");
			});

			await test("void tag with ignored children and attributes", () => {
				const elem = new Element(HTML, "br");
				elem.setAttribute("foo", "bar");
				elem.setAttribute("bar", "baz");
				elem.appendChild(new Text("test"));
				elem.appendChild(new Element(HTML, "br"));
				strictEqual(elem.outerHTML, "<br foo=\"bar\" bar=\"baz\">");
			});

			await test("self closing tag", () => {
				const elem = new Element(SVG, "path");
				strictEqual(elem.outerHTML, "<path/>");
			});

			await test("self closing tag with children", () => {
				const elem = new Element(SVG, "path");
				elem.appendChild(new Text("test"));
				strictEqual(elem.outerHTML, "<path>test</path>");
			});

			await test("self closing tag with attributes", () => {
				const elem = new Element(SVG, "path");
				elem.setAttribute("foo", "bar");
				elem.setAttribute("bar", "baz");
				strictEqual(elem.outerHTML, "<path foo=\"bar\" bar=\"baz\"/>");
			});

			await test("non string attributes", () => {
				const elem = new Element(SVG, "path");
				elem.setAttribute("foo", 42 as any);
				strictEqual(elem.getAttribute("foo"), "42");
				elem.setAttribute("foo", 77 as any);
				strictEqual(elem.getAttribute("foo"), "77");
			});
		});
	});
});
