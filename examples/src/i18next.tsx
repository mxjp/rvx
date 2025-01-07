/*

# Integrating `i18next`
This shows a minimal [i18next](https://www.i18next.com/) integration.

*/

import i18next from "i18next";
import { $ } from "rvx";

await i18next.init({
	lng: "en",
	resources: {
		en: {
			translation: {
				message: "Hello World!",
			},
		},
		de: {
			translation: {
				message: "Hallo Welt!",
			},
		},
	},
});

// Create a signal for notifying translation expressions:
const lang = $(i18next.language);

// Notify the "lang" signal when anything that could
// affect the result of the ".t" function changes:
i18next.on("languageChanged", () => {
	lang.value = i18next.language;
});

// Example function for reactive translation:
function t(key: string) {
	// The actual value of the "lang" signal isn't important here.
	// This just ensures, that this function can be re-run when
	// the language has been changed:
	lang.access();
	return i18next.t(key);
}

// Example component for reactive translation:
function T(props: { key: string }) {
	return () => {
		lang.access();
		return i18next.t(props.key);
	};
}

export function Example() {
	return <>
		<h1>{() => t("message")}</h1>
		<h1><T key="message" /></h1>

		<div class="row">
			<button on:click={() => i18next.changeLanguage("en")}>en</button>
			<button on:click={() => i18next.changeLanguage("de")}>de</button>
		</div>
	</>;
}
