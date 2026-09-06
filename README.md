# Cardcore FilterScape Community Filter

A third-party modular filter for **FilterScape / Loot Filters** generated from the **Pack Bros** OSRS TCG/Cardcore collection.

## Current snapshot

- Full item-card catalog: **3,776**
- Owned item cards: **1,583**
- Missing item cards: **2,193**
- NPC cards ignored from the imported collection: **404**
- Unresolved collection entries ignored: **13**

NPC cards are deliberately excluded. The generated filter only contains OSRS ground-item IDs.

## Repository privacy and FilterScape distribution

This is the private development/backend repository. Keep the generator, source data,
and development history private.

FilterScape users cannot import the raw URL from a private GitHub repository without
authentication. If public URL import is needed later, publish only the generated
`filter.rs2f` (and optionally a short README) from a separate public distribution
repository. Do not publish collection exports or backend data there.

## Modules

### Cardcore: Obtained Cards

The primary gameplay module. Obtained cards identify the ground items unlocked by
the collection. Each classification exposes FilterScape's normal **Style** editor.

### Cardcore: Missing Cards

An optional companion module for styling items whose cards have not been obtained.
It exposes the same classifications as Obtained Cards.

Both modules contain exclusive classifications inspired by the Iron Filter:

- Currency
- Teleports
- Food and Potions
- Clues and Uniques
- Slayer and PvM
- Runes and Magic
- Seeds and Farming
- Herbs and Herblore
- Ores and Bars
- Logs and Planks
- Prayer
- Fletching
- Crafting Materials
- Weapons and Ammunition
- Armour and Equipment
- Tools and Skilling
- Miscellaneous

### Cardcore: Manual Overrides

Normal FilterScape list/style controls for always-highlight and always-hide adjustments.

## Backend data

- `data/generation-summary.json` — generation totals and unresolved entries.
- `scripts/generate_filter.py` — rebuilds `filter.rs2f` from a fresh full catalog and collection export.

Run:

```bash
python scripts/generate_filter.py --catalog path/to/catalog.json --collection path/to/collection.json
```

Commit the regenerated `filter.rs2f` whenever the collection changes. Raw source exports do not need to be committed.

## Matching rules

1. Collection entries with `kind: "npc"` are discarded.
2. Item entries match the catalog by numeric OSRS item ID first.
3. Exact normalized card name is used only as a fallback.
4. Catalog variants are included with their parent card during generation.
5. Unresolved entries fail closed and are not added to the filter.

## Compatibility

This project intentionally uses only standard modular-filter input types (`style` and `stringlist`), so it does **not** require a custom FilterScape UI fork.
