import { NODE, NodeTarget } from "../element-common.js";
import { Content } from "../types.js";
import { View } from "../view.js";
import { createText } from "./create-text.js";

/**
 * Append content to a node.
 *
 * @param node The node.
 * @param content The content to append.
 */
export function appendContent(node: Node, content: Content, env: typeof globalThis): void {
	if (content === null || content === undefined) {
		return;
	}
	if (Array.isArray(content)) {
		for (let i = 0; i < content.length; i++) {
			appendContent(node, content[i], env);
		}
	} else if (content instanceof env.Node) {
		node.appendChild(content);
	} else if (content instanceof View) {
		content.appendTo(node);
	} else if (typeof content === "object" && NODE in content) {
		node.appendChild((content as NodeTarget)[NODE]);
	} else {
		node.appendChild(createText(content, env));
	}
}
