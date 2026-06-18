# 🎣 TrollMap GPX Studio — Carolinas Master Edition v10

**Elite Web-Based Precision Trolling Route Planner, Quickdraw Studio, Live Trip
Briefing Generator, and Real-Time River Safety Dashboard.**

Hosted on GitHub Pages: <https://colonal1981.github.io/TrollMap/>

---

## 🆕 What's new in v10 (2026-06-18)

### 1. Lake conditions actually correct (worker fix)
The old worker fetched the deprecated `lakes.duke-energy.com/Data/Lakes/*.txt`
endpoint that Duke retired in 2026. When that returned 404, the front-end fell
back to USGS site 02148000 — the **river gauge BELOW Wateree Dam** — and showed
river stage as if it were lake pool elevation.

Fixed:
- **Worker now uses Duke's live API** at
  `api.hydro-derived.duke-energy.app/lakes/current-level`, returning real pool
  elevations for every Duke lake in two formats (percent of full pool AND feet
  AMSL).
- **USGS RDB fallback** — when USGS's JSON API returns empty arrays for a gauge
  that still has fresh data (a recurring USGS bug), the worker automatically
  falls back to the tab-format RDB endpoint which always works.
- **Sample (Lake Wateree)**: returns elevation `220.76 ft AMSL`, `97.9 %` of
  full pool, water temp `77 °F`, plus the live Duke drought-stage advisory text.

### 2. New 🌊 Rivers tab
A whole new bottom-nav tab for the six rivers within range of the user
(Wateree, Congaree, Cooper system, Santee, Broad, Lower Saluda). Each river
shows:

- **Live USGS streamflow, gauge height, and water temperature** with automatic
  JSON→RDB fallback for the periods USGS's JSON endpoint returns empty data.
- **Real-time dam release schedules** from:
  - **Duke Energy**'s hidden API at
    `api.hydro-derived.duke-energy.app/rivers/flow-arrivals/{basin}` —
    actual scheduled arrival times at named downstream mile markers with
    predicted recession times. Discovered by reverse-engineering the Angular
    SPA bundle.
  - **Dominion Energy**'s Lower Saluda page — scraped color-coded current
    and planned flow status (BLUE / YELLOW / RED) with CFS thresholds from
    gopaddlesc.com.
  - Santee Cooper has no real-time API; they explicitly link to USGS gauges
    which we already query.
- **Cross-linked upstream lake pool elevation** — open the Saluda page and
  you also see Lake Murray's current pool + any drought advisory.
- **Kayak / canoe Go-No-Go logic** with per-river safety thresholds, calibrated
  for the documented behavior of each system. Lower Saluda triggers a cold-water
  warning below 60°F (its normal year-round temperature) because the bottom-draw
  water from Murray is dangerous in a capsize even in July.

### 3. Location-aware surge math
The same dam release means very different things depending on **where you are
on the river**. The new module lets you set your location three ways:

- **GPS** — browser geolocation, for on-the-water use
- **Map click** — for trip planning
- **Dropdown of known ramps** — pulled from your existing SCDNR ramp data

It then computes:
- River-mile from the dam (via a per-river centerline with verified waypoints)
- Surge arrival time at YOUR location (using calibrated celerity ≈ 2.5 mph for Wateree)
- Severity attenuation factor (1.0 at the dam → 0.2 by the time the surge
  reaches Lake Marion, matching the documented paddler observation of "5 ft
  surge still arriving at mile 35")
- Go/No-Go status that **escalates based on YOUR position**, not the dam's

Example: today's 5:48 PM Wateree release means:

| Your position | River mile | Surge ETA at YOU | Severity | Go/No-Go |
|---|---|---|---|---|
| Lugoff (just below dam) | 0.3 | 2:57 PM today | FULL | 🛑 NO-GO |
| Hwy 1/601 (Camden) | 7.4 | 5:48 PM today | FULL | 🛑 NO-GO |
| WT Billy Tolar | 29 | 2:26 AM tomorrow | MODERATE | ⚠ Caution |
| Confluence / Sparkleberry | 48 | 10:02 AM tomorrow | MINOR | ℹ Info only |

### 4. SCDNR data overlay (the "William Dennis Fix")
The SCDNR `TRISTATE_MASTER_RAMPS` database is hydrologically/biologically
accurate but practically annoying. The William Dennis Landing — where you fish
shad on the Pinopolis tailrace — is filed under `"Tail Race Canal"` (an
official water-body name) instead of under `"Cooper River"` where every
fisherman would look for it.

The new **Fishing-Index overlay** is a **non-destructive** layer that:
- Groups SCDNR keys into fisherman-friendly systems
  (e.g., **Cooper River system** = `Tail Race Canal` + `Wadboo Creek` +
  `Goose Creek` + `Back River` + `Cooper River`).
- Annotates ramps with their original waterbody for context
  (William Dennis shows as **"William Dennis (Pinopolis tailrace —
  great shad in season) ⚠ temporarily closed for renovations"**).
- **Corrects 5 active data bugs** in SCDNR data: the `"Broad River"` entry
  contained 2 ramps that aren't on the inland Broad above Columbia, and
  `"Lake Russell"` contained 2 ramps from completely different lakes named
  Russell in north and south Georgia.
- Leaves the original `TRISTATE_MASTER_RAMPS` data **untouched** — corrections
  are applied at read time.

### 5. Bonus river systems handled
- **Lake Marion (full)** = `Lake Marion` + `Pool D` + `Pool L` + `Mays Lake`
  (upper-pool sub-pools that biologists track separately)
- **Lake Monticello (full)** = `Lake Monticello` + `Monticello Recreation Lake`
- **Murrells Inlet / ICW** = overlapping water under two SCDNR keys
- **Charleston Harbor inshore** = 8 tidal creek SCDNR keys grouped together

---

## 📁 Repository File Structure

```
colonal1981.github.io/TrollMap/
 ├── index.html                           # The complete app (v10, everything baked in)
 ├── TrollMap_v8_CarolinaMaster.html      # Legacy redirect — kept for backwards-compat
 ├── manifest.json                        # PWA metadata
 ├── sw.js                                # Service worker (offline caching)
 ├── Module_H_WebBluetooth_Xzny_Bms.html  # Standalone BLE battery monitor
 ├── LakeSources.json                     # Tristate GIS reference
 └── README.md                            # This file
```

---

## ⚙️ How to Deploy

1. **Push the updated `index.html`** to the `main` branch of
   `colonal1981/TrollMap`.
2. **GitHub Pages** picks it up automatically in ~60 seconds.
3. Live app: <https://colonal1981.github.io/TrollMap/>

That's it. v10 is single-file: everything (Rivers tab, fishing-index overlay,
all the styles and JavaScript) is inlined in `index.html` so the deploy is
exactly what you've been doing every other time.

---

## 🛰 Cloudflare Worker

The Cloudflare worker at `trollmap-worker.colonal1981.workers.dev` powers the
live lake / river data. To update it, paste the contents of `trollmap-worker.js`
(maintained in the build workspace, NOT in this repo) over the worker code in
the Cloudflare dashboard and click Save & Deploy.

Worker routes:

| Route | Returns |
|---|---|
| `/lake?lake=wateree` | Unified lake JSON: pool elevation, water temp, advisory |
| `/river?river=wateree` | River conditions + dam schedule + kayak safety |
| `/river?river=wateree&lat=33.94&lon=-80.62` | Location-aware surge ETA |
| `/duke?basin=1` | Raw Duke lake-level dashboard data |
| `/duke-flow-arrivals?basin=1` | Raw Duke scheduled dam-release JSON |
| `/dominion-saluda` | Raw Dominion Lower Saluda color-coded status |
| `/rivers` | List of supported rivers |

---

## 📲 Installing as a PWA

* **iOS / Safari**: Open the site → Share → "Add to Home Screen".
* **Android / Chrome**: Menu → "Install app" or "Add to Home screen".

---

## 🗺 Wateree ActiveCaptain chart overlay (future feature)

The build workspace also contains `georef_charts.html` and a Python/PowerShell
batch-shrink toolkit for processing the 107 Garmin ActiveCaptain chart
screenshots into a Leaflet overlay. That feature is NOT yet baked into v10
of `index.html` — when ready, the generated `leaflet_garmin_grid.js` will be
inlined the same way the rivers module is.

---

## 🙏 Credits & data sources

| Source | Used for |
|---|---|
| Duke Energy | Lake pool levels (API), scheduled dam releases (API) |
| Dominion Energy | Lower Saluda color-coded flow status (HTML scrape) |
| Santee Cooper | Points to USGS — used USGS directly |
| USGS Water Services | Real-time gauge data (instantaneous, with RDB fallback) |
| SCDNR | `TRISTATE_MASTER_RAMPS` ramp database |
| Angler's Headquarters | Water temperature scrape (fallback when USGS data missing) |
| gopaddlesc.com / Discover SC | Lower Saluda CFS thresholds |
| paddling.com Wateree trip report | Surge attenuation calibration ("5 ft at mile 35") |

*Tight lines and huge stripers!* 🏆⛵🎣
