import { language } from "~/shared/lib/language";

const RegionNames = new Intl.DisplayNames([language], { type: "region" });

/** The country's name for a flag's alt text: "Russia" rather than "ru", which is read out letter by letter. */
export function countryName(countryCode: string): string {
	// Alt text must never break the page; a code Intl rejects is still better than nothing.
	try {
		return RegionNames.of(countryCode.toUpperCase()) ?? countryCode;
	} catch {
		return countryCode;
	}
}

export function flagUrl(countryCode: string): string {
	return `/hltv/flags/${countryCode.toUpperCase()}.gif`;
}
