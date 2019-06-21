import { Cycle } from "./cycle";

export interface DynamicRenderRange {
	start: Node;
	end: Node;
	item: any;
	cycle: Cycle;

	prev?: DynamicRenderRange;
	next?: DynamicRenderRange;
}

export function findDynamicRenderStart(range: DynamicRenderRange) {
	range = range.prev;
	while (range) {
		if (range.end) {
			return range.end;
		}
		range = range.prev;
	}
}

export function findDynamicRenderEnd(range: DynamicRenderRange) {
	range = range.next;
	while (range) {
		if (range.start) {
			return range.start;
		}
		range = range.next;
	}
}

export function linkDynamicRenderRanges(ranges: DynamicRenderRange[], start: number, count: number) {
	if (start > 0) {
		ranges[start - 1].next = ranges[start];
	}
	const end = start + count;
	for (let i = start; i < end; i++) {
		ranges[i].prev = ranges[i - 1];
		ranges[i].next = ranges[i + 1];
	}
	if (end < ranges.length) {
		ranges[end].prev = ranges[end - 1];
	}
}
