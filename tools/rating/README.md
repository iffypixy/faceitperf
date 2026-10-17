# HLTV rating, reverse-engineered

> Here, we only reverse engineer Rating 2.0. With the (limited) data I have from FACEIT API, it's not feasible to accurately predict Rating 3.0 and Rating 2.1 since those account for entry duels, clutches, saves, etc. Rating 1.0 is too simple and not relevant anymore, so Rating 2.0 is the sweet spot.

The data comes in three parts:

- `hltv.json` holds HLTV's Rating 2.0 stats (`hltv.js`): 543 pro maps, 4 of the latest 50 on 2 days a month from 2018 to 2023, and the careers of 300 of their players, from June 2017, when Rating 2.0 came out, until CS2 replaced CS:GO in September 2023. The 4 maps with a substitute are left out, as their scoreboards don't say who played which rounds.
- `faceit.csv` holds 32,097 recent 5v5 FACEIT maps of 363 players of every level (`faceit.ts`).
- `faceit_hltv.csv` holds pro maps played on FACEIT servers, as both sites count them: 1,003 CS2 player-maps from 2026 qualifiers and NA ECL cups, and 466 CS:GO ones from 2023 qualifiers and ESEA. Each FACEIT match was paired with the HLTV maps of the same teams, map and time, and its players by username or else by kills and deaths, leaving out 31 player-maps that couldn't be paired. The pairing scripts were one-offs and aren't kept, but each row names its FACEIT match and HLTV map.

The sites agree on rounds and CS2 kills. Deaths differ by 1 to 3 on 1.5% of CS2 player-maps, and kills or deaths by 1 or 2 on about 1 in 10 CS:GO ones. FACEIT's CS2 stats also count about 60% of the flash assists that HLTV leaves out of its assists per round, and 0.6 more damage per round, so `rating.py` first converts HLTV's stats to FACEIT's CS2 ones. FACEIT's CS:GO stats count assists the way HLTV does, so the app scales them by 1.16.

`rating.py` then fits a linear regression for each metric and scores it on the rows it wasn't trained on (5-fold cross-validation, folded by map or by player). Rating and KAST are fitted on maps and careers together. A career's rating is off by about 0.01 whatever its length and a single map's by 0.065, so a career weighs as much as 40 maps. Rating curves upwards with damage, and HLTV rates a career on its totals, which sit mid-curve. A straight line would rate single maps 0.01 low and careers 0.005 high, so the formula adds an ADR² term. No pro map reached 150 ADR, so the app stops the curve there.

FACEIT added ADR and double kills in late June 2024, and its CS:GO maps have no ADR at all, so the app estimates them: from fits on FACEIT maps, and for CS:GO's ADR on HLTV's maps, as CS:GO maps had more damage for the same kills, assists and deaths.

```
FACEIT vs HLTV, on the same pro maps:
  cs2 (1003 player-maps): 1.162× the assists, +0.61 ADR
  csgo (466 player-maps): 1.001× the assists
  so CS:GO assists count the CS2 way at 1.16×

Rating (5390 HLTV player-maps, 252 HLTV careers):
  Rating = 0.879 + 0.751⋅kpr + 0.272⋅apr − 0.887⋅dpr + 0.000417⋅adr + 0.0000314⋅adr² + 0.0574⋅mkpr
  HLTV player-maps: R² 0.960, RMSE 0.0645, bias −0.00383
  HLTV careers: R² 0.981, RMSE 0.011, bias +0.00205

KAST (5390 HLTV player-maps, 252 HLTV careers):
  KAST = 80.7 + 20.2⋅kpr + 33.8⋅apr − 44.2⋅dpr
  HLTV player-maps: R² 0.629, RMSE 7.06, bias +0.157
  HLTV careers: R² 0.839, RMSE 0.927, bias −0.0844

Firepower (252 HLTV careers):
  Firepower = −194 + 128⋅kpr + 1.3⋅adr + 406⋅mkpr
  HLTV careers: R² 0.974, RMSE 3.16, bias −0.0201

CS:GO ADR (5390 HLTV player-maps):
  CS:GO ADR = 2.61 + 81.4⋅kpr + 55.2⋅apr + 13.7⋅dpr
  HLTV player-maps: R² 0.868, RMSE 6.52, bias −0.000839

CS2 ADR (32097 FACEIT player-maps):
  CS2 ADR = −3.36 + 82.1⋅kpr + 46.3⋅apr + 17.4⋅dpr
  FACEIT player-maps: R² 0.868, RMSE 7.73, bias −0.00096

2KPR (32097 FACEIT player-maps):
  2KPR = −0.0822 + 0.367⋅kpr − 1.02⋅3kpr − 1.36⋅4kpr − 1.7⋅5kpr
  FACEIT player-maps: R² 0.663, RMSE 0.0458, bias −0.0000118
```

## How far to trust it

On HLTV's numbers, the formula is typically (RMSE) 0.011 off a career's Rating 2.0 and 0.065 off a single map's, with 12% of maps off by more than 0.1. HLTV's own inputs (KAST, KPR, DPR, Impact, ADR) fit careers within 0.004, and rounding to two decimals alone costs 0.003, so the data really is Rating 2.0. What's left is KAST, opening kills and clutches, which FACEIT's map history doesn't report. KAST alone would bring single maps to 0.055.

From FACEIT's own stats, the whole chain checks out on 49 CS:GO pro maps from 2023 outside the training maps: the app rates them 0.002 low on average (95% interval −0.007 to +0.003), and is typically 0.077 off on a single map.

What can't be checked:

- **CS2.** HLTV now shows Rating 3.0 on every CS2 map, so there's no Rating 2.0 to check against. CS2 has about 50% more assists than CS:GO on both sites, and the formula takes them as they come: the same players rate 0.017 higher in CS2 at equal kills and deaths. HLTV's own Rating 2.0 drifted up in CS2 the same way, until Rating 2.1 recalibrated it in October 2024.
- **Pubs.** Stat by stat, FACEIT maps fall within the range of pro maps, but 9% of them lie outside the region that holds 99% of pro maps, mostly for their assists. For pubs, the formula is HLTV's extrapolated, and so is its scale: an average FACEIT player, with as many kills as deaths, rates about 1.08.

Some estimates add a little noise, without bias on average:

- On older FACEIT maps, the ADR and double kill estimates leave a map's rating off by 0.04, and a player's over 90 maps by 0.009, with a bias under 0.01 at any level.
- FACEIT's CS2 stats don't tell flash assists apart, so the conversion assumes the average share. For players who flash more or less than most, that leaves the rating off by 0.007 typically, and by 0.02 at most.
