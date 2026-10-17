import json
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, root_mean_squared_error
from sklearn.model_selection import GroupKFold, cross_val_predict

def load_hltv(path):
    collection = json.load(open(path))
    return pd.concat([load_hltv_maps(collection["maps"]), load_hltv_careers(collection["careers"])])

def load_hltv_maps(maps):
    # A map with a substitute lists 11 players, without how many rounds each of them played.
    df = pd.DataFrame([
        {"group": m["path"], "rounds": sum(map(int, m["score"])), **p}
        for m in maps if len(m["players"]) == 10 for p in m["players"]
    ])
    # Scoreboards pair kills with headshots, as in "21 (9)", deaths with trades, and assists with
    # flash assists, which HLTV's assists per round leave out.
    first = lambda col: df[col].str.extract(r"^(\d+)")[0].astype(int)
    assists = df["assists"].str.extract(r"^(\d+) \((\d+)\)$").astype(int)
    return pd.DataFrame({
        "kind": "HLTV player-maps",
        "group": df["group"],
        "weight": 1,
        "kpr": first("kills") / df["rounds"],
        "apr": (assists[0] - assists[1]) / df["rounds"],
        "dpr": first("deaths") / df["rounds"],
        "adr": df["adr"].astype(float),
        "mkpr": df["multiKills"].astype(int) / df["rounds"],
        "kast": df["kast"].str.rstrip("%").astype(float),
        "rating": df["rating"].astype(float),
    })

def load_hltv_careers(careers):
    df = pd.DataFrame([{"group": c["id"], **c["individual"], **c["overview"]} for c in careers])
    number = lambda col: df[col].str.split("/").str[0].str.rstrip("%").astype(float)
    # The shortest careers are noisier, as their few maps don't average out.
    df = df[number("Rounds played") >= 1000]
    rounds = number("Rounds played")
    return pd.DataFrame({
        "kind": "HLTV careers",
        "group": df["group"],
        # A career's rating is off by about 0.01 whatever its length, against 0.065 for a single
        # map, so a career weighs as much as 40 maps.
        "weight": 40,
        "kpr": number("Total kills") / rounds,
        "apr": number("Assists / round"),
        "dpr": number("Total deaths") / rounds,
        "adr": number("Damage / Round"),
        "mkpr": sum(number(f"{n} kill rounds") for n in range(2, 6)) / rounds,
        "kast": number("KAST"),
        "rating": number("rating"),
        "firepower": number("firepower"),
    })

def load_faceit(path):
    df = pd.read_csv(path)
    df["kind"], df["group"], df["weight"] = "FACEIT player-maps", df["player"], 1
    df["kpr"] = df["kills"] / df["rounds"]
    df["apr"] = df["assists"] / df["rounds"]
    df["dpr"] = df["deaths"] / df["rounds"]
    for n in ["2", "3", "4", "5"]:
        df[f"{n}kpr"] = df[f"{n}k"] / df["rounds"]
    return df

# Each fit is scored on the rows it was not trained on, by 5-fold cross-validation. Rows are folded
# by map or player, as the rows of one map or of one player resemble each other.
def train_model(df, features, target, name):
    X, y, w = df[features], df[target], df["weight"]
    predicted = cross_val_predict(
        LinearRegression(), X, y, cv=GroupKFold(5), groups=df["group"], params={"sample_weight": w}
    )
    model = LinearRegression().fit(X, y, sample_weight=w)

    intercept = f"{'−' if model.intercept_ < 0 else ''}{round3(abs(model.intercept_))}"
    terms = [f"{'−' if c < 0 else '+'} {round3(abs(c))}⋅{f}" for f, c in zip(features, model.coef_)]
    kinds = df.assign(predicted=predicted).groupby("kind", sort=False)
    print(f"\n{name} ({', '.join(f'{len(rows)} {kind}' for kind, rows in kinds)}):")
    print(f"  {name} = {intercept} {' '.join(terms)}")
    for kind, rows in kinds:
        y, p = rows[target], rows["predicted"]
        bias = (p - y).mean()
        print(
            f"  {kind}: R² {r2_score(y, p):.3f}, RMSE {round3(root_mean_squared_error(y, p))}, "
            f"bias {'−' if bias < 0 else '+'}{round3(abs(bias))}"
        )

def round3(x):
    return np.format_float_positional(x, precision=3, unique=False, fractional=False, trim="-")

# FACEIT's CS2 stats count about 60% of the flash assists that HLTV and FACEIT's CS:GO stats leave
# out, and a little more damage, as the same pro maps show on both sites. HLTV's stats are converted
# to FACEIT's CS2 ones before fitting, and the app converts CS:GO maps' assists likewise.
same = pd.read_csv("./data/faceit_hltv.csv")
same["hltv_non_flash_assists"] = same["hltv_assists"] - same["hltv_flash_assists"]
games = same.groupby("game", sort=False)
assists_scale = games["faceit_assists"].sum() / games["hltv_non_flash_assists"].sum()
adr_shift = games["faceit_adr"].mean() - games["hltv_adr"].mean()
print("FACEIT vs HLTV, on the same pro maps:")
for game, n in games.size().items():
    adr = "" if np.isnan(adr_shift[game]) else f", {adr_shift[game]:+.2f} ADR"
    print(f"  {game} ({n} player-maps): {assists_scale[game]:.3f}× the assists{adr}")
print(f"  so CS:GO assists count the CS2 way at {round3(assists_scale['cs2'] / assists_scale['csgo'])}×")

# Rating 2.0 stats from June 2017 until CS2 replaced CS:GO in September 2023.
pros = load_hltv("./data/hltv.json")
pros["apr"] *= assists_scale["cs2"]
pros["adr"] += adr_shift["cs2"]
# HLTV rates a career on its totals, and rating curves upwards with damage. As a straight line, the
# formula would rate single maps 0.01 low and careers, whose totals sit mid-curve, 0.005 high.
pros["adr²"] = pros["adr"] ** 2
train_model(pros, ["kpr", "apr", "dpr", "adr", "adr²", "mkpr"], "rating", "Rating")
train_model(pros, ["kpr", "apr", "dpr"], "kast", "KAST")
train_model(pros[pros["kind"] == "HLTV careers"], ["kpr", "adr", "mkpr"], "firepower", "Firepower")

# For FACEIT's CS:GO maps, which have no ADR. CS:GO maps had more damage for the same kills, assists
# and deaths, so the CS2 estimate below doesn't carry over.
train_model(pros[pros["kind"] == "HLTV player-maps"], ["kpr", "apr", "dpr"], "adr", "CS:GO ADR")

# For FACEIT's CS2 maps from before late June 2024, which lack ADR and double kills.
faceit = load_faceit("./data/faceit.csv")
train_model(faceit, ["kpr", "apr", "dpr"], "adr", "CS2 ADR")
train_model(faceit, ["kpr", "3kpr", "4kpr", "5kpr"], "2kpr", "2KPR")
