# akiannillo.github.io

Personal academic site built on the Beautiful Jekyll theme, served by GitHub
Pages from the `master` branch. Pushing to `master` publishes; there is no
deploy job — `.github/workflows/ci.yml` only builds an artifact.

## Environment gotchas

These cost real time. Read them before trying to preview.

- **`bundle exec jekyll serve` does not work out of the box on this Mac.** The
  system Ruby is 2.6.10 and `bundle install` cannot resolve against it (`ffi`
  needs Ruby >= 3.0). `brew install ruby` and put it ahead of `/usr/bin/ruby`
  on `PATH` is the real fix.
- **Working preview route: Docker.** Docker Desktop is installed but usually
  not running; `open -a Docker` starts it (wait for `docker info` to succeed).
  Then:

  ```bash
  docker run -d --name akisite -p 4000:4000 -v "$PWD":/srv/site \
    -v akisite-gems:/usr/local/bundle -w /srv/site ruby:3.3 \
    bash -c "bundle install && bundle exec jekyll serve --host 0.0.0.0 --port 4000 --force_polling"
  ```

  First run pulls the image and installs gems (a few minutes); the
  `akisite-gems` volume caches them so later runs start in seconds. The site
  is at <http://127.0.0.1:4000/misc/baby/eng/>, rebuilds on file changes, and
  `docker rm -f akisite` stops it. Nothing on the host is touched.
- **Command Line Tools header mismatch.** The CLT ships the Ruby 2.6 headers
  under `universal-darwin25` while native gem builds look for
  `universal-darwin24`, so every native extension fails to compile even once
  dependencies resolve. Workaround without touching the system: copy the
  header tree somewhere writable, add a `universal-darwin24` copy alongside
  the `25` one, and point `RbConfig::CONFIG['rubyhdrdir']` at it via
  `RUBYOPT=-r<patch>.rb`.
- **`git push` over `origin` fails non-interactively.** `origin` is an HTTPS
  remote and the osxkeychain helper cannot prompt. An SSH key for GitHub
  already exists (`~/.ssh/aki-github`, configured in `~/.ssh/config`), so push
  with the SSH URL explicitly, or fix it permanently:
  `git remote set-url origin git@github.com:akiannillo/akiannillo.github.io.git`

## Conventions

- **Never commit internal notes into the published site.** Markdown files
  without YAML front matter are copied verbatim into `_site` and served. Any
  internal doc must be added to `exclude:` in `_config.yml` — `CLAUDE.md`,
  `memory.md` and `misc/baby/gifts/README.md` already are.
- **Liquid tags break on `}`.** Liquid's tokenizer ends a `{{ ... }}` tag at
  the first `}`, even inside a quoted string, so `{{ x | replace: '%{name}' }}`
  is a syntax error. Interpolation markers in `_data/*.yml` use `%NAME%` style
  for this reason — do not reintroduce braces.
- **The gift pages must work with JavaScript disabled.** Progress bars are
  computed in Liquid at build time; JS is progressive enhancement only. No
  third-party JavaScript, analytics, trackers or cookies anywhere on the site.
- **No visual verification is possible from the CLI here** — no browser
  automation, and no Xcode (Command Line Tools only, so no iOS Simulator).
  Layout changes must be checked by the user on a real device; say so rather
  than implying a page was seen.

## The collaborative gift pages

`/misc/baby/eng/` and `/misc/baby/ita/` — one template, two languages, shared
data. Full documentation in `misc/baby/gifts/README.md`; read it before
touching them.

- `_data/gifts.yml` — the gift list and every contribution. Editing this is the
  routine task; nothing else needs to change.
- `_data/gifts_i18n.yml` — every visible string, English and Italian. Templates
  contain no copy of their own.
- Payment paths are **Revolut and bank transfer only**. PayPal was removed
  deliberately. Bank transfer is not optional: it is the uncapped, no-account
  path, because Revolut caps card *receiving* at EUR 1,160 per rolling 30 days
  shared across all senders. Do not write copy promising cards work for
  everyone.
- **Revolut links take the amount in cents**: `?amount=8980` is EUR 89.80.
  These query parameters are undocumented and were read off revolut.me's own
  bundle.
- **The "tell us" confirmation form is load-bearing, not a nicety.** Nothing on
  the site can see the bank or Revolut account; the bar only moves when the
  giver emails and someone runs `add-contribution.py`. It is also the only
  place people can ask to be shown as Anonymous. Copy must state that reason
  plainly — do not invent failure modes such as "payment notes get lost".
- Copy lives only in `_data/gifts_i18n.yml`; after editing it, check it still
  parses with `ruby -ryaml -e 'YAML.load_file("_data/gifts_i18n.yml")'`.

## Adding a gift from a product URL

The routine request is "add this present: <url>". Fetch the page for the
name, price and image, then append a block to `_data/gifts.yml` (format in
`misc/baby/gifts/README.md`). Set `target` to the shop price to the cent.

Product images go in `assets/img/gifts/<id>.jpg`, roughly 900 px on the long
side, JPEG, white background, to match the existing cards. Tooling notes:

- No ImageMagick or Pillow on the host. `sips` handles resize and AVIF/PNG to
  JPEG (`sips -Z 900 -s format jpeg -s formatOptions 85 in --out out.jpg`).
- `sips` flattens transparency to **black**. Shop CDNs (Bugaboo's Demandware
  in particular) serve cut-outs with an alpha channel, so check the result;
  if the background is black, flatten on white with Pillow in a throwaway
  container: `docker run --rm -v "$DIR":/w python:3-slim sh -c "pip -q
  install pillow && python -c '...'"`.
- Bugaboo's image service ignores `sfrm=jpg`; ask for `.png?sfrm=png` and
  flatten yourself.

Italian `name_it` / `description_it` drafted here must be flagged for the
user's review, never presented as final.

## Commands

```bash
ruby scripts/validate_gifts.rb          # stdlib only, runs on system Ruby
python3 scripts/add-contribution.py     # record a contribution, stdlib only
bundle exec jekyll serve                # fails on this Mac; use the Docker route in Environment gotchas
```

Routine update when money arrives:

```bash
python3 scripts/add-contribution.py && ruby scripts/validate_gifts.rb && \
  git add _data/gifts.yml && git commit -m "Gift: contribution from ..." && git push
```
