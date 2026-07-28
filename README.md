# Fact of the Day

A small static dashboard that surfaces one obscure trivia fact a day, drawn
from a curated pool spanning technology, science, history, geography, and
biology.

## Features

- **Daily curated picks** — a GitHub Actions job runs every day and selects
  5 new facts from `data/facts-pool.json`, avoiding recent repeats, and
  writes the result to `data/daily.json`.
- **Randomize** — the 🎲 button on the dashboard picks a fresh fact on
  demand from the pool (respecting the active filter).
- **Category / domain filter** — filter by broad category (Technology,
  Science, History, Geography, Biology) and then by a specific domain
  within it (e.g. Space, World History, Animal Biology). The choice is
  remembered in the browser, so the dashboard stays focused on that domain
  until you change it.
- **Estonian translation** — every fact ships with a pre-written Estonian
  translation. The EN/ET toggle switches the whole dashboard's language
  instantly, no external API calls required.

## Project structure

```
index.html              Dashboard markup
css/style.css            Styling (light/dark aware)
js/app.js                 Client-side logic (filtering, randomize, translation)
data/facts-pool.json     The full curated fact pool (source of truth)
data/daily.json          Today's 5 selected fact IDs (auto-generated)
data/history.json        Rolling window of recently-used fact IDs (auto-generated)
scripts/select-daily-facts.js   Node script that picks the day's 5 facts
.github/workflows/daily-fact-update.yml   Scheduled job that runs the script daily
```

## Running locally

Static files with `fetch()` calls need to be served over HTTP (not opened
directly as `file://`):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Hosting on GitHub Pages

1. Push this repo to GitHub (on the default branch you want to publish).
2. In **Settings → Pages**, set "Deploy from a branch", pick that branch
   and the `/ (root)` folder.
3. In **Settings → Actions → General → Workflow permissions**, select
   "Read and write permissions" so the daily job can commit
   `data/daily.json` / `data/history.json` back to the repo.

The workflow runs at 03:00 UTC daily and can also be triggered manually
from the **Actions** tab ("Run workflow").

## Adding more facts

Append new entries to the `pool` array in `data/facts-pool.json`:

```json
{ "id": "geo-11", "category": "geography", "tag": "mountains", "en": "...", "et": "..." }
```

- `category` must be one of: `technology`, `science`, `history`,
  `geography`, `biology`.
- `tag` is a finer-grained domain label used for the sub-filter (e.g.
  `space`, `world-history`, `animal-biology`). Reuse an existing tag or
  introduce a new one — the UI picks up tags automatically.
- `id` must be unique.

The daily selection script will start including new facts in its rotation
automatically.
