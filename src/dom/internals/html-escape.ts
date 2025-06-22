
const HTML_ESCAPE_REGEX = /["'<>&]/;

export function htmlEscapeAppendTo(html: string, data: string) {
	const firstMatch = HTML_ESCAPE_REGEX.exec(data);
	if (firstMatch === null) {
		return html + data;
	}
	let last = 0;
	let index = firstMatch.index;
	let escape: string;
	chars: while (index < data.length) {
		switch (data.charCodeAt(index)) {
			case 34:
				escape = "&#34;";
				break;
			case 38:
				escape = "&amp;";
				break;
			case 39:
				escape = "&#39;";
				break;
			case 60:
				escape = "&lt;";
				break;
			case 62:
				escape = "&gt;";
				break;
			default:
				index++;
				continue chars;
		}
		if (index !== last) {
			html += data.slice(last, index);
		}
		html += escape;
		index++;
		last = index;
	}
	if (index !== last) {
		html += data.slice(last, index);
	}
	return html;
}
