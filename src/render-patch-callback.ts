
/**
 * A callback that is used to notify the parent context of a change on the real dom that has to be applied.
 */
export type RenderPatchCallback = (nodes: Node[], start?: Node, end?: Node) => void;
