# joselito

[![CI](https://github.com/breakzplatform/card/actions/workflows/ci.yml/badge.svg)](https://github.com/breakzplatform/card/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/joselito)](https://www.npmjs.com/package/joselito)

My business card, right in your terminal.

```sh
npx joselito
```

```
╭─────────────────── joseli.to ───────────────────╮
│                                                 │
│        __ _____                                 │
│     __|  |     |                                │
│    |  |  |  |  |                                │
│    |_____|_____|                                │
│     _____ _____                                 │
│    |   __|   __|                                │
│    |__   |   __|                                │
│    |_____|_____|                                │
│                                                 │
│   Joselito  (he/him)                            │
│   Developer Relations · Twilio                  │
│                                                 │
│       Web  https://joseli.to                    │
│     Email  eu@joseli.to                         │
│   Bluesky  https://bsky.app/profile/joseli.to   │
│    GitHub  https://github.com/breakzplatform    │
│                                                 │
│   Notion Ambassador                             │
│   Former GDG Recife chapter lead                │
│   and Community Manager (2014–2020)             │
│                                                 │
╰─────────────────────────────────────────────────╯
```

## Options

| Flag | Description |
| --- | --- |
| `--lang pt` | Print the card in Portuguese |
| `--no-color` | Print without colors |
| `-h`, `--help` | Show usage |

Colors are on in a TTY and off when piped. `NO_COLOR` and `FORCE_COLOR` are honored. In terminals that support them, links are clickable.

## Development

Requires Node.js 20 or newer. There are no runtime dependencies.

```sh
node bin/card.js    # print the card
npm test            # run the tests
npm pack && npx ./joselito-*.tgz   # try the published package locally
```

The card content lives in [`src/data.js`](src/data.js) and the renderer in [`src/render.js`](src/render.js).
