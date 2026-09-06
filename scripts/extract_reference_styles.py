#!/usr/bin/env python3
"""Extract reusable item style values from the public FilterScape reference."""
import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REFERENCE = "https://api.kaqemeex.net/filter/p8pw9l"


def field(annotation: str, name: str):
    match = re.search(rf"^{name}:\s*(.+?)\s*$", annotation, re.MULTILINE)
    return match.group(1).strip().strip('"') if match else None


request = urllib.request.Request(REFERENCE, headers={"User-Agent": "Cardcore-Filter-Builder/1.0"})
with urllib.request.urlopen(request) as response:
    source = json.load(response)["filter"]["rs2f"]

start = source.index("/*@ define:module:individual_item_styles")
end = source.find("/*@ define:module:", start + 10)
module = source[start : end if end >= 0 else len(source)]
catalog = json.loads((ROOT / "web/public/data/catalog.json").read_text(encoding="utf-8"))["items"]
by_id = {item["id"]: item for item in catalog}
by_name = {item["name"].casefold(): item for item in catalog}
styles = []

pattern = re.compile(
    r"(/\*@ define:input:individual_item_styles[\s\S]*?\*/)[\s\n]*"
    r"#define\s+\w+\s+\\\n([\s\S]*?)(?=\n\n(?:apply|rule)\s*\()"
)
for annotation, body in pattern.findall(module):
    example_id = field(annotation, "exampleItemId")
    example = field(annotation, "exampleItem")
    item = by_id.get(int(example_id)) if example_id and example_id.isdigit() else None
    item = item or by_name.get((example or "").casefold())
    if not item:
        continue
    props = {}
    for key, value in re.findall(r"(\w+)\s*=\s*(\"[^\"]*\"|true|false|\d+)\s*;", body):
        props[key] = value
    if not props:
        continue
    styles.append({
        "itemId": item["id"],
        "itemName": item["name"],
        "label": field(annotation, "label") or f'{item["name"]} custom style',
        "group": field(annotation, "group") or "Individual item styles",
        "style": props,
    })

# The same catalog item can be an example for multiple situational styles. For
# Cardcore, retain the first general-purpose appearance so each card gets one toggle.
unique = {entry["itemId"]: entry for entry in reversed(styles)}
output = sorted(unique.values(), key=lambda entry: (entry["group"], entry["itemName"]))
target = ROOT / "web/public/data/reference-individual-styles.json"
target.write_text(json.dumps({"source": REFERENCE, "styles": output}, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {len(output)} Cardcore-compatible individual styles to {target}")
