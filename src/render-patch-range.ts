
export interface RenderPatchRange {
	start: Node;
	end: Node;

	// TODO: Use combination of array and linked list for render patch ranges.
}

export function findRenderPatchStart(ranges: RenderPatchRange[], index: number) {
	for (let i = index - 1; i >= 0; i--) {
		if (ranges[i].end) {
			return ranges[i].end;
		}
	}
}

export function findRenderPatchEnd(ranges: RenderPatchRange[], index: number) {
	for (let i = index + 1; i < ranges.length; i++) {
		if (ranges[i].start) {
			return ranges[i].start;
		}
	}
}
