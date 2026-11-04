const UPPER_CASE_REGEX = /[A-Z]/g;

export function toDataAttr(prop: string): string {
	return "data-" + prop.replace(UPPER_CASE_REGEX, char => "-" + char.toLowerCase());
}
