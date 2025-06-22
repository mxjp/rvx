import { strictEqual } from "node:assert";
import test from "node:test";
import { htmlEscapeAppendTo } from "../../../dist/es/dom/internals/html-escape.js";

await test("dom/internals/htmlEscape", () => {
	strictEqual(htmlEscapeAppendTo("", ""), "");
	strictEqual(htmlEscapeAppendTo("", "abc"), "abc");
	strictEqual(htmlEscapeAppendTo("&123;", ""), "&123;");
	strictEqual(htmlEscapeAppendTo("&123;", "abc"), "&123;abc");
	strictEqual(htmlEscapeAppendTo("&123;", "&&&"), "&123;&amp;&amp;&amp;");
	strictEqual(htmlEscapeAppendTo("&123;", "\"'<>&\"'<>&"), "&123;&#34;&#39;&lt;&gt;&amp;&#34;&#39;&lt;&gt;&amp;");
	strictEqual(htmlEscapeAppendTo("&123;", "01\"23'45<67>89&ab"), "&123;01&#34;23&#39;45&lt;67&gt;89&amp;ab");
});
