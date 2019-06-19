import { RenderEngine } from "./render-engine";
import { Vnode } from "./vnode";

export type VnodeConstructor = new(props: any, children: any[], engine: RenderEngine) => Vnode;
