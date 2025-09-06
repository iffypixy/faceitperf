interface MapSelectProps {
	maps: {name: string; value: number}[];
	activeMap: number;
	setActiveMap: (map: string) => void
}

export const MapSelect: React.FC<MapSelectProps> = ({
	maps,
	activeMap,
	setActiveMap,
}) => (
	<div className="flex flex-row bg-[#232d38] text-14 xs:text-12 text-[#929a9e] px-16 items-center space-x-18 py-12">
		{maps.map((m) => (
			<button
				className={activeMap == m.value ? "font-bold" : ""}
				onClick={() => setActiveMap(`${m.value}`)}
			>
				{
					{
						de_mirage: "Mirage",
						de_anubis: "Anubis",
						de_dust2: "Dust 2",
						de_vertigo: "Vertigo",
						de_inferno: "Inferno",
						de_nuke: "Nuke",
						de_ancient: "Ancient",
						de_train: "Train",
						de_cbble: "Cobblestone",
						de_overpass: "Overpass",
					}[m.name]
				}
			</button>
		))}
	</div>
);
