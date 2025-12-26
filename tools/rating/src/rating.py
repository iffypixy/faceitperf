import math
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, mean_squared_error
from sklearn.model_selection import train_test_split

df = pd.read_csv("./data/stats_all.csv")
df["mkpr"] = df["2kpr"] + df["3kpr"] + df["4kpr"] + df["5kpr"]

def train_model(X, y, name):
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = LinearRegression()
    model.fit(X_train, y_train)
    predicted = model.predict(X_test)

    print(f"\n{name}:")
    print("Coefficients:", model.coef_)
    print("Intercept:", model.intercept_)
    print("R²:", r2_score(y_test, predicted))
    print("RMSE:", math.sqrt(mean_squared_error(y_test, predicted)))

    return model.predict(X)

df["kast_pred"] = train_model(df[["kpr", "apr", "dpr"]], df["kast"], "KAST")
df["adr_pred"] = train_model(df[["kpr", "apr"]], df["adr"], "ADR")
df["2kpr_pred"] = train_model(df[["kpr", "apr", "adr", "3kpr", "4kpr", "5kpr"]], df["2kpr"], "2KPR")
df["firepower"] = train_model(df[["kpr", "apr", "adr", "mkpr"]], df["firepower"], "Firepower")
df["rating_pred"] = train_model(df[["kpr", "apr", "dpr", "adr", "mkpr"]], df["rating"], "Rating")
