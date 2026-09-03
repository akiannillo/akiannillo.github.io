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

## Commands

```bash
ruby scripts/validate_gifts.rb          # stdlib only, runs on system Ruby
python3 scripts/add-contribution.py     # record a contribution, stdlib only
bundle exec jekyll serve                # see Environment gotchas first
```

Routine update when money arrives:

```bash
python3 scripts/add-contribution.py && ruby scripts/validate_gifts.rb && \
  git add _data/gifts.yml && git commit -m "Gift: contribution from ..." && git push
```
