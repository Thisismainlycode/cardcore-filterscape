# Cardcore FilterScape Community Filter

A third-party Cardcore filter builder for **FilterScape / Loot Filters** and RuneLite's **Ground Items** plugin.

Use the public builder at **https://thisismainlycode.github.io/cardcore-filterscape/**.

## Current snapshot

- Full item-card catalog: **3,776**
- Owned item cards: **1,593**
- Missing item cards: **2,183**
- NPC cards ignored from the imported collection: **409**
- Unresolved collection entries ignored: **13**

NPC cards are deliberately excluded. The generated filter only contains OSRS ground-item IDs.

The builder runs entirely in the browser and does not store pasted collection data.
It deliberately does not request the OSRS TCG API directly: users open their solo or
group data URL, copy the response, and paste it into the builder.

Before opening or downloading a filter, users can choose one of three designs:

- **Colorful** — category colors plus the reference-inspired individual item styles.
- **Obtained & Missing** — sprite 699 and outlined light-green styling for obtained cards; sprite 697 and outline-free grey styling for missing cards.
- **Simple** — light-green obtained text and grey missing text without status sprites or outlines.

## Modules

### Cardcore: Obtained Cards

The primary gameplay module. Obtained cards identify the ground items unlocked by
the collection. Each classification exposes FilterScape's normal **Style** editor.

### Cardcore: Missing Cards

A companion module for styling items whose cards have not been obtained.
It exposes the same classifications as Obtained Cards.

Both modules are enabled by default and every matched item remains visible. Obtained
cards use stronger category colors and loot beams; missing cards use a quieter version
of the same category palette.

The modules also include 116 Cardcore-compatible individual item styles drawn from
the public `p8pw9l` reference filter. FilterScape displays these only for relevant
items and exposes them as separate style controls.

## Group member lists

One imported group collection is automatically separated using the owner attached to
each card copy. The builder provides a comma-separated Ground Items list for every
member, including catalog variants.

### Cardcore: Item Ownership

This FilterScape module contains an **Ironman mode - only show your items** toggle.
It is off by default. When enabled, a terminal ownership rule hides every ground item
whose ownership state is not `OWNERSHIP_SELF`.

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
