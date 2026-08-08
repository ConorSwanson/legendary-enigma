#!/usr/bin/env python3
"""
Scrapes the Colorado 13ers list and each peak's page from 14ers.com,
then writes a sorted xlsx spreadsheet.

Usage: python3 scrape_13ers.py

Resumable: peak list and per-peak coordinates are checkpointed to
progress.json after every fetch, so a re-run picks up where it left off
instead of re-fetching pages that already succeeded.
"""
import json
import re
import sys
import time
import logging
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from openpyxl import Workbook

BASE = "https://www.14ers.com"
LIST_URL = f"{BASE}/13ers?sublist=13ers&ranked=1"
CRAWL_DELAY = 5  # seconds, per robots.txt
OUT_DIR = Path(__file__).parent
PROGRESS_FILE = OUT_DIR / "progress.json"
LOG_FILE = OUT_DIR / "scrape.log"
XLSX_FILE = OUT_DIR / "colorado_13ers.xlsx"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml",
}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(message)s",
    handlers=[logging.FileHandler(LOG_FILE), logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger(__name__)

session = requests.Session()
session.headers.update(HEADERS)


def fetch(url, retries=3):
    last_exc = None
    for attempt in range(1, retries + 1):
        try:
            resp = session.get(url, timeout=30)
            resp.raise_for_status()
            return resp.text
        except Exception as exc:
            last_exc = exc
            log.warning(f"fetch failed ({attempt}/{retries}) for {url}: {exc}")
            if attempt < retries:
                time.sleep(CRAWL_DELAY)
    raise RuntimeError(f"giving up on {url}: {last_exc}")


def parse_peak_list(html):
    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table", id="peakTable")
    rows = table.find("tbody").find_all("tr")
    peaks = []
    for tr in rows:
        cells = tr.find_all("td")
        name_link = cells[0].find("a")
        name = name_link.get_text(strip=True)
        href = name_link["href"]
        url = BASE + href if href.startswith("/") else href
        co_rank_text = cells[2].get_text(strip=True)
        thirteener_rank_text = cells[3].get_text(strip=True)
        elevation = cells[4].get_text(strip=True)
        peak_range = cells[5].get_text(strip=True)
        if not co_rank_text:
            continue  # unranked/insufficient-prominence peak, skip
        peaks.append(
            {
                "co_rank": int(co_rank_text),
                "thirteener_rank": int(thirteener_rank_text) if thirteener_rank_text else None,
                "name": name,
                "elevation": elevation,
                "range": peak_range,
                "url": url,
                "latitude": None,
                "longitude": None,
                "coords_fetched": False,
            }
        )
    return peaks


LATLON_RE = re.compile(
    r'Lat\s*/\s*Lon</span>\s*<span class="peak_stat_value">'
    r'<a href="[^"]*">\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)\s*</a>'
)


def parse_latlon(html):
    m = LATLON_RE.search(html)
    if m:
        return float(m.group(1)), float(m.group(2))
    # fallback: schema.org GeoCoordinates JSON-LD block
    m2 = re.search(
        r'"latitude":\s*"?(-?\d+\.\d+)"?,\s*"longitude":\s*"?(-?\d+\.\d+)"?', html
    )
    if m2:
        return float(m2.group(1)), float(m2.group(2))
    return None, None


def load_progress():
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE) as f:
            return json.load(f)
    return None


def save_progress(peaks):
    with open(PROGRESS_FILE, "w") as f:
        json.dump(peaks, f, indent=1)


def build_xlsx(peaks):
    wb = Workbook()
    ws = wb.active
    ws.title = "Colorado 13ers"
    ws.append(["Rank", "Peak Name", "Elevation", "Range", "Latitude", "Longitude", "Source URL"])
    for p in sorted(peaks, key=lambda x: x["co_rank"]):
        ws.append(
            [
                p["co_rank"],
                p["name"],
                p["elevation"],
                p["range"],
                p["latitude"],
                p["longitude"],
                p["url"],
            ]
        )
    widths = [8, 28, 12, 18, 12, 12, 45]
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = w
    wb.save(XLSX_FILE)
    log.info(f"wrote {XLSX_FILE} ({len(peaks)} peaks)")


def main():
    peaks = load_progress()
    if peaks is None:
        log.info("fetching peak list...")
        html = fetch(LIST_URL)
        peaks = parse_peak_list(html)
        log.info(f"parsed {len(peaks)} ranked peaks")
        save_progress(peaks)
        time.sleep(CRAWL_DELAY)
    else:
        log.info(f"resuming from checkpoint: {len(peaks)} peaks in progress file")

    remaining = [p for p in peaks if not p["coords_fetched"]]
    log.info(f"{len(remaining)} peaks still need coordinates")

    failures = []
    for i, p in enumerate(remaining, start=1):
        try:
            html = fetch(p["url"])
            lat, lon = parse_latlon(html)
            if lat is None:
                log.warning(f"no lat/lon found for {p['name']} ({p['url']})")
                failures.append(p["url"])
            p["latitude"] = lat
            p["longitude"] = lon
            p["coords_fetched"] = True
            log.info(f"[{i}/{len(remaining)}] {p['name']}: {lat}, {lon}")
        except Exception as exc:
            log.error(f"FAILED {p['name']} ({p['url']}): {exc}")
            failures.append(p["url"])
        finally:
            save_progress(peaks)
            time.sleep(CRAWL_DELAY)

    build_xlsx(peaks)

    if failures:
        log.warning(f"{len(failures)} peaks failed to get coordinates: {failures}")
        sys.exit(1)
    log.info("done.")


if __name__ == "__main__":
    main()
