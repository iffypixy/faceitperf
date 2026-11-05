# faceitperf

Your FACEIT stats, HLTV style.

![Looking up a player, sorting their maps by rating and opening their best match](.github/demo.gif)

Look up any FACEIT player and see their games the way HLTV shows them: Rating 2.0, KAST, ADR and more, map by map.

FACEIT has no Rating 2.0, so faceitperf recreates it from HLTV's own data. On pro careers, it lands within about 0.01 of HLTV's number. [Here's how.](tools/rating/README.md)

## Run it yourself

```sh
pnpm install
cp apps/web/.env.sample apps/web/.env  # then fill it in
pnpm --filter web dev
```

## Contact

Questions or ideas? Message me on Telegram at [@iffypixy](https://t.me/iffypixy), or email ansat.euler@gmail.com.
