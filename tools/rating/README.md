# HLTV rating, reverse-engineered

> Here, we only reverse engineer Rating 2.0. With the (limited) data I have from FACEIT API, it's not feasible to accurately predict Rating 3.0 and Rating 2.1 since those account for entry duels, clutches, saves, etc. Rating 1.0 is too simple and not relevant anymore, so Rating 2.0 is the sweet spot.

First, I collected enough stats samples to fit my linear regression models. I scraped everything relevant to the calculus: KPR, APR, DPR, ADR, MKPR (Multi-Kill per Round) and target features like Rating, KAST and Firepower. All features except Rating 2.0 were pulled from players’ all-time stats. To include only Rating 2.0 (and not Rating 1.0 or 3.0), I filtered by a start date of June 2017 (release date of Rating 2.0) and skipped "new" players who only have Rating 3.0 as their all-time metric.

Second, I fit linear regression models to derive formulae for each target. Feature selection was guided by common sense and official HLTV insights.

I tested each linear regression on test data, and the predicted values line up closely with HLTV’s official stats. With high R² and low RMSE across all targets, these formulae reliably approximate Rating 2.0, KAST, ADR, 2KPR, and Firepower for most players.

```
Rating:
Coefficients: [ 0.66254728  0.32206339 -0.76366454  0.00358291  0.76960035]
Intercept: 0.6818764962620703
R²: 0.9730815886456841
RMSE: 0.009010244174942708

KAST:
Coefficients: [ 14.59741003  39.57510705 -46.21062528]
Intercept: 85.77576693024515
R²: 0.798969938526896
RMSE: 0.7303498060142691

ADR:
Coefficients: [86.61895172 78.64156577]
Intercept: 3.3276314054649703
R²: 0.8308135189226806
RMSE: 1.8340792552208183

2KPR:
Coefficients: [ 2.79077598e-01 -7.86663351e-03  1.95105388e-04 -6.17993888e-01
 -9.46751056e-01  4.19746708e-01]
Intercept: -0.05357045289282321
R²: 0.9600547095924021
RMSE: 0.0017958080300913438

Firepower:
Coefficients: [160.34947296 -15.18186891   1.36153342 228.48279068]
Intercept: -187.0508572575841
R²: 0.980161062586509
RMSE: 2.4876504832818123
```

`Rating 2.0 = 0.682 + 0.663⋅kpr + 0.322⋅apr − 0.764⋅dpr + 0.00358⋅adr + 0.770⋅mkpr`<br>
`KAST = 85.776 + 14.597⋅kpr + 39.575⋅apr − 46.211⋅dpr`<br>
`ADR = 3.328 + 86.619⋅kpr + 78.642⋅apr`<br>
`2KPR = −0.054 + 0.279⋅kpr − 0.00787⋅apr + 0.000195⋅adr − 0.618⋅3kpr − 0.947⋅4kpr + 0.42⋅5kpr`<br>
`Firepower = −187.051 + 160.349⋅kpr − 15.182⋅apr + 1.362⋅adr + 228.483⋅mkpr`<br>

Some coefficients might look weird because of multicollinearity… but as long as the formulae work, I don’t care 🙃
