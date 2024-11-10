import { deepStrictEqual, strictEqual, throws } from "node:assert";
import test, { suite } from "node:test";
import { HTML, MATHML, SVG } from "rvx";
import { htmlEscapeAppendTo, isVoidTag, resolveNamespaceURI, RvxComment, rvxDocument, RvxDocumentFragment, RvxElement, RvxNode, RvxText, XMLNS_HTML, XMLNS_MATHML, XMLNS_SVG } from "rvx/dom";

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

		await test("contains", () => {
			const root = new RvxNode();
			const a = new RvxNode();
			const b = new RvxNode();
			const c = new RvxNode();
			const d = new RvxNode();
			const e = new RvxNode();
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
		strictEqual(node.nodeName, "#comment");
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
		strictEqual(node.nodeName, "#text");
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

	await test("resolveNamespaceURI", () => {
		throws(() => resolveNamespaceURI(""));
		throws(() => resolveNamespaceURI("https://example.com"));
		strictEqual(resolveNamespaceURI(HTML), XMLNS_HTML);
		strictEqual(resolveNamespaceURI(SVG), XMLNS_SVG);
		strictEqual(resolveNamespaceURI(MATHML), XMLNS_MATHML);
	});

	await test("isVoidTag", () => {
		strictEqual(isVoidTag(XMLNS_HTML, "br"), true);
		strictEqual(isVoidTag(XMLNS_SVG, "br"), false);
		strictEqual(isVoidTag(XMLNS_MATHML, "br"), false);
		strictEqual(isVoidTag(XMLNS_HTML, "div"), false);
	});

	await suite("element", async () => {
		await test("create", () => {
			const elem = new RvxElement(HTML, "div");
			strictEqual(elem.namespaceURI, HTML);
			strictEqual(elem.nodeName, "div");
			strictEqual(elem.nodeType, 1);
			strictEqual(elem.tagName, "div");
		});

		await test("append", () => {
			const elem = new RvxElement(HTML, "div");
			elem.append(
				"test",
				new RvxElement(HTML, "br"),
			);
			strictEqual(elem.childNodes.length, 2);
			strictEqual(elem.firstChild instanceof RvxText, true);
			strictEqual(elem.lastChild instanceof RvxElement, true);
			strictEqual(elem.innerHTML, "test<br>");
		});

		await test("innerHTML", () => {
			const elem = new RvxElement(HTML, "div");
			strictEqual(elem.innerHTML, "");
			elem.appendChild(new RvxText("test"));
			strictEqual(elem.innerHTML, "test");
			elem.appendChild(new RvxElement(HTML, "br"));
			strictEqual(elem.innerHTML, "test<br>");
		});

		await suite("attributes", async () => {
			await test("usage", () => {
				const elem = new RvxElement(HTML, "div");
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
				const elem = new RvxElement(HTML, "div");
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

		await suite("outerHTML", async () => {
			await test("default", () => {
				const elem = new RvxElement(HTML, "div");
				strictEqual(elem.outerHTML, "<div></div>");
			});

			await test("escaped attribute value", () => {
				const elem = new RvxElement(HTML, "div");
				elem.setAttribute("foo", "\"'<>&");
				strictEqual(elem.outerHTML, "<div foo=\"&#34;&#39;&lt;&gt;&amp;\"></div>");
			});

			await test("void tag", () => {
				const elem = new RvxElement(HTML, "br");
				strictEqual(elem.outerHTML, "<br>");
			});

			await test("void tag with ignored children", () => {
				const elem = new RvxElement(HTML, "br");
				elem.appendChild(new RvxText("ignored"));
				strictEqual(elem.outerHTML, "<br>");
			});

			await test("default with attributes", () => {
				const elem = new RvxElement(HTML, "div");
				elem.setAttribute("foo", "bar");
				strictEqual(elem.outerHTML, "<div foo=\"bar\"></div>");
				elem.setAttribute("bar", "baz");
				strictEqual(elem.outerHTML, "<div foo=\"bar\" bar=\"baz\"></div>");
			});

			await test("void tag with attributes", () => {
				const elem = new RvxElement(HTML, "br");
				elem.setAttribute("foo", "bar");
				strictEqual(elem.outerHTML, "<br foo=\"bar\">");
				elem.setAttribute("bar", "baz");
				strictEqual(elem.outerHTML, "<br foo=\"bar\" bar=\"baz\">");
			});

			await test("default with children", () => {
				const elem = new RvxElement(HTML, "div");
				elem.appendChild(new RvxText("test"));
				elem.appendChild(new RvxElement(HTML, "br"));
				strictEqual(elem.outerHTML, "<div>test<br></div>");
			});

			await test("void tag with ignored children", () => {
				const elem = new RvxElement(HTML, "br");
				elem.appendChild(new RvxText("test"));
				elem.appendChild(new RvxElement(HTML, "br"));
				strictEqual(elem.outerHTML, "<br>");
			});

			await test("default with children and attributes", () => {
				const elem = new RvxElement(HTML, "div");
				elem.setAttribute("foo", "bar");
				elem.setAttribute("bar", "baz");
				elem.appendChild(new RvxText("test"));
				elem.appendChild(new RvxElement(HTML, "br"));
				strictEqual(elem.outerHTML, "<div foo=\"bar\" bar=\"baz\">test<br></div>");
			});

			await test("void tag with ignored children and attributes", () => {
				const elem = new RvxElement(HTML, "br");
				elem.setAttribute("foo", "bar");
				elem.setAttribute("bar", "baz");
				elem.appendChild(new RvxText("test"));
				elem.appendChild(new RvxElement(HTML, "br"));
				strictEqual(elem.outerHTML, "<br foo=\"bar\" bar=\"baz\">");
			});

			await test("self closing tag", () => {
				const elem = new RvxElement(SVG, "path");
				strictEqual(elem.outerHTML, "<path/>");
			});

			await test("self closing tag with children", () => {
				const elem = new RvxElement(SVG, "path");
				elem.appendChild(new RvxText("test"));
				strictEqual(elem.outerHTML, "<path>test</path>");
			});

			await test("self closing tag with attributes", () => {
				const elem = new RvxElement(SVG, "path");
				elem.setAttribute("foo", "bar");
				elem.setAttribute("bar", "baz");
				strictEqual(elem.outerHTML, "<path foo=\"bar\" bar=\"baz\"/>");
			});
		});
	});
});
