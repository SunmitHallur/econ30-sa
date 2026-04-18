# SA integration regression battery

- Specifications estimated: **630**
- Specifications with at least one coefficient significant at 5% (raw): **364**
- Specifications still significant after Bonferroni: **183**
- Specifications still significant after Benjamini-Hochberg (q=0.05): **316**


> **Caveats.** n ≤ 35 annual observations, single country. All OLS estimates use Newey-West HAC SEs (lag 3). Adjusted p-values account for multiple testing across every spec in the battery. None of these specifications identify causal effects; they correlate policy, macro, inequality and governance series over the post-apartheid period. Causal claims in the essay still rely on the Knowledge Base papers.


## Headline results (raw p < 0.05, sorted by adjusted p)

| # | Outcome | Regressors | n | R² | DW | min p (raw) | p (Bonf) | p (BH) | Sample |
|---|---------|------------|---|----|----|-------------|----------|--------|--------|
| 1 | Top-10% income share | GDP growth (%), Bottom-50% income share | 34 | 0.975 | 0.46 | 0.0000 | 0.000 | 0.000 | full |
| 2 | Bottom-50% income share | Top-10% income share | 33 | 0.972 | 0.22 | 0.0000 | 0.000 | 0.000 | no_gfc |
| 3 | Top-10% income share | Bottom-50% income share, Top-10% wealth share | 35 | 0.971 | 0.17 | 0.0000 | 0.000 | 0.000 | full |
| 4 | Top-10% income share | Bottom-50% income share | 33 | 0.972 | 0.21 | 0.0000 | 0.000 | 0.000 | no_gfc |
| 5 | Bottom-50% income share | Top-10% income share | 35 | 0.971 | 0.19 | 0.0000 | 0.000 | 0.000 | full |
| 6 | Bottom-50% income share | GDP growth (%), Top-10% income share | 34 | 0.975 | 0.48 | 0.0000 | 0.000 | 0.000 | full |
| 7 | Bottom-50% income share | Top-10% income share, Top-10% wealth share | 35 | 0.971 | 0.18 | 0.0000 | 0.000 | 0.000 | full |
| 8 | Top-10% income share | Bottom-50% income share | 35 | 0.971 | 0.18 | 0.0000 | 0.000 | 0.000 | full |
| 9 | Top-10% income share | FDI / GDP, Bottom-50% income share | 34 | 0.970 | 0.18 | 0.0000 | 0.000 | 0.000 | full |
| 10 | Bottom-50% income share | FDI / GDP, Top-10% income share | 34 | 0.970 | 0.20 | 0.0000 | 0.000 | 0.000 | full |
| 11 | Top-10% income share | Bottom-50% income share | 30 | 0.966 | 0.19 | 0.0000 | 0.000 | 0.000 | no_covid |
| 12 | Bottom-50% income share | Top-10% income share | 30 | 0.966 | 0.20 | 0.0000 | 0.000 | 0.000 | no_covid |
| 13 | Top-10% income share | Unemployment (ILO, %), Bottom-50% income share | 33 | 0.971 | 0.25 | 0.0000 | 0.000 | 0.000 | full |
| 14 | log GDP per capita | Top-10% income share | 30 | 0.950 | 0.61 | 0.0000 | 0.000 | 0.000 | no_covid |
| 15 | Top-10% income share | log GDP per capita, Top-10% wealth share | 34 | 0.948 | 0.81 | 0.0000 | 0.000 | 0.000 | full |
| 16 | log GDP per capita | Unemployment (ILO, %), Top-10% income share | 33 | 0.955 | 0.91 | 0.0000 | 0.000 | 0.000 | full |
| 17 | Bottom-50% income share | log GDP per capita, Top-10% income share | 34 | 0.975 | 0.27 | 0.0000 | 0.000 | 0.000 | full |
| 18 | Top-10% income share | Trade / GDP, Bottom-50% income share | 34 | 0.973 | 0.33 | 0.0000 | 0.000 | 0.000 | full |
| 19 | log GDP per capita | FDI / GDP, Top-10% income share | 34 | 0.922 | 0.57 | 0.0000 | 0.000 | 0.000 | full |
| 20 | Top-10% income share | log GDP per capita | 32 | 0.942 | 0.58 | 0.0000 | 0.000 | 0.000 | no_gfc |
| 21 | log GDP per capita | Top-10% income share, Top-10% wealth share | 34 | 0.954 | 0.83 | 0.0000 | 0.000 | 0.000 | full |
| 22 | Bottom-50% income share | Unemployment (ILO, %), Top-10% income share | 33 | 0.975 | 0.29 | 0.0000 | 0.000 | 0.000 | full |
| 23 | Top-10% income share | log GDP per capita, FDI / GDP | 34 | 0.924 | 0.65 | 0.0000 | 0.000 | 0.000 | full |
| 24 | Top-10% income share | log GDP per capita | 30 | 0.950 | 0.62 | 0.0000 | 0.000 | 0.000 | no_covid |
| 25 | Top-10% income share | GDP growth (%), Top-1% income share | 34 | 0.930 | 0.66 | 0.0000 | 0.000 | 0.000 | full |
| 26 | Trade / GDP | Top-1% income share | 30 | 0.852 | 1.65 | 0.0000 | 0.000 | 0.000 | no_covid |
| 27 | log GDP per capita | Top-10% income share | 32 | 0.942 | 0.59 | 0.0000 | 0.000 | 0.000 | no_gfc |
| 28 | log GDP per capita | GDP growth (%), Top-10% income share | 34 | 0.924 | 0.41 | 0.0000 | 0.000 | 0.000 | full |
| 29 | log GDP per capita | Bottom-50% income share | 30 | 0.891 | 0.37 | 0.0000 | 0.000 | 0.000 | no_covid |
| 30 | log GDP per capita | Top-10% income share | 34 | 0.920 | 0.48 | 0.0000 | 0.000 | 0.000 | full |
| 31 | log GDP per capita | Unemployment (ILO, %), Bottom-50% income share | 33 | 0.907 | 0.61 | 0.0000 | 0.000 | 0.000 | full |
| 32 | Top-10% income share | log GDP per capita | 34 | 0.920 | 0.47 | 0.0000 | 0.000 | 0.000 | full |
| 33 | Top-1% income share | GDP growth (%), Top-10% income share | 34 | 0.931 | 0.68 | 0.0000 | 0.000 | 0.000 | full |
| 34 | Top-10% income share | log GDP per capita, Unemployment (ILO, %) | 33 | 0.965 | 0.94 | 0.0000 | 0.000 | 0.000 | full |
| 35 | Top-10% income share | log GDP per capita, GDP growth (%) | 34 | 0.924 | 0.41 | 0.0000 | 0.000 | 0.000 | full |
| 36 | Bottom-50% income share | Trade / GDP, Top-10% income share | 34 | 0.970 | 0.19 | 0.0000 | 0.000 | 0.000 | full |
| 37 | Trade / GDP | Top-1% income share | 34 | 0.801 | 1.18 | 0.0000 | 0.000 | 0.000 | full |
| 38 | Trade / GDP | GDP growth (%), Top-1% income share | 34 | 0.802 | 1.15 | 0.0000 | 0.000 | 0.000 | full |
| 39 | log GDP per capita | Bottom-50% income share | 32 | 0.890 | 0.38 | 0.0000 | 0.000 | 0.000 | no_gfc |
| 40 | log GDP per capita | FDI / GDP, Bottom-50% income share | 34 | 0.857 | 0.36 | 0.0000 | 0.000 | 0.000 | full |

## Chow tests for structural break at 1996 (GEAR)

| Outcome | Regressors | n | F | p |
|---------|------------|---|---|---|
| Unemployment (ILO, %) | Trade / GDP | 33 | 1.017 | 0.3743 |
| GDP growth (%) | Trade / GDP | 34 | 1.894 | 0.1681 |
| Top-10% income share | Trade / GDP | 34 | 1.473 | 0.2455 |
| Top-10% income share | FDI / GDP | 34 | 12.415 | 0.0001 |
| log GDP per capita | Trade / GDP | 34 | 0.421 | 0.6605 |

## Engle-Granger cointegration

| y | x | n | ADF y p | ADF x p | EG t | EG p |
|---|---|---|---------|---------|------|------|
| log GDP per capita | Trade / GDP | 34 | 0.792 | 0.637 | -2.090 | 0.4815 |
| Top-10% income share | Trade / GDP | 34 | 0.624 | 0.637 | -3.230 | 0.0650 |
| Unemployment (ILO, %) | Trade / GDP | 33 | 0.967 | 0.502 | -1.139 | 0.8731 |
| Top-10% wealth share | FDI / GDP | 34 | 0.116 | 0.000 | -2.541 | 0.2615 |

## Granger causality (p by lag)

| Direction | n | lag 1 | lag 2 | lag 3 |
|-----------|---|-------|-------|-------|
| Does Trade / GDP Granger-cause Unemployment (ILO, %)? | 33 | 0.586 | 0.068 | 0.096 |
| Does Unemployment (ILO, %) Granger-cause Trade / GDP? | 33 | 0.059 | 0.153 | 0.297 |
| Does Trade / GDP Granger-cause Top-10% income share? | 34 | 0.861 | 0.742 | 0.858 |
| Does Top-10% income share Granger-cause Trade / GDP? | 34 | 0.004 | 0.001 | 0.001 |
| Does FDI / GDP Granger-cause GDP growth (%)? | 34 | 0.560 | 0.757 | 0.590 |
| Does Top-10% income share Granger-cause WGI governance (avg, 0-1)? | 27 | 0.807 | 0.094 | 0.029 |
