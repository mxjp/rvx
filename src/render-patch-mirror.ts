import { RenderPatchCallback } from "./render-patch-callback";

export class RenderPatchMirror {
	public readonly nodes: Node[] = [];
	// TODO: In case of larger collections, cache node indexes for faster lookup when applying patches.

	public patch(nodes: Node[], start?: Node, end?: Node) {
		const startIndex = start ? this.nodes.indexOf(start) + 1 : 0;
		const endIndex = end ? this.nodes.indexOf(end) : this.nodes.length;
		this.nodes.splice(startIndex, endIndex - startIndex, ...nodes);
	}
}
