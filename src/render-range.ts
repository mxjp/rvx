
export interface RenderRange {
	start: Node;
	end: Node;
}

export function findRenderStart(ranges: RenderRange[], index: number) {
	for (let i = index - 1; i >= 0; i--) {
		if (ranges[i].end) {
			return ranges[i].end;
		}
	}
}

export function findRenderEnd(ranges: RenderRange[], index: number) {
	for (let i = index + 1; i < ranges.length; i++) {
		if (ranges[i].start) {
			return ranges[i].start;
		}
	}
}
