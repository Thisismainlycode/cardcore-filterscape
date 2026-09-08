'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Clipboard,
  Download,
  ExternalLink,
  LoaderCircle,
} from 'lucide-react';
type Item = {
  id: number;
  name: string;
  tcg?: {
    variants?: { id: number; name?: string }[];
    tags?: { labels?: string[]; slot?: string; combatStyle?: string };
  };
};
type Entry = {
  id?: number;
  name?: string;
  cardName?: string;
  kind?: string;
  owner?: string;
  ownerDisplayName?: string;
  variants?: { owner?: string; ownerDisplayName?: string; pulledBy?: string }[];
};
type Result = {
  name: string;
  obtained: Item[];
  missing: Item[];
  npcs: number;
  unresolved: string[];
  ownerItems: Record<string, Item[]>;
};
type ReferenceStyle = {
  itemId: number;
  itemName: string;
  label: string;
  group: string;
  style: Record<string, string>;
};
type Design = 'colorful' | 'status' | 'simple';
const cats = [
  ['currency', 'Currency'],
  ['teleports', 'Teleports'],
  ['food_potions', 'Food & potions'],
  ['clues_uniques', 'Clues & uniques'],
  ['slayer_pvm', 'Slayer & PvM'],
  ['runes_magic', 'Runes & magic'],
  ['seeds_farming', 'Seeds & farming'],
  ['herblore', 'Herbs & Herblore'],
  ['ores_bars', 'Ores & bars'],
  ['logs_planks', 'Logs & planks'],
  ['prayer', 'Prayer'],
  ['fletching', 'Fletching'],
  ['crafting', 'Crafting materials'],
  ['weapons_ammo', 'Weapons & ammunition'],
  ['armour_equipment', 'Armour & equipment'],
  ['tools_skilling', 'Tools & skilling'],
  ['miscellaneous', 'Miscellaneous'],
] as const;
const categoryColors: Record<string, string> = {
  currency: 'BEB287',
  teleports: '66B2FF',
  food_potions: '99FF99',
  clues_uniques: 'FF66B2',
  slayer_pvm: 'FF9600',
  runes_magic: '9192D3',
  seeds_farming: '63A755',
  herblore: 'A4D27E',
  ores_bars: 'A09A8B',
  logs_planks: 'BDA069',
  prayer: 'EED11D',
  fletching: '6CBBBF',
  crafting: 'CDB5CD',
  weapons_ammo: 'A03A2D',
  armour_equipment: '6D88A1',
  tools_skilling: '41A9B7',
  miscellaneous: 'D0D0D0',
};
const norm = (v?: string) =>
  (v || '').trim().toLowerCase().replace(/\s+/g, ' ');
function classify(i: Item) {
  const n = norm(i.name),
    t = new Set(i.tcg?.tags?.labels || []),
    s = i.tcg?.tags?.slot;
  if (t.has('Currency')) return 'currency';
  if (/teleport|tablet|teletab|fairy ring|games necklace|dueling ring/.test(n))
    return 'teleports';
  if (
    /potion|brew|restore|serum|antipoison|antidote|food|cake|pie|pizza|stew|kebab|wine|beer|ale/.test(
      n,
    )
  )
    return 'food_potions';
  if (t.has('Clue') || t.has('Pet')) return 'clues_uniques';
  if (t.has('Slayer')) return 'slayer_pvm';
  if (t.has('Runecraft') || n.endsWith(' rune') || n.includes('rune essence'))
    return 'runes_magic';
  if (n.includes('seed') || t.has('Farming')) return 'seeds_farming';
  if (t.has('Herblore')) return 'herblore';
  if (n.includes('ore') || n.endsWith(' bar') || (t.has('Mining') && !s))
    return 'ores_bars';
  if (
    n.includes('log') ||
    n.includes('plank') ||
    t.has('Woodcutting') ||
    t.has('Firemaking')
  )
    return 'logs_planks';
  if (t.has('Prayer')) return 'prayer';
  if (t.has('Fletching')) return 'fletching';
  if (t.has('Crafting') && !s) return 'crafting';
  if (t.has('Weapon') || t.has('Ammo') || i.tcg?.tags?.combatStyle)
    return 'weapons_ammo';
  if (t.has('Equipment') || s) return 'armour_equipment';
  if (
    t.has('Tool') ||
    [
      'Agility',
      'Construction',
      'Cooking',
      'Fishing',
      'Hunter',
      'Sailing',
      'Smithing',
      'Thieving',
    ].some((x) => t.has(x))
  )
    return 'tools_skilling';
  return 'miscellaneous';
}
const ids = (a: Item[]) =>
  Array.from(
    new Set(
      a.flatMap((i) => [i.id, ...(i.tcg?.variants || []).map((v) => v.id)]),
    ),
  ).sort((a, b) => a - b);
const names = (a: Item[]) =>
  Array.from(
    new Set(
      a.flatMap((i) =>
        [i.name, ...(i.tcg?.variants || []).map((v) => v.name)].filter(
          (x): x is string => !!x?.trim(),
        ),
      ),
    ),
  )
    .sort((a, b) => a.localeCompare(b))
    .join(', ');
function block(
  state: 'obtained' | 'missing',
  id: string,
  label: string,
  a: Item[],
  design: Design,
) {
  const m = `${state}_${id}`.toUpperCase(),
    list = ids(a),
    rgb = categoryColors[id] || categoryColors.miscellaneous,
    text = state === 'obtained' ? `#FF${rgb}` : `#B3${rgb}`,
    background = state === 'obtained' ? `#38${rgb}` : `#14${rgb}`,
    border = state === 'obtained' ? `#FF${rgb}` : `#70${rgb}`,
    isObtained = state === 'obtained',
    designText = design === 'colorful' ? text : isObtained ? '#FF9DFFB0' : '#FF969696',
    designBackground = design === 'colorful' ? background : design === 'status' && isObtained ? '#242E6B3E' : '#00000000',
    designBorder = design === 'colorful' ? border : design === 'status' && isObtained ? '#FF9DFFB0' : '#00000000',
    designAccent = design === 'colorful' ? '#FF000000' : design === 'status' && isObtained ? '#FF183020' : '#00000000',
    designIconLine = design === 'simple' ? '' : `++ icon = ${design === 'status' ? `Sprite(${isObtained ? 699 : 697}, 0)` : 'CurrentItem()'};\\\n`;
  return `/*@ define:input:cardcore_${state}\ntype: style\nlabel: "${label}"\ngroup: "${label} (${a.length} cards / ${list.length} item IDs)"\nexampleItem: "${(a[0]?.name || 'Coins').replaceAll('"', "'")}"\nexampleItemId: ${a[0]?.id || 995}\n*/\n#define VAR_CARDCORE_${m}_STYLE \\\n++ hidden = false;\\\n++ textColor = "${designText}";\\\n++ menuTextColor = "${designText}";\\\n++ backgroundColor = "${designBackground}";\\\n++ borderColor = "${designBorder}";\\\n++ textAccentColor = "${designAccent}";\\\n${designIconLine}++ showLootbeam = ${state === 'obtained' && (id === 'slayer_pvm' || id === 'clues_uniques')};\\\n++ lootbeamColor = "#FF${rgb}";\\\n++ notify = false;\\\n++ showValue = false;\\\n++ menuSort = ${state === 'obtained' ? 150 : 50};\n\n#define CONST_CARDCORE_${m}_IDS [${list.join(',')}]\nrule (id:CONST_CARDCORE_${m}_IDS) { VAR_CARDCORE_${m}_STYLE }`;
}
function individualBlocks(state: 'obtained' | 'missing', items: Item[], styles: ReferenceStyle[], design: Design) {
  const available = new Map(items.map((item) => [item.id, item]));
  return styles.filter((entry) => available.has(entry.itemId)).map((entry) => {
    const item = available.get(entry.itemId)!;
    const key = `${state}_${entry.itemId}`.toUpperCase();
    const category = classify(item);
    const isObtained = state === 'obtained';
    const properties = {
      hidden: 'false',
      icon: 'CurrentItem()',
      ...entry.style,
      ...(design === 'colorful' ? {} : {
        textColor: isObtained ? '"#FF9DFFB0"' : '"#FF969696"',
        menuTextColor: isObtained ? '"#FF9DFFB0"' : '"#FF969696"',
        backgroundColor: design === 'status' && isObtained ? '"#242E6B3E"' : '"#00000000"',
        borderColor: design === 'status' && isObtained ? '"#FF9DFFB0"' : '"#00000000"',
        textAccentColor: design === 'status' && isObtained ? '"#FF183020"' : '"#00000000"',
        icon: design === 'status' ? `Sprite(${isObtained ? 699 : 697}, 0)` : 'CurrentItem()',
      }),
      showLootbeam: String(state === 'obtained' && (category === 'slayer_pvm' || category === 'clues_uniques')),
      showValue: 'false',
    } as Record<string, string>;
    if (design === 'simple') delete properties.icon;
    const body = Object.entries(properties).map(([name, value]) => `++ ${name} = ${value};\\`).join('\n');
    return `/*@ define:input:cardcore_${state}\ntype: style\nlabel: "${entry.label.replaceAll('"', "'")}"\ngroup: "Individual: ${entry.group.replaceAll('"', "'")}"\nexampleItem: "${item.name.replaceAll('"', "'")}"\nexampleItemId: ${item.id}\n*/\n#define VAR_CARDCORE_INDIVIDUAL_${key} \\\n${body.slice(0, -1)}\n\n#define CONST_CARDCORE_INDIVIDUAL_${key}_IDS [${ids([item]).join(',')}]\nrule (id:CONST_CARDCORE_INDIVIDUAL_${key}_IDS) { VAR_CARDCORE_INDIVIDUAL_${key} }`;
  }).join('\n\n');
}
export function makeFilter(r: Result, referenceStyles: ReferenceStyle[] = [], design: Design = 'colorful') {
  const groups = (s: 'obtained' | 'missing', a: Item[]) =>
    cats
      .map(([id, l]) =>
        block(
          s,
          id,
          l,
          a.filter((i) => classify(i) === id),
          design,
        ),
      )
      .join('\n\n');
  return `/*@ define:module:cardcore_ownership\n---\nname: "Cardcore: Item Ownership"\nsubtitle: "Optional Ironman visibility control"\n*/\n\nmeta { name = "Cardcore - ${r.name.replaceAll('"', "'")}"; description = "Generated by Cardcore Filters by Thisismain."; }\n\n/*@ define:input:cardcore_ownership\n+type: boolean\n+label: "Ironman mode - only show your items"\n+*/\n+#define VAR_CARDCORE_ONLY_SELF false\n+\n+rule (VAR_CARDCORE_ONLY_SELF && !ownership:OWNERSHIP_SELF) {\n+  hidden = true;\n+  notify = false;\n+  showLootbeam = false;\n+}\n+\n+/*@ define:module:cardcore_obtained\n+---\n+name: "Cardcore: Obtained Cards"\n+subtitle: "${r.obtained.length} cards unlocked - ${design} design"\n+*/\n+\n+${groups('obtained', r.obtained)}\n+\n+${individualBlocks('obtained', r.obtained, referenceStyles, design)}\n+\n+/*@ define:module:cardcore_missing\n+---\n+name: "Cardcore: Missing Cards"\n+subtitle: "${r.missing.length} cards not yet obtained - ${design} design"\n+*/\n+\n+${groups('missing', r.missing)}\n+\n+${individualBlocks('missing', r.missing, referenceStyles, design)}\n+`;
}
export const createFilter = (result: Result, referenceStyles: ReferenceStyle[] = [], design: Design = 'colorful') =>
  makeFilter(result, referenceStyles, design)
    .replaceAll('\n++ ', '\n  ')
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '');
export default function Home() {
  const [catalog, setCatalog] = useState<Item[]>([]),
    [referenceStyles, setReferenceStyles] = useState<ReferenceStyle[]>([]),
    [result, setResult] = useState<Result | null>(null),
    [error, setError] = useState(''),
    [text, setText] = useState(''),
    [mode, setMode] = useState<'solo' | 'group'>('solo'),
    [user, setUser] = useState(''),
    [filterLoading, setFilterLoading] = useState(false),
    [design, setDesign] = useState<Design>('colorful'),
    [kind, setKind] = useState<'obtained' | 'missing'>('obtained'),
    [copied, setCopied] = useState(false),
    [selectedOwner, setSelectedOwner] = useState(''),
    [ownerCopied, setOwnerCopied] = useState(false);
  useEffect(() => {
      fetch('./data/catalog.json')
      .then((r) => r.json())
      .then((d) => setCatalog(d.items))
      .catch(() => setError('The item catalog could not be loaded.'));
    fetch('./data/reference-individual-styles.json')
      .then((r) => r.json())
      .then((d) => setReferenceStyles(d.styles || []))
      .catch(() => setReferenceStyles([]));
  }, []);
  const url = `https://osrs-tcg.net/api/v1/players/${encodeURIComponent(user.trim() || 'YOUR_USERNAME')}${mode === 'group' ? '/group' : ''}`;
  const process = (value = text) => {
    try {
      const raw = JSON.parse(
          value
            .trim()
            .replace(/^```(?:json)?/i, '')
            .replace(/```$/, '')
            .trim(),
        ),
        c = raw.group ?? raw,
        e: Entry[] = c.cardEntries;
      if (!Array.isArray(e))
        throw Error('No cardEntries were found. Copy the complete data page.');
      if (!catalog.length) throw Error('The item catalog is still loading.');
      const byId = new Map(catalog.map((i) => [i.id, i])),
        byName = new Map(catalog.map((i) => [norm(i.name), i])),
        owned = new Set<number>(),
        ownerIds = new Map<string, Set<number>>(),
        unresolved: string[] = [];
      let npcs = 0;
      e.forEach((x) => {
        if (x.kind === 'npc') {
          npcs++;
          return;
        }
        const item =
          (typeof x.id === 'number' ? byId.get(x.id) : undefined) ||
          byName.get(norm(x.name || x.cardName));
        if (!item) {
          unresolved.push(x.name || x.cardName || String(x.id || 'Unknown'));
          return;
        }
        owned.add(item.id);
        const owners = new Set([
          x.ownerDisplayName,
          x.owner,
          ...(x.variants || []).map((variant) => variant.ownerDisplayName || variant.owner || variant.pulledBy),
        ].filter((owner): owner is string => !!owner?.trim()));
        owners.forEach((owner) => {
          if (!ownerIds.has(owner)) ownerIds.set(owner, new Set());
          ownerIds.get(owner)!.add(item.id);
        });
      });
      const ownerItems = Object.fromEntries(
        [...ownerIds.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([owner, itemIds]) => [owner, catalog.filter((item) => itemIds.has(item.id))]),
      );
      setResult({
        name: c.displayName || c.name || 'My Collection',
        obtained: catalog.filter((i) => owned.has(i.id)),
        missing: catalog.filter((i) => !owned.has(i.id)),
        npcs,
        unresolved,
        ownerItems,
      });
      setSelectedOwner(Object.keys(ownerItems)[0] || '');
      setError('');
    } catch (e) {
      setResult(null);
      setError(
        e instanceof Error ? e.message : 'Could not read this collection.',
      );
    }
  };
  const list = result
      ? kind === 'obtained'
        ? result.obtained
        : result.missing
      : [],
    ground = useMemo(() => names(list), [list]);
  const copy = async () => {
    await navigator.clipboard.writeText(ground);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const ownerList = result && selectedOwner ? names(result.ownerItems[selectedOwner] || []) : '';
  const copyOwner = async () => {
    await navigator.clipboard.writeText(ownerList);
    setOwnerCopied(true);
    setTimeout(() => setOwnerCopied(false), 1500);
  };
  const download = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([createFilter(result, referenceStyles, design)], { type: 'text/plain' }),
    );
    a.download = `${result.name.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()}-cardcore.rs2f`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const open = async () => {
    if (!result) return;
    setFilterLoading(true);
    setError('');
    try {
      const rs2f = createFilter(result, referenceStyles, design);
      const hashBuffer = await crypto.subtle.digest(
        'SHA-1',
        new TextEncoder().encode(rs2f),
      );
      const expectedRs2fHash = Array.from(new Uint8Array(hashBuffer))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
      const response = await fetch('https://api.kaqemeex.net/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filter: {
            rs2f,
            expectedRs2fHash,
            sourceUrl: window.location.href,
          },
          config: {},
        }),
      });
      if (!response.ok) throw new Error('FilterScape rejected the filter.');
      const data = await response.json();
      const filterId = data?.response?.id;
      if (!filterId) throw new Error('FilterScape did not return an import ID.');
      window.location.href = `https://filterscape.xyz/import?filterId=${encodeURIComponent(filterId)}`;
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message} You can still use “Download .rs2f”.`
          : 'Could not create the FilterScape import. You can still download the .rs2f file.',
      );
      setFilterLoading(false);
    }
  };
  const counts = useMemo(
    () =>
      result
        ? cats.map(([id, label]) => ({
            id,
            label,
            o: result.obtained.filter((i) => classify(i) === id).length,
            m: result.missing.filter((i) => classify(i) === id).length,
          }))
        : [],
    [result],
  );
  return (
    <main>
      <div className="shell">
        <header>
          <div>
            <h1>Cardcore Filters</h1>
            <p>
              by <a href="https://github.com/Thisismainlycode">Thisismain</a>
            </p>
          </div>
          <span>Runs in your browser</span>
        </header>
        <section className="card">
          <h2>Import cards</h2>
          <div className="row">
            <div className="switch">
              <button
                className={mode === 'solo' ? 'active' : ''}
                onClick={() => setMode('solo')}
              >
                Solo
              </button>
              <button
                className={mode === 'group' ? 'active' : ''}
                onClick={() => setMode('group')}
              >
                Group
              </button>
            </div>
            <input
              className="username"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="OSRS username"
            />
            <a
              className="primary"
              href={user.trim() ? url : undefined}
              aria-disabled={!user.trim()}
              target="_blank"
            >
              Open data <ExternalLink size={14} />
            </a>
          </div>
          <p className="help">
            Open the data page, copy everything, then paste it below. The API is
            not requested directly by this site.
          </p>
          <textarea
            className="import-box"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste collection JSON…"
          />
          <div className="under">
            <button
              className="button"
              disabled={!text.trim()}
              onClick={() => process()}
            >
              Import pasted data
            </button>
            <code>{url}</code>
          </div>
          {error && <p className="error">{error}</p>}
        </section>
        {result && (
          <>
            <section className="summary">
              <div>
                <span>Collection</span>
                <strong>{result.name}</strong>
              </div>
              <div>
                <span>Obtained</span>
                <strong className="green">{result.obtained.length}</strong>
              </div>
              <div>
                <span>Missing</span>
                <strong className="red">{result.missing.length}</strong>
              </div>
              <div>
                <span>NPCs excluded</span>
                <strong>{result.npcs}</strong>
              </div>
            </section>
            <div className="outputs">
              <section className="card">
                <h2>FilterScape</h2>
                <p>Separate Obtained and Missing classifications.</p>
                <div className="design-picker" role="group" aria-label="Filter design">
                  <button className={design === 'colorful' ? 'active' : ''} onClick={() => setDesign('colorful')}>
                    <b>Colorful</b><span>Category colors and item styles</span>
                  </button>
                  <button className={design === 'status' ? 'active' : ''} onClick={() => setDesign('status')}>
                    <b>Obtained &amp; Missing</b><span>Status sprites, green and grey</span>
                  </button>
                  <button className={design === 'simple' ? 'active' : ''} onClick={() => setDesign('simple')}>
                    <b>Simple</b><span>Green and grey text only</span>
                  </button>
                </div>
                <div className="actions">
                  <button className="primary" onClick={open} disabled={filterLoading}>
                    {filterLoading ? <LoaderCircle className="spin" size={15} /> : <ExternalLink size={15} />}
                    {filterLoading ? 'Preparing…' : 'Open in FilterScape'}
                  </button>
                  <button className="button" onClick={download}>
                    <Download size={15} /> Download .rs2f
                  </button>
                </div>
              </section>
              <section className="card">
                <div className="section-head">
                  <div>
                    <h2>Ground Items</h2>
                    <p>Paste into RuneLite’s highlighted items list.</p>
                  </div>
                  <div className="switch small">
                    <button
                      className={kind === 'obtained' ? 'active' : ''}
                      onClick={() => setKind('obtained')}
                    >
                      Obtained
                    </button>
                    <button
                      className={kind === 'missing' ? 'active' : ''}
                      onClick={() => setKind('missing')}
                    >
                      Missing
                    </button>
                  </div>
                </div>
                <textarea className="output-box" readOnly value={ground} />
                <button className="primary copy" onClick={copy}>
                  {copied ? <Check size={15} /> : <Clipboard size={15} />}{' '}
                  {copied ? 'Copied' : 'Copy comma-separated list'}
                </button>
              </section>
            </div>
            {Object.keys(result.ownerItems).length > 0 && (
              <section className="card owner-card">
                <div className="section-head">
                  <div>
                    <h2>Group member items</h2>
                    <p>Automatically separated using each card's owner.</p>
                  </div>
                  <select value={selectedOwner} onChange={(event) => setSelectedOwner(event.target.value)}>
                    {Object.entries(result.ownerItems).map(([owner, items]) => (
                      <option key={owner} value={owner}>{owner} ({items.length})</option>
                    ))}
                  </select>
                </div>
                <textarea className="output-box" readOnly value={ownerList} />
                <button className="primary copy" onClick={copyOwner}>
                  {ownerCopied ? <Check size={15} /> : <Clipboard size={15} />}
                  {ownerCopied ? 'Copied' : `Copy ${selectedOwner}'s item list`}
                </button>
              </section>
            )}
            <details className="card details">
              <summary>Classification counts</summary>
              <div className="class-grid">
                {counts.map((x) => (
                  <div key={x.id}>
                    <span>{x.label}</span>
                    <span>
                      <b>{x.o}</b> / {x.m}
                    </span>
                  </div>
                ))}
              </div>
              {result.unresolved.length > 0 && (
                <p>{result.unresolved.length} entries could not be matched.</p>
              )}
            </details>
          </>
        )}
        <footer>
          Cardcore Filters by Thisismain · No collection data is stored.
        </footer>
      </div>
    </main>
  );
}
