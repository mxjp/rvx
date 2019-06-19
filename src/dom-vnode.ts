import { RenderEngine } from "./render-engine";
import { Vnode } from "./vnode";

export class DomVnode extends Vnode {
	public constructor(props: any, children: any[], engine: RenderEngine, tagName: string) {
		super(props, children, engine);
		this.element = document.createElement(tagName);
	}

	public readonly element: Element;

	protected render() {
		if (this.props) {
			this.engine.renderAttributes(this.element, this.props, this, this.cycle);
		}
		this.engine.renderContentFor(this.element, this.children, this, this.cycle);
		return this.element;
	}
}
