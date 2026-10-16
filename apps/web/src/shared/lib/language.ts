export const Languages = ["en", "ru"] as const;
export type Language = (typeof Languages)[number];

const LanguageKey = "language";

// The first of the browser's languages the app speaks. Ukrainian or Kazakh browsers that list
// Russian next get Russian; the rest get English.
const browserLanguage: Language =
	navigator.languages
		.map((x) => Languages.find((language) => x.split("-")[0] === language))
		.find((x) => x !== undefined) ?? "en";

/** The interface language: the visitor's pick from the help menu, or else the browser's. */
export const language: Language =
	Languages.find((x) => x === localStorage.getItem(LanguageKey)) ?? browserLanguage;

/**
 * The locale for dates and numbers. The browser's own keeps its regional format (en-GB writes
 * 16/10/2026), unless the visitor picked a language the browser isn't set to.
 */
export const locale = language === browserLanguage ? undefined : language;

/** A text in the interface language. The Russian one has to cover everything the English one has. */
export function translate<T>(text: { en: T; ru: NoInfer<T> }): T {
	return text[language];
}

// The language is read once, when the app starts, so a switch reloads the page.
export function switchLanguage(to: Language) {
	localStorage.setItem(LanguageKey, to);
	window.location.reload();
}
