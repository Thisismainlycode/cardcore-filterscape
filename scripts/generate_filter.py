#!/usr/bin/env python3
"""Generate the Cardcore FilterScape community filter from OSRS TCG exports."""
import argparse
import json
import pathlib
import re

TIERS = ["Godly", "Mythic", "Legendary", "Epic", "Rare", "Uncommon", "Common"]
COLORS = {
    "Godly": "#FFFFFFFF",
    "Mythic": "#FFFF8787",
    "Legendary": "#FFFFD43B",
    "Epic": "#FFB197FC",
    "Rare": "#FF74C0FC",
    "Uncommon": "#FF69DB7C",
    "Common": "#FF55D6FF",
}
LOOTBEAM = {"Godly": True, "Mythic": True, "Legendary": True, "Epic": True, "Rare": True, "Uncommon": False, "Common": False}
NOTIFY = {"Godly": True, "Mythic": True, "Legendary": True, "Epic": True, "Rare": False, "Uncommon": False, "Common": False}


def normalized_name(value):
    return re.sub(r"\s+", " ", str(value or "").strip().lower())


def load_jsonish(path):
    text = pathlib.Path(path).read_text(encoding="utf-8").strip()
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return json.loads(text.strip())


def generate(catalog_obj, collection):
    items = catalog_obj["items"]
    by_id = {int(item["id"]): item for item in items}
    by_name = {normalized_name(item["name"]): item for item in items}

    owned = set()
    npc_ignored = 0
    unresolved = []

    for entry in collection.get("cardEntries", []):
        if entry.get("kind") == "npc":
            npc_ignored += 1
            continue

        item = by_id.get(entry.get("id")) if isinstance(entry.get("id"), int) else None
        if item is None:
            item = by_name.get(normalized_name(entry.get("name") or entry.get("cardName")))

        if item is None:
            unresolved.append(entry.get("name") or entry.get("cardName") or str(entry.get("id")))
        else:
            owned.add(int(item["id"]))

    missing = [item for item in items if int(item["id"]) not in owned]

    lines = [
        '/*@ define:module:cardcore_overrides',
        '---',
        'name: "Cardcore: Manual Overrides"',
        'subtitle: "One-off item rules evaluated before Cardcore collection rules"',
        'description: |',
        '  Manual overrides are evaluated first so they can override generated Cardcore rules.',
        '*/',
        '',
        'meta {',
        '  name = "Cardcore - Pack Bros";',
        '  description = "Community FilterScape filter generated from the Pack Bros OSRS TCG collection.";',
        '}',
        '',
        '/*@ define:input:cardcore_overrides',
        'type: stringlist',
        'group: "Always Highlight"',
        'label: Items',
        '*/',
        '#define VAR_CARDCORE_ALWAYS_HIGHLIGHT []',
        '',
        '/*@ define:input:cardcore_overrides',
        'type: style',
        'group: "Always Highlight"',
        'label: Style',
        'exampleItem: "Abyssal whip"',
        '*/',
        '#define VAR_CARDCORE_ALWAYS_HIGHLIGHT_STYLE \\',
        '  hidden = false;\\',
        '  textColor = "#FFFFD166";\\',
        '  borderColor = "#FFFFD166";\\',
        '  showLootbeam = true;\\',
        '  notify = true;\\',
        '  showValue = true;\\',
        '  menuSort = 200;',
        '',
        'rule (name:VAR_CARDCORE_ALWAYS_HIGHLIGHT) { VAR_CARDCORE_ALWAYS_HIGHLIGHT_STYLE }',
        '',
        '/*@ define:input:cardcore_overrides',
        'type: stringlist',
        'group: "Always Hide"',
        'label: Items',
        '*/',
        '#define VAR_CARDCORE_ALWAYS_HIDE []',
        '',
        'rule (name:VAR_CARDCORE_ALWAYS_HIDE) { hidden = true; }',
        '',
        '/*@ define:module:cardcore_missing',
        '---',
        'name: "Cardcore: Missing Cards"',
        'subtitle: "Highlight item cards the Pack Bros collection has not unlocked yet"',
        'description: |',
        '  Generated from the Pack Bros collection and OSRS TCG item catalog.',
        f'  - Item cards in catalog: {len(items)}',
        f'  - Owned item cards: {len(owned)}',
        f'  - Missing item cards: {len(missing)}',
        f'  - NPC collection entries ignored: {npc_ignored}',
        f'  - Unresolved imported entries ignored: {len(unresolved)}',
        '  This community snapshot uses canonical Cardcore item IDs only.',
        '  NPC cards are excluded from generation.',
        '*/',
        '',
    ]

    for tier in TIERS:
        cards = [item for item in missing if item.get("tcg", {}).get("tierLabel") == tier]
        ids = [int(item["id"]) for item in cards]
        macro = tier.upper()
        example = (cards[0]["name"] if cards else "Coins").replace('"', "'")
        lines += [
            '/*@ define:input:cardcore_missing',
            'type: style',
            'label: Style',
            f'group: "{tier} missing cards ({len(cards)})"',
            f'exampleItem: "{example}"',
            '*/',
            f'#define VAR_CARDCORE_{macro}_STYLE \\',
            '  hidden = false;\\',
            f'  textColor = "{COLORS[tier]}";\\',
            f'  borderColor = "{COLORS[tier]}";\\',
            f'  showLootbeam = {str(LOOTBEAM[tier]).lower()};\\',
            f'  notify = {str(NOTIFY[tier]).lower()};\\',
            '  showValue = true;\\',
            '  menuSort = 100;',
            '',
            f'#define CONST_CARDCORE_{macro}_IDS [{",".join(map(str, ids))}]',
            f'rule (id:CONST_CARDCORE_{macro}_IDS) {{ VAR_CARDCORE_{macro}_STYLE }}',
            '',
        ]

    return "\n".join(lines) + "\n", {
        "catalogItemCards": len(items),
        "ownedItemCards": len(owned),
        "missingItemCards": len(missing),
        "ignoredNpcEntries": npc_ignored,
        "unresolvedEntries": unresolved,
        "missingByTier": {tier: len([item for item in missing if item.get("tcg", {}).get("tierLabel") == tier]) for tier in TIERS},
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog", required=True, help="Full OSRS TCG catalog JSON containing an items array")
    parser.add_argument("--collection", required=True, help="OSRS TCG/Cardcore collection export containing cardEntries")
    parser.add_argument("--output", default="filter.rs2f")
    parser.add_argument("--summary", default="generation-summary.json")
    args = parser.parse_args()

    filter_text, summary = generate(load_jsonish(args.catalog), load_jsonish(args.collection))
    pathlib.Path(args.output).write_text(filter_text, encoding="utf-8")
    pathlib.Path(args.summary).write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
