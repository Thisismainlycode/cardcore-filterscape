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

CATEGORIES = [
    ("currency", "Currency"),
    ("teleports", "Teleports"),
    ("food_potions", "Food and Potions"),
    ("clues_uniques", "Clues and Uniques"),
    ("slayer_pvm", "Slayer and PvM"),
    ("runes_magic", "Runes and Magic"),
    ("seeds_farming", "Seeds and Farming"),
    ("herblore", "Herbs and Herblore"),
    ("ores_bars", "Ores and Bars"),
    ("logs_planks", "Logs and Planks"),
    ("prayer", "Prayer"),
    ("fletching", "Fletching"),
    ("crafting", "Crafting Materials"),
    ("weapons_ammo", "Weapons and Ammunition"),
    ("armour_equipment", "Armour and Equipment"),
    ("tools_skilling", "Tools and Skilling"),
    ("miscellaneous", "Miscellaneous"),
]

CATEGORY_COLORS = {
    "currency": "BEB287", "teleports": "66B2FF", "food_potions": "99FF99",
    "clues_uniques": "FF66B2", "slayer_pvm": "FF9600", "runes_magic": "9192D3",
    "seeds_farming": "63A755", "herblore": "A4D27E", "ores_bars": "A09A8B",
    "logs_planks": "BDA069", "prayer": "EED11D", "fletching": "6CBBBF",
    "crafting": "CDB5CD", "weapons_ammo": "A03A2D", "armour_equipment": "6D88A1",
    "tools_skilling": "41A9B7", "miscellaneous": "D0D0D0",
}


def normalized_name(value):
    return re.sub(r"\s+", " ", str(value or "").strip().lower())


def load_jsonish(path):
    text = pathlib.Path(path).read_text(encoding="utf-8").strip()
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return json.loads(text.strip())


def classify(item):
    """Assign each card to one exclusive, FilterScape-friendly classification."""
    name = normalized_name(item.get("name"))
    tcg = item.get("tcg", {})
    tags = set(tcg.get("tags", {}).get("labels", []))
    slot = tcg.get("tags", {}).get("slot")

    if "Currency" in tags:
        return "currency"
    if re.search(r"teleport|tablet|teletab|fairy ring|games necklace|dueling ring", name):
        return "teleports"
    if re.search(r"potion|brew|restore|serum|antipoison|antidote|food|cake|pie|pizza|stew|kebab|wine|beer|ale", name):
        return "food_potions"
    if "Clue" in tags or "Pet" in tags:
        return "clues_uniques"
    if "Slayer" in tags:
        return "slayer_pvm"
    if "Runecraft" in tags or name.endswith(" rune") or "rune essence" in name:
        return "runes_magic"
    if "seed" in name or "Farming" in tags:
        return "seeds_farming"
    if "Herblore" in tags:
        return "herblore"
    if "ore" in name or name.endswith(" bar") or ("Mining" in tags and not slot):
        return "ores_bars"
    if "log" in name or "plank" in name or "Woodcutting" in tags or "Firemaking" in tags:
        return "logs_planks"
    if "Prayer" in tags:
        return "prayer"
    if "Fletching" in tags:
        return "fletching"
    if "Crafting" in tags and not slot:
        return "crafting"
    if "Weapon" in tags or "Ammo" in tags or tcg.get("tags", {}).get("combatStyle"):
        return "weapons_ammo"
    if "Equipment" in tags or slot:
        return "armour_equipment"
    if "Tool" in tags or tags.intersection({"Agility", "Construction", "Cooking", "Fishing", "Hunter", "Sailing", "Smithing", "Thieving"}):
        return "tools_skilling"
    return "miscellaneous"


def filter_ids(cards):
    """Return canonical item IDs plus numeric variants unlocked by each card."""
    ids = set()
    for item in cards:
        ids.add(int(item["id"]))
        for variant in item.get("tcg", {}).get("variants", []):
            if isinstance(variant.get("id"), int):
                ids.add(int(variant["id"]))
    return sorted(ids)


def style_lines(prefix, category_id, label, cards, obtained):
    macro = f"{prefix}_{category_id}".upper()
    ids = filter_ids(cards)
    rgb = CATEGORY_COLORS[category_id]
    text = f'#{"FF" if obtained else "B3"}{rgb}'
    background = f'#{"38" if obtained else "14"}{rgb}'
    border = f'#{"FF" if obtained else "70"}{rgb}'
    return [
        f'/*@ define:input:cardcore_{prefix.lower()}',
        'type: style',
        f'label: "{label}"',
        f'group: "{label} ({len(cards)} cards / {len(ids)} item IDs)"',
        f'exampleItem: "{cards[0]["name"].replace(chr(34), chr(39)) if cards else "Coins"}"',
        '*/',
        f'#define VAR_CARDCORE_{macro}_STYLE \\',
        '  hidden = false;\\',
        f'  textColor = "{text}";\\',
        f'  menuTextColor = "{text}";\\',
        f'  backgroundColor = "{background}";\\',
        f'  borderColor = "{border}";\\',
        '  textAccentColor = "#FF000000";\\',
        '  icon = CurrentItem();\\',
        f'  showLootbeam = {"true" if obtained else "false"};\\',
        f'  lootbeamColor = "#FF{rgb}";\\',
        '  notify = false;\\',
        '  showValue = true;\\',
        f'  menuSort = {150 if obtained else 50};',
        '',
        f'#define CONST_CARDCORE_{macro}_IDS [{",".join(map(str, ids))}]',
        f'rule (id:CONST_CARDCORE_{macro}_IDS) {{ VAR_CARDCORE_{macro}_STYLE }}',
        '',
    ]


def generate(catalog_obj, collection):
    collection = collection.get("group", collection)
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

    obtained = [item for item in items if int(item["id"]) in owned]
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
        '/*@ define:module:cardcore_obtained',
        '---',
        'name: "Cardcore: Obtained Cards"',
        'subtitle: "Style ground items unlocked by cards in the Pack Bros collection"',
        'description: |',
        '  Obtained cards are the permission source for Cardcore gameplay.',
        f'  - Item cards in catalog: {len(items)}',
        f'  - Obtained item cards: {len(obtained)}',
        f'  - NPC collection entries ignored: {npc_ignored}',
        f'  - Unresolved imported entries ignored: {len(unresolved)}',
        '  Each classification contains canonical item IDs and catalog variants.',
        '*/',
        '',
    ]

    for category_id, label in CATEGORIES:
        cards = [item for item in obtained if classify(item) == category_id]
        lines += style_lines("OBTAINED", category_id, label, cards, True)

    lines += [
        '/*@ define:module:cardcore_missing',
        '---',
        'name: "Cardcore: Missing Cards"',
        'subtitle: "Style ground items whose cards have not been obtained"',
        'description: |',
        f'  - Missing item cards: {len(missing)}',
        '  Missing-card rules use the same classifications as Obtained Cards.',
        '  Each classification contains canonical item IDs and catalog variants.',
        '*/',
        '',
    ]

    for category_id, label in CATEGORIES:
        cards = [item for item in missing if classify(item) == category_id]
        lines += style_lines("MISSING", category_id, label, cards, False)

    return "\n".join(lines).rstrip() + "\n", {
        "catalogItemCards": len(items),
        "ownedItemCards": len(owned),
        "missingItemCards": len(missing),
        "ignoredNpcEntries": npc_ignored,
        "unresolvedEntries": unresolved,
        "missingByTier": {tier: len([item for item in missing if item.get("tcg", {}).get("tierLabel") == tier]) for tier in TIERS},
        "obtainedByClassification": {label: len([item for item in obtained if classify(item) == category_id]) for category_id, label in CATEGORIES},
        "missingByClassification": {label: len([item for item in missing if classify(item) == category_id]) for category_id, label in CATEGORIES},
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
