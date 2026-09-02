# The collaborative gift pages

Everything behind `/misc/baby/eng/` and `/misc/baby/ita/`.

Both pages are built from the same data by the same template. There is no
server, no database and nothing running at request time: the progress bars are
worked out by Jekyll when the site is built, so the numbers move only when you
edit a file and push. JavaScript is optional polish -- the page is complete and
usable with it switched off.

## Where things live

| File | What it is |
|---|---|
| `_data/gifts.yml` | **The gift list and every contribution.** This is the one you edit. |
| `_data/gifts_i18n.yml` | Every visible word, English and Italian. No copy lives in templates. |
| `_config.yml` → `gifts:` | Payment handles, IBAN parts, feature flags. |
| `_includes/gifts/page.html` | The template both pages share. |
| `_includes/gifts/money.html` | Formats a number as `€120.00` / `120,00 €`. |
| `assets/css/gifts.css` | All the styling. |
| `assets/js/gifts.js` | Progressive enhancement only. |
| `misc/baby/eng.md`, `misc/baby/ita.md` | Two-line pages that call the template. |
| `scripts/add-contribution.py` | Records a contribution for you. |
| `scripts/validate_gifts.rb` | Checks the data before it can break the page. |

## Recording a contribution

When money arrives:

```bash
python3 scripts/add-contribution.py
```

It lists the gifts with their current totals, asks for the gift id, date, who
gave it, how much, whether to show their name, and an optional private note.
It then appends the entry to `_data/gifts.yml` **without touching anything
else** — comments and formatting are preserved, because it edits the file as
text rather than re-writing the YAML — and prints the gift's new total,
percentage and remaining amount.

Then:

```bash
ruby scripts/validate_gifts.rb && git add _data/gifts.yml && git commit -m "Gift: contribution from ..." && git push
```

GitHub Pages rebuilds in a minute or two. Two things worth remembering:

- `show_name: false` still **counts toward the total**. It only changes the
  name to "Anonymous" in the thank-you list.
- The `name` field is for your records either way. It is never published when
  `show_name` is false.

Use `--dry-run` to see the entry without writing it.

## Adding a gift

Add a block to the `gifts:` list in `_data/gifts.yml`:

```yaml
  - id: high-chair              # lowercase slug, unique, NEVER change once public
    name: "Wooden high chair"
    name_it: "Seggiolone in legno"
    description: "One he can use at the table with us."
    description_it: "Uno che può usare a tavola con noi."
    image: /assets/img/gifts/high-chair.jpg   # optional
    link: https://example.com/product          # optional
    target: 150.00
    status: open
    contributions: []
```

- `id` ends up in the page anchor (`#gift-high-chair`) and in the payment
  reference people write on their transfer. Changing it later breaks the links
  you have already sent people and orphans the reference on your bank
  statement, so pick it once.
- `name_it` and `description_it` are optional. Leave them out and the Italian
  page falls back to the English text.
- Images go in `assets/img/gifts/`. The validator fails if the file is missing.
  Without an image the card shows a tasteful 🎁 placeholder — that is a fine
  permanent choice, not a stopgap.
- The payment reference is deliberately the **same in both languages** (it uses
  the base `name`, never `name_it`), so one string identifies the gift on your
  statement no matter which page the sender used.

## Gift states

`status:` takes one of four values.

| `status` | What the visitor sees |
|---|---|
| `open` | Progress bar, contribute button, all payment paths. |
| `funded` | Green ✓ badge, bar at 100% with a stripe, no contribute button, a link back to the gifts still open. |
| `closed` | Card greyed out with a short closing note. Nobody can contribute. |
| `hidden` | Not rendered at all. Use it to draft a gift before announcing it. |

A gift whose contributions reach its target **renders as funded automatically**,
even while `status` still says `open` — the page can never invite money for
something already paid for. The validator warns you when that happens so you
can set `status: funded` and make the data say what the page shows.

**Closing a gift**: set `status: closed`. Use this when you have decided not to
buy it after all; use `funded` when you have. Overfunding is allowed — the bar
caps at 100% but the real total is shown, along with a line acknowledging it.

## Previewing locally

```bash
bundle exec jekyll serve
```

Then open <http://127.0.0.1:4000/misc/baby/eng/>.

**This currently fails on this Mac.** The system Ruby is 2.6.10 and `bundle
install` cannot resolve dependencies against it (`ffi` needs Ruby ≥ 3.0). There
is also a Command Line Tools mismatch: the Ruby 2.6 headers ship under
`universal-darwin25` while the build looks for them in `universal-darwin24`, so
native gems fail to compile even once dependencies resolve.

The clean fix is a modern Ruby that does not touch the system one:

```bash
brew install ruby
```

then put Homebrew's Ruby ahead of `/usr/bin/ruby` on your `PATH` and run
`bundle install` again. Nothing in this feature depends on the Ruby version —
it is only about being able to preview before pushing.

If you would rather not install anything, push to a branch and let the
`Beautiful Jekyll CI` workflow build it.

## Checking the data

```bash
ruby scripts/validate_gifts.rb
```

Uses only Ruby's standard library, so it runs on the system Ruby with nothing
installed. It checks that the file parses, that required fields are present,
that ids are unique and slug-shaped, that targets and amounts are positive, that
`show_name` is a real boolean, that `status` is one of the four allowed values,
that referenced images actually exist, and that the English and Italian blocks
in `gifts_i18n.yml` have exactly the same keys — a missing Italian key would
render as a blank space on the page.

The same script runs in GitHub Actions (`.github/workflows/validate-gifts.yml`)
whenever the gift data changes, and fails the build on any error.

## Changing the bank details

The IBAN is not written into the page as plain text. It is split into three
chunks, base64-encoded in `_config.yml`, and reassembled by JavaScript only
when a visitor clicks "Show the bank details". With JavaScript off, the page
offers a `mailto:` link to ask you for them instead.

Be clear-eyed about what this does: it stops casual scraping, not a determined
reader. That is fine, because an IBAN is not a secret — money cannot be pulled
from an account with it alone. A transfer has to be authorised by the sender,
and a direct debit needs a mandate you have signed. The page says so.

To change accounts:

```bash
python3 - <<'EOF'
import base64
iban = "LT763250086269420261"        # no spaces
print([base64.b64encode(p.encode()).decode()
       for p in (iban[0:8], iban[8:15], iban[15:])])
EOF
```

Paste the three strings into `gifts.iban_parts` in `_config.yml`, and update
`gifts.account_holder` if the name changed.

## Path D — sending a PayPal money request

Off by default. It exists for relatives who will not manage any of the other
routes: they send you their email address, you send them a PayPal money
request, and they pay it **by card without creating a PayPal account**. It
costs you a manual step per person, which is why it is off and why it sits last
and visually quiet on the page.

Turn it on in `_config.yml`:

```yaml
gifts:
  path_d: true
```

With no `form_endpoint` set it renders as a `mailto:` link, so no third party is
involved. Then, when a request arrives:

1. Sign in at <https://www.paypal.com> and choose **Send and Request** →
   **Request a payment** (labelled *Create an invoice or request money*).
2. Enter their email address.
3. Enter the amount in EUR and put the gift name in the note, matching the
   reference the page uses, e.g. `Gift: Lovevery Play Kit`.
4. Send it. They get an email with a **Pay now** button and can pay by card as
   a guest.
5. When the money lands, record it the normal way with
   `scripts/add-contribution.py`.

Two things to know before you switch it on. A money request is a *commercial*
payment, so unlike the friends-and-family route **PayPal takes a fee** from what
you receive — the convenience is paid for by you, not the sender. And enabling
it means collecting email addresses through the page, so only turn it on if you
are willing to handle those.

## Things deliberately not built

No automatic payment detection, no webhooks, no PayPal IPN or Transaction
Search, no Revolut API, no card processor, no accounts, no analytics, no
cookies, no third-party JavaScript. The bars move when you edit the file. That
is the whole design, and it is why the page has no running costs and nothing
that can quietly break.

## Two things still to write

`_data/gifts_i18n.yml` has two `TODO:` entries under `smallprint`, shown on the
live page exactly as written:

- **`surplus`** — what happens if a gift is overfunded.
- **`unfilled`** — what happens if a gift never fills up.

Both are promises about other people's money, so they are left for you to word
rather than guessed at. They are visible on the page right now — worth
replacing before you share the link.

The Italian copy was drafted for review, not written by a native speaker.
Read it through and make it sound like you.
