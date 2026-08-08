#!/usr/bin/env python3
"""
Adapter: converts the Colorado 13ers spreadsheet (Rank/Peak Name/Elevation/
Range/Latitude/Longitude/Source URL columns) into the normalized JSON shape
the Node importer (server/scripts/import-peaks.js) expects:

  { name, elevation, rangeLabel, paletteKey, lat, lng, sourceUrl, sourceRank }

Name disambiguation (duplicate peak names within this list) is intentionally
NOT done here -- it needs to check against mountains already in the database
too, so it happens in the importer, which has live DB access.

Usage: python3 from_co13ers_xlsx.py <input.xlsx> <output.json>
"""
import re
import sys
import json
import pandas as pd

SUFFIX_EXPANSION = {'Mt': 'Mount', 'Peak': 'Peak', 'The': 'The'}


def uninvert_name(raw):
    """14ers.com alphabetizes some names as "Word, Suffix" (e.g. "Ouray, Mt",
    "Six, Peak", "Guardian, The"). Un-invert to match this app's existing
    naming convention ("Mount Elbert", not "Elbert, Mt"). Preserves an
    unofficial-name quote wrapper (e.g. '"SoSo, Mt"') around the result."""
    quoted = raw.startswith('"') and raw.endswith('"')
    inner = raw[1:-1] if quoted else raw
    m = re.match(r'^(.+), (Mt|Peak|The)$', inner)
    if m:
        base, suffix = m.groups()
        inner = f"{SUFFIX_EXPANSION[suffix]} {base}"
    return f'"{inner}"' if quoted else inner

# Spreadsheet's short range label -> (DB display label, badge palette key).
# Palette key must exist in server/src/data/peaks-data.js's PALETTES/RANGE_STYLE
# (Gore is new -- added there alongside this import).
RANGE_MAP = {
    'Sawatch':          ('Sawatch Range', 'SAWATCH'),
    'Front':            ('Front Range', 'FRONT'),
    'Elk':              ('Elk Mountains', 'ELK'),
    'San Juan':         ('San Juan Mountains', 'SANJUAN'),
    'Sangre de Cristo':  ('Sangre de Cristo', 'SANGRE'),
    'Mosquito':         ('Mosquito Range', 'MOSQUITO'),
    'Gore':             ('Gore Range', 'GORE'),
    'Tenmile':          ('Tenmile Range', 'TENMILE'),
}


def main():
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <input.xlsx> <output.json>", file=sys.stderr)
        sys.exit(1)
    in_path, out_path = sys.argv[1], sys.argv[2]

    df = pd.read_excel(in_path)
    required = {'Rank', 'Peak Name', 'Elevation', 'Range', 'Latitude', 'Longitude', 'Source URL'}
    missing = required - set(df.columns)
    if missing:
        raise SystemExit(f"Input is missing expected columns: {missing}")

    unknown_ranges = set(df.Range.unique()) - set(RANGE_MAP.keys())
    if unknown_ranges:
        raise SystemExit(f"Unmapped range label(s), add to RANGE_MAP first: {unknown_ranges}")

    rows = []
    for _, r in df.iterrows():
        elevation = int(str(r['Elevation']).replace(',', '').replace("'", '').strip())
        range_label, palette_key = RANGE_MAP[r['Range']]
        rows.append({
            'name': uninvert_name(str(r['Peak Name']).strip()),
            'elevation': elevation,
            'rangeLabel': range_label,
            'paletteKey': palette_key,
            'lat': float(r['Latitude']),
            'lng': float(r['Longitude']),
            'sourceUrl': str(r['Source URL']).strip(),
            'sourceRank': int(r['Rank']),
        })

    # Elevation descending: this becomes rank_in_list for the co-13ers list.
    rows.sort(key=lambda x: -x['elevation'])

    with open(out_path, 'w') as f:
        json.dump(rows, f, indent=2)

    print(f"Wrote {len(rows)} peaks to {out_path}")
    ranges = {}
    for r in rows:
        ranges[r['rangeLabel']] = ranges.get(r['rangeLabel'], 0) + 1
    for label, count in sorted(ranges.items(), key=lambda kv: -kv[1]):
        print(f"  {label}: {count}")


if __name__ == '__main__':
    main()
