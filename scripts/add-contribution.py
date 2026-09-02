#!/usr/bin/env python3
"""Record a contribution in _data/gifts.yml.

Standard library only -- no pip, no virtualenv, nothing to install.

The file is edited as text rather than parsed and re-dumped, because a YAML
round-trip would strip every comment and reflow the whole file. Only the lines
for the new entry are inserted; everything else is left byte-for-byte alone.

    python3 scripts/add-contribution.py

Options:
    --file PATH   operate on a different data file (default: _data/gifts.yml)
    --dry-run     show what would be inserted, write nothing
"""

import argparse
import datetime
import os
import re
import sys

DEFAULT_FILE = os.path.join("_data", "gifts.yml")

GIFT_RE = re.compile(r"^  - id:\s*(\S+)\s*$")
TARGET_RE = re.compile(r"^    target:\s*([0-9]+(?:\.[0-9]+)?)\s*$")
NAME_RE = re.compile(r"^    name:\s*(.+?)\s*$")
CONTRIB_KEY_RE = re.compile(r"^    contributions:\s*(\[\s*\])?\s*$")
AMOUNT_RE = re.compile(r"^\s+amount:\s*([0-9]+(?:\.[0-9]+)?)\s*$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class Gift(object):
    def __init__(self, gift_id, start):
        self.id = gift_id
        self.start = start          # index of the "- id:" line
        self.end = None             # index one past the last line of the block
        self.name = None
        self.target = None
        self.contrib_line = None    # index of the "contributions:" line
        self.contrib_inline_empty = False
        self.contrib_end = None     # index one past the last contribution line
        self.total = 0.0
        self.count = 0


def parse(lines):
    """Locate each gift block and the extent of its contributions list."""
    gifts = []
    for i, line in enumerate(lines):
        m = GIFT_RE.match(line)
        if m:
            if gifts:
                gifts[-1].end = i
            gifts.append(Gift(m.group(1), i))
    if gifts:
        gifts[-1].end = len(lines)

    for g in gifts:
        for i in range(g.start, g.end):
            line = lines[i]
            if g.name is None:
                m = NAME_RE.match(line)
                if m:
                    g.name = m.group(1).strip('"\'')
            m = TARGET_RE.match(line)
            if m:
                g.target = float(m.group(1))
            m = CONTRIB_KEY_RE.match(line)
            if m:
                g.contrib_line = i
                g.contrib_inline_empty = bool(m.group(1))

        if g.contrib_line is not None and not g.contrib_inline_empty:
            end = g.contrib_line + 1
            for i in range(g.contrib_line + 1, g.end):
                stripped = lines[i].strip()
                # Contribution entries are indented deeper than the key itself.
                if stripped == "" or lines[i].startswith("      "):
                    if stripped:
                        end = i + 1
                else:
                    break
            g.contrib_end = end
        elif g.contrib_line is not None:
            g.contrib_end = g.contrib_line + 1

        for i in range(g.contrib_line or g.start, g.end):
            m = AMOUNT_RE.match(lines[i])
            if m:
                g.total += float(m.group(1))
                g.count += 1

    return gifts


def yaml_quote(value):
    """Double-quoted YAML scalar. Only \\ and " need escaping in this style."""
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def ask(prompt, default=None, required=True, validate=None):
    while True:
        suffix = " [%s]" % default if default is not None else ""
        try:
            answer = input("%s%s: " % (prompt, suffix)).strip()
        except (EOFError, KeyboardInterrupt):
            print("\nAborted, nothing written.")
            sys.exit(1)
        if not answer and default is not None:
            answer = str(default)
        if not answer and not required:
            return ""
        if not answer:
            print("  ! required")
            continue
        if validate:
            problem = validate(answer)
            if problem:
                print("  ! %s" % problem)
                continue
        return answer


def ask_yes_no(prompt, default=True):
    hint = "Y/n" if default else "y/N"
    while True:
        try:
            answer = input("%s [%s]: " % (prompt, hint)).strip().lower()
        except (EOFError, KeyboardInterrupt):
            print("\nAborted, nothing written.")
            sys.exit(1)
        if not answer:
            return default
        if answer in ("y", "yes"):
            return True
        if answer in ("n", "no"):
            return False
        print("  ! answer y or n")


def money(value):
    return "%.2f" % value


def main():
    ap = argparse.ArgumentParser(description="Record a contribution in _data/gifts.yml")
    ap.add_argument("--file", default=DEFAULT_FILE)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not os.path.exists(args.file):
        print("Cannot find %s -- run this from the root of the site." % args.file)
        return 1

    with open(args.file, encoding="utf-8") as fh:
        lines = fh.read().splitlines(True)

    gifts = parse(lines)
    if not gifts:
        print("No gifts found in %s." % args.file)
        return 1

    print("\nGifts in %s:\n" % args.file)
    for g in gifts:
        pct = (g.total / g.target * 100) if g.target else 0
        print("  %-20s %8s / %-8s  %5.1f%%  (%d contribution%s)"
              % (g.id, money(g.total), money(g.target), pct, g.count,
                 "" if g.count == 1 else "s"))
    print("")

    ids = [g.id for g in gifts]
    gift_id = ask("Gift id", validate=lambda v: None if v in ids else "unknown id; pick one of the above")
    gift = next(g for g in gifts if g.id == gift_id)

    def check_date(v):
        if not DATE_RE.match(v):
            return "use YYYY-MM-DD"
        try:
            datetime.date(*[int(x) for x in v.split("-")])
        except ValueError:
            return "not a real date"
        return None

    date = ask("Date", default=datetime.date.today().isoformat(), validate=check_date)

    def check_amount(v):
        try:
            return None if float(v.replace(",", ".")) > 0 else "must be greater than zero"
        except ValueError:
            return "not a number"

    name = ask("Who gave it (their real name, for your records)")
    amount = float(ask("Amount in EUR", validate=check_amount).replace(",", "."))
    show_name = ask_yes_no("Show their name on the page?", default=True)
    note = ask("Private note (optional, never published)", required=False, default="")

    entry = [
        "      - date: %s\n" % date,
        "        name: %s\n" % yaml_quote(name),
        "        amount: %s\n" % money(amount),
        "        show_name: %s\n" % ("true" if show_name else "false"),
        "        note: %s\n" % yaml_quote(note),
    ]

    new_lines = list(lines)
    if gift.contrib_line is None:
        # No contributions key at all -- add one at the end of the gift block.
        insert_at = gift.end
        new_lines[insert_at:insert_at] = ["    contributions:\n"] + entry
    elif gift.contrib_inline_empty:
        # "contributions: []" becomes a real block list.
        new_lines[gift.contrib_line] = "    contributions:\n"
        new_lines[gift.contrib_line + 1:gift.contrib_line + 1] = entry
    else:
        new_lines[gift.contrib_end:gift.contrib_end] = entry

    print("\nTo be added under %s:\n" % gift.id)
    sys.stdout.write("".join(entry))

    if args.dry_run:
        print("\n--dry-run: nothing written.")
        return 0

    if not ask_yes_no("\nWrite this to %s?" % args.file, default=True):
        print("Nothing written.")
        return 1

    with open(args.file, "w", encoding="utf-8") as fh:
        fh.write("".join(new_lines))

    total = gift.total + amount
    target = gift.target or 0.0
    pct = (total / target * 100) if target else 0.0
    remaining = max(target - total, 0.0)

    print("\n  %s" % (gift.name or gift.id))
    print("  now at  EUR %s of EUR %s  (%.1f%%)" % (money(total), money(target), pct))
    if remaining > 0:
        print("  still to go  EUR %s" % money(remaining))
    else:
        print("  fully funded -- set `status: funded` when you have bought it.")
    print("  contributors  %d" % (gift.count + 1))
    print("\nNext: git add %s && git commit && git push\n" % args.file)
    return 0


if __name__ == "__main__":
    sys.exit(main())
