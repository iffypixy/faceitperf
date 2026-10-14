export const Maps = [
	"de_mirage",
	"de_anubis",
	"de_inferno",
	"de_dust2",
	"de_overpass",
	"de_nuke",
	"de_vertigo",
	"de_ancient",
	"de_train",
	"de_cache",
	"de_cobblestone",
	"de_canals",
	"cs_office",
	"cs_italy",
	"de_aztec",
	"cs_agency",
	"de_jura",
	"de_grail",
	"de_tuscan",
	"de_season",
] as const;
export type MapId = (typeof Maps)[number];

/** The map's display name. A map the app doesn't know yet shows its id without the prefix. */
export function mapLabel(id: string): string {
	const name = plainName(id);
	return MapLabel[id as MapId] ?? name.charAt(0).toUpperCase() + name.slice(1);
}

/** The map's short HLTV-style name, with the same fallback as `mapLabel`. */
export function mapAlias(id: string): string {
	return MapAlias[id as MapId] ?? plainName(id);
}

function plainName(id: string): string {
	return id.replace(/^[a-z]{2}_/, "");
}

const MapLabel: Record<MapId, string> = {
	de_mirage: "Mirage",
	de_anubis: "Anubis",
	de_inferno: "Inferno",
	de_dust2: "Dust II",
	de_overpass: "Overpass",
	de_nuke: "Nuke",
	de_vertigo: "Vertigo",
	de_ancient: "Ancient",
	de_train: "Train",
	de_canals: "Canals",
	cs_office: "Office",
	cs_italy: "Italy",
	de_cobblestone: "Cobblestone",
	de_cache: "Cache",
	de_aztec: "Aztec",
	cs_agency: "Agency",
	de_jura: "Jura",
	de_grail: "Grail",
	de_season: "Season",
	de_tuscan: "Tuscan",
};

const MapAlias: Record<MapId, string> = {
	de_mirage: "mrg",
	de_anubis: "anb",
	de_inferno: "inf",
	de_dust2: "d2",
	de_overpass: "ovp",
	de_nuke: "nuke",
	de_vertigo: "vtg",
	de_ancient: "anc",
	de_train: "trn",
	de_canals: "can",
	cs_office: "off",
	cs_italy: "ita",
	de_cobblestone: "cbl",
	de_cache: "cch",
	de_aztec: "azt",
	cs_agency: "agn",
	de_jura: "jur",
	de_grail: "grl",
	de_season: "ssn",
	de_tuscan: "tcn",
};
