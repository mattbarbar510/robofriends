# robofriends — Calorie Tracking

Two ways to give Claude richer, persistent history for calorie/macro tracking:

1. **Local MCP server** (in this repo) — SQLite-backed, runs on your computer via
   Claude Desktop / Claude Code, with purpose-built tools for daily summaries and
   nutrition stats.
2. **Google Sheets** — no server, no new accounts, works from claude.ai on any
   device (including your phone) using a connector to your existing Google
   account. See [`docs/google-sheets-tracker.md`](docs/google-sheets-tracker.md).

If you don't want to run anything locally, go straight to the Google Sheets guide.

## Local MCP Server

Stores entries in SQLite (default `~/.robofriends/calories.db`).

### Setup

```bash
npm install
npm run build
```

### Tools

- **log_food** — record a food/drink entry (description, calories, protein/carbs/fat, meal type, notes, timestamp)
- **get_food_log** — list logged entries, optionally filtered by date range / meal type
- **update_food_entry** — fix an existing entry by id
- **delete_food_entry** — remove an entry by id
- **get_daily_summary** — per-day totals (calories + macros) for a date range
- **get_nutrition_stats** — aggregate totals and daily averages over a date range

### Run with Claude Desktop / Claude Code

Add this server to your MCP client config, e.g. in `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "calorie-tracker": {
      "command": "node",
      "args": ["/absolute/path/to/robofriends/dist/index.js"]
    }
  }
}
```

Restart Claude. Entries are stored in `~/.robofriends/calories.db` (override with
`ROBOFRIENDS_DB_PATH`).

## Configuration

| Env var | Description | Default |
| --- | --- | --- |
| `ROBOFRIENDS_DB_PATH` | SQLite database file location | `~/.robofriends/calories.db` |
