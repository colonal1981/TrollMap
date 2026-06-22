# 🎣 TrollMap GPX Studio — Carolinas Master Edition v10

**Elite Web-Based Precision Trolling Route Planner, Live Trip Briefing Generator,
Real-Time Lake/River Conditions Dashboard, and i-Boating Depth Contour Pipeline.**

Hosted on GitHub Pages: <https://colonal1981.github.io/TrollMap/>

---

## What TrollMap Does

TrollMap is a single-page fishing planning tool built specifically for serious
trollers in the Carolinas (SC / NC / GA). It combines:

- **GPX route planning** — draw waypoints and trolling lanes on a Leaflet map,
  export as a standard `.gpx` file your chartplotter can read
- **Live lake and river conditions** — real-time pool elevation, water temperature,
  dam schedules, and kayak safety ratings pulled from Duke Energy, Dominion, USGS,
  and the TrollMap Cloudflare worker
- **Depth contour overlay** — i-Boating chart captures georeferenced and imported
  as transparent overlays directly on the planning map
- **Rod spread builder** — plan every rod position, lure, depth, and lead length
  with auto-calculated lead based on trolling speed
- **Trip plan generator** — produces a full printable/exportable trip briefing
  including lake intel, clarity forecast, solunar timing, and tackle spread
- **GPX lane generator** — generates parallel trolling lanes, S-curves, and
  zigzag patterns from a start/end point or waypoint set

---

## Repository File Structure

```
colonal1981.github.io/TrollMap/
 ├── index.html                    # Main app — all UI, logic, and data in one file
 ├── manifest.json                 # PWA metadata
 ├── sw.js                         # Service worker for offline caching
 ├── js/
 │   └── lazy-data.js              # Lazy loader for optional GIS layers
 ├── icons/
 │   ├── icon-192.svg
 │   └── icon-512.svg
 ├── data/
 │   ├── tristate-bank-pier.json   # Bank/pier launch sites (loaded on toggle)
 │   ├── tristate-paddle.json      # Kayak/canoe launches (loaded on toggle)
 │   └── tristate-hotspots.json    # Fish attractors / SCDNR habitat data
 ├── trollmap-worker.js            # Cloudflare worker source (deploy separately)
 └── README.md                     # This file
```

To deploy: push `index.html`, `manifest.json`, `sw.js`, `js/`, `data/`, and
`icons/` to the `main` branch. GitHub Pages picks it up in ~60 seconds.

---

## Bottom Nav Tabs

| Tab | Purpose |
|---|---|
| 🗺 Map | Main planning map — waypoints, routes, chart overlays, lane drawing |
| ✏️ Edit | Table view of all waypoints and tracks for bulk editing |
| 🌀 Generate | Trolling lane generator — parallel passes, S-curves, zigzags |
| 🎣 Plan | Full trip planning — lake/river conditions, rod spread, intel briefing |

---

## Map Tab — Key Features

### Base Maps
- **Satellite** (Esri World Imagery)
- **Street** (OpenStreetMap)

Switch via the dropdown in the top toolbar.

### Waypoints & Routes
- Click the map in **+ WPT** mode to drop waypoints
- Draw tracks in **track** mode
- **Load** — imports GPX, KML, GeoJSON, or track files
- **Save GPX** — exports a standard GPX your Garmin/Humminbird can read
- **⤢ Fit** — fits the map view to all current waypoints/tracks
- **🔍 Jump** — prompts for lat/lon coordinates and flies to that location

### Depth Contour Overlays
The **📐 Charts** button opens the chart layers panel where you can manage imported
depth contour tiles — toggle visibility, adjust opacity, or delete individual tiles.

Contour tiles are imported from the i-Boating capture pipeline (see below). They
appear as transparent overlays georeferenced to the exact map position.

### Live OSM Structure Pull
**🌐 Live OSM Structure** fetches submerged roadbeds, old bridges, historic
foundations, and original river centerlines from OpenStreetMap's Overpass API
and adds them as a layer. Useful for finding pre-impoundment structure.

### Contour Area Drawing
**✏️ Contour Area** lets you draw a polygon on the map defining the area where
you want depth contours captured. When you finish drawing, a panel appears with:
- The polygon bounds and centroid coordinates
- An auto-generated i-Boating URL at the correct zoom
- A **Save job.json** button that downloads the job file for the capture server
- A **Run Capture Now** button that POSTs the job directly to your local
  TrollMap Capture Server if it's running

---

## i-Boating Depth Contour Pipeline

This is the core workflow for getting depth contour data into TrollMap.
The pipeline has three components that work together.

### Overview

```
Draw polygon in TrollMap
        ↓
  job.json exported
        ↓
  TrollMap Capture Server (local Python HTTP server)
        ↓
  trollmap_build_contours.py (capture + extract)
        ↓
  chartpack/ folder (PNG + .georef.json pairs)
        ↓
  📂 Charts button → auto-import into TrollMap
  (or auto-imported when server finishes)
```

### Component 1 — TrollMap Capture Server

`trollmap_capture_server.py` is a tiny local HTTP server (no external deps,
stdlib only) that runs on your machine and bridges TrollMap's browser UI to
the Python capture pipeline.

**Start it:**
```
py trollmap_capture_server.py
```
Runs on `http://127.0.0.1:8765` by default.

**Endpoints:**
| Endpoint | Method | Purpose |
|---|---|---|
| `/status` | GET | Current job state, progress, tile count, log tail |
| `/capture` | POST | Start a new capture (body = job.json) |
| `/cancel` | POST | Kill the running capture |
| `/list` | GET | List all completed chartpacks |
| `/chartpack/<name>/<path>` | GET | Serve a file from a chartpack folder |
| `/` | GET | HTML status page for debugging |

**Optional cloud upload:**
```
py trollmap_capture_server.py \
  --cloud-worker https://trollmap-worker.colonal1981.workers.dev \
  --sync-token YOUR_TOKEN
```
When configured, completed chartpacks are automatically uploaded to Cloudflare
R2 via the worker so your phone can also load them.

### Component 2 — trollmap_build_contours.py

The unified capture + extract + package pipeline. Can be run standalone or
called by the capture server.

**Subcommands:**
```
# Full pipeline from inline args
py trollmap_build_contours.py build \
  --url "https://fishing-app.gpsnauticalcharts.com/...#16.2/34.38/-80.76" \
  --north 34.39 --south 34.37 --west -80.77 --east -80.74 \
  --out chartpacks/wateree_clearwater

# From a job.json (what the server uses)
py trollmap_build_contours.py build --job job.json

# Extract contours only (already have raw tiles)
py trollmap_build_contours.py extract ./chartpacks/wateree_clearwater_work

# Re-package without re-capturing
py trollmap_build_contours.py package ./chartpacks/wateree_clearwater_work
```

**What it produces:**
```
chartpack/
  chartpack.json              # TrollMap-friendly metadata
  capture_manifest.json       # Full capture record
  contours/                   # PNG + .georef.json pairs ← import these
    iboating_R000_C000_contours.png
    iboating_R000_C000_contours.georef.json
    ...
  raws/                       # Original i-Boating screenshots (for re-extract)
  labels.geojson              # Reserved for future OCR depth labels
```

**Key capture settings:**
- Default viewport: 2400×1400 at zoom from URL hash
- Default wait: 12 seconds per tile (contour retry logic built in)
- Land tiles automatically skipped (water detection threshold: 4%)
- Contour quality check — tiles without visible contour detail are retried
  up to 4 times before saving a FAILED debug image

**Install once:**
```
py -m pip install playwright pillow numpy opencv-python
py -m playwright install chromium
```

### Component 3 — Georef Math

i-Boating URLs use the format `#zoom/lat/lon` which encodes the exact map
center. The script uses Web Mercator tile math to calculate precise bounding
boxes for every screenshot — no calibration, no measurement, no drift.
Every `.georef.json` sidecar contains:
```json
{
  "north": 34.38856,
  "south": 34.37234,
  "west": -80.77540,
  "east": -80.74890
}
```
TrollMap reads these directly and places each tile at pixel-perfect coordinates.

### Importing into TrollMap

After the pipeline runs, import the contour tiles via the **📐 Charts** button:
1. Click **📐 Charts** on the map toolbar
2. Select all files from `chartpack/contours/` (both PNG and .georef.json)
3. TrollMap reads each sidecar and places all tiles automatically
4. Map fits to the imported tile extent

When the capture server is running, TrollMap can poll `/status` and
auto-import when the job completes.

---

## Plan Tab

The Plan tab is the trip briefing center. Select a lake or river from the
dropdown and the following blocks auto-populate:

### Auto-runs on lake selection
| Block | Source | Notes |
|---|---|---|
| Live Water Conditions | Duke Energy API / USGS via worker | Pool elevation, water temp, full-pool %, advisory |
| 🧠 Lake Intelligence Briefing | `/lake-intel` worker route | Curated lake profile — fish species, forage, habitat, seasonal patterns, tactics |
| 🌦 Clarity & Runoff Forecast | `/lake-clarity` worker route | Predicted water clarity by zone based on 72h rain signal; auto-sets Water Clarity dropdown |

### Manual input blocks
| Block | How to trigger |
|---|---|
| NOAA Tides | Select a coastal reference station, then syncs automatically |
| Solunar | Fill in the date field; calculated from moon phase |
| Weather | Enter trip date; pulls forecast |
| River flow / dam schedule | Auto-runs when a river is selected instead of a lake |

### Rod Spread Builder
Add rods with **+ Rod** or load a preset with **Fill Default Spread**.

- Select lure type — A-Rig, Swimbait, Crankbait, Spoon, Topwater
- Lead length auto-calculates from depth and trolling speed
- A-Rig and Swimbait selections show an extra row for:
  - **A-Rig**: wire framework weight, jighead keel config
  - **Swimbait**: trailer profile size (3.3" – 7")
- Save named spreads with **💾 Save spread** — persists in IndexedDB
- Load saved spreads from the dropdown

### Plan Library
Plans are saved to IndexedDB with **💾 Save Plan** and available in the
Library sub-tab. Each saved plan includes:
- All metadata (lake, date, conditions, clarity, solunar)
- Full rod spread with all selections
- GPX waypoint/track count
- Lake intel and clarity forecast text

Export options: **HTML** (printable plan report) or **JSON** (for backup).
The **⬇ Save GPX** button on the map exports the current waypoints and tracks.

---

## Cloudflare Worker

The worker at `trollmap-worker.colonal1981.workers.dev` proxies live data
from Duke Energy, Dominion Energy, and USGS to avoid CORS and rate-limit issues.

To update: paste `trollmap-worker.js` into the Cloudflare dashboard → Save & Deploy.

**Worker routes:**

| Route | Returns |
|---|---|
| `/lake?lake=wateree` | Pool elevation, water temp, advisory, full-pool % |
| `/lake-intel?lake=wateree` | Curated lake profile + fishing intel briefing |
| `/lake-clarity?lake=wateree&date=2026-06-20` | Clarity/runoff forecast by zone |
| `/river?river=wateree` | River conditions, dam schedule, kayak safety |
| `/river?river=wateree&lat=33.94&lon=-80.62` | Location-aware surge ETA |
| `/duke?basin=1` | Raw Duke lake-level dashboard data |
| `/chartpacks/<lake>/<file>` | Serve uploaded chartpack files from R2 |

---

## IndexedDB — Persistent Storage

TrollMap saves the following to the browser's IndexedDB (survives page refresh):

| Store | Contents |
|---|---|
| `charts` | Imported contour tile overlays (PNG + bounds) |
| `layers` | Imported GeoJSON/KML/GPX layers |
| `spreads` | Named rod spread configurations |
| `plans` | Saved trip plans |
| `settings` | Gear autopilot profile, working GPX data, cached lake levels |
| `sonar` | (Reserved — sonar import not active in current build) |
| `journal` | Catch log entries |

DB version: 5. Data persists indefinitely unless you clear browser site data.

---

## GPS & Bluetooth

- **GPS tracking** — uses browser geolocation to show your position on the map
  and optionally record your track live
- **BLE remote** — connects to a Bluetooth remote (gamepad or custom device)
  for hands-free map navigation on the water
- **Gear Autopilot** — saves your motor (NK180 Pro) and sonar (Garmin ECHOMAP
  UHD2 93sv) profile and restores it on every load

---

## Installing as a PWA

- **iOS / Safari**: Open site → Share → "Add to Home Screen"
- **Android / Chrome**: Menu → "Install app"

Works offline for map navigation and plan viewing once cached.

---

## Data Sources

| Source | Used for |
|---|---|
| Duke Energy live API | Lake pool elevations, scheduled dam releases |
| Dominion Energy | Lower Saluda color-coded flow status |
| USGS Water Services | Real-time gauge data (JSON + RDB fallback) |
| i-Boating web app | Depth contour screenshots (via Playwright capture) |
| SCDNR | Boat ramp database (150+ SC/NC/GA reservoirs) |
| OpenStreetMap Overpass | Submerged structure, pre-impoundment features |
| Esri World Imagery | Satellite base map |

---

*Tight lines and huge stripers!* 🏆⛵🎣
