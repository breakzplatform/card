# npx joselito

[![npm](https://img.shields.io/npm/v/joselito?labelColor=000000&color=FFB000)](https://www.npmjs.com/package/joselito)
[![license](https://img.shields.io/npm/l/joselito?labelColor=000000&color=FFB000)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A520-FFB000?labelColor=000000)](package.json)

My business card, right in your terminal.

```sh
npx joselito
```

<a href="https://joselito.bio">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/card-dark.svg">
    <img src="assets/card.svg" width="100%" alt="The joselito terminal card: avatar, name, bio, accounts, support and contact links in amber on black">
  </picture>
</a>

## Options

| Flag | Description |
| --- | --- |
| `--lang pt` | Print the card in Portuguese |
| `--pix` | Copy the Pix key to the clipboard |
| `--no-color` | Plain text: no colors, no images |
| `--image <mode>` | Images: `auto` (default), `kitty`, `iterm` or `off` |
| `-h`, `--help` | Show usage |

Colors follow the terminal theme of the joseli.to design system, in truecolor when `COLORTERM` is `truecolor` or `24bit` and in 256 colors otherwise. They are off when piped; `NO_COLOR` and `FORCE_COLOR` are honored. Links are clickable where the terminal supports it.

## Inline images

The avatar and a larger wordmark show up in:

- kitty: kitty graphics, plus double-size text (OSC 66, kitty 0.40+) for the wordmark
- Ghostty: kitty graphics
- iTerm2, WezTerm: iTerm2 inline images

Pipes, `NO_COLOR`/`--no-color`, tmux/screen and windows too short for the card get the text card. The images are embedded, so the card works offline.

## Copying the Pix key

`--pix` sends the key through OSC 52 on terminals known to accept it and over SSH, and tries `pbcopy`, `clip.exe`, `wl-copy`, `xclip` and `xsel` locally. The key is always printed.

## Development

Requires Node.js 20 or newer. No runtime dependencies.

```sh
node bin/card.js                    # print the card
npm test                            # run the tests
npm pack && npx ./joselito-*.tgz    # try the package locally
```

Content lives in [`src/data.js`](src/data.js) and mirrors [joselito.bio](https://joselito.bio). Generated files, to rebuild after changing the card:

- `src/avatar.js`: `scripts/build-avatar.sh`
- `src/wordmark.js` and `assets/card*.svg`: `uv run --with fonttools --with brotli scripts/build-images.py`

Both need ImageMagick. Pushing a `v*` tag that matches `package.json` publishes to npm.

## License

[MIT](LICENSE)
