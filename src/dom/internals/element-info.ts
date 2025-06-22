import { HTML, MATHML, SVG } from "../../core/element-common.js";

export const XMLNS_HTML = 0;
export const XMLNS_SVG = 1;
export const XMLNS_MATHML = 2;

export type XMLNS = typeof XMLNS_HTML | typeof XMLNS_SVG | typeof XMLNS_MATHML;

export function resolveNamespaceURI(uri: string): XMLNS {
	switch (uri) {
		case HTML: return XMLNS_HTML;
		case SVG: return XMLNS_SVG;
		case MATHML: return XMLNS_MATHML;
		default: throw new Error("unsupported namespace uri");
	}
}

export function isVoidTag(xmlns: XMLNS, name: string): boolean {
	if (xmlns !== XMLNS_HTML) {
		return false;
	}
	switch (name) {
		case "area":
		case "base":
		case "br":
		case "col":
		case "embed":
		case "hr":
		case "img":
		case "input":
		case "link":
		case "meta":
		case "param":
		case "source":
		case "track":
		case "wbr":
			return true;
		default:
			return false;
	}
}
