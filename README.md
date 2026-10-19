# joselito

[![CI](https://github.com/breakzplatform/card/actions/workflows/ci.yml/badge.svg)](https://github.com/breakzplatform/card/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/joselito)](https://www.npmjs.com/package/joselito)

My business card, right in your terminal.

```sh
npx joselito
```

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ 
┃                                                               ┃░
┃  $ npx joselito                                               ┃░
┃                                                               ┃░
┃  joseli.to                                                    ┃░
┃                                                               ┃░
┃  Joselito                                                     ┃░
┃  i make websites (and things)                                 ┃░
┃  Twilio Champion                                              ┃░
┃  /ʒo.zeˈli.tu/ · he/him · Recife, Brazil                      ┃░
┃  ───────────────────────────────────────────────────────────  ┃░
┃  In the game since 2008: working remotely, building small     ┃░
┃  tools, and running my own services at home. I also empower   ┃░
┃  the tech communities around.                                 ┃░
┃                                                               ┃░
┃   ACCOUNTS                                                    ┃░
┃  LINKEDIN         https://www.linkedin.com/in/breakzplatform  ┃░
┃  BLUESKY          https://bsky.app/profile/joseli.to          ┃░
┃  GITHUB           https://github.com/breakzplatform           ┃░
┃  ORCID            https://orcid.org/0009-0009-2564-0761       ┃░
┃                                                               ┃░
┃   SUPPORT                                                     ┃░
┃  BUY ME A COFFEE  https://buymeacoffee.com/joselito           ┃░
┃                                                               ┃░
┃   CONTACT                                                     ┃░
┃  EMAIL            me@joseli.to                                ┃░
┃  CALENDAR         https://cal.joseli.to/me                    ┃░
┃  WEB              https://joselito.bio                        ┃░
┃                                                               ┃░
┃  ■                                                            ┃░
┃                                                               ┃░
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛░
 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
```

## Options

| Flag | Description |
| --- | --- |
| `--lang pt` | Print the card in Portuguese |
| `--no-color` | Print plain text, no colors and no image |
| `--image <mode>` | Avatar image: `auto` (default), `kitty`, `iterm` or `off` |
| `-h`, `--help` | Show usage |

Colors are on in a TTY and off when piped. `NO_COLOR` and `FORCE_COLOR` are honored. In terminals that support them, links are clickable.

The card follows the terminal theme of the joseli.to design system: amber on black, in truecolor when `COLORTERM` is `truecolor` or `24bit` and in the nearest 256 colors otherwise.

### Inline avatar

Terminals with inline images show the avatar inside the card:

- kitty graphics protocol: kitty, Ghostty
- iTerm2 inline images: iTerm2, WezTerm

Everywhere else, and always when piped, with `NO_COLOR`/`--no-color`, inside tmux or screen, or when the window is too short for the card, the text card above is printed. The image is a 2 KB PNG embedded in [`src/avatar.js`](src/avatar.js), so the card works offline. `scripts/build-avatar.sh` regenerates it (needs ImageMagick).

## Development

Requires Node.js 20 or newer. There are no runtime dependencies.

```sh
node bin/card.js    # print the card
npm test            # run the tests
npm pack && npx ./joselito-*.tgz   # try the published package locally
```

The card content lives in [`src/data.js`](src/data.js) and mirrors [joselito.bio](https://joselito.bio). The layout is in [`src/render.js`](src/render.js) and terminal detection in [`src/terminal.js`](src/terminal.js).
