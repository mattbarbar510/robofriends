# robofriends — Calorie Tracker MCP Server

A small local MCP server that gives Claude persistent storage for a food/calorie log,
so you get richer history (daily summaries, macro totals, trends over time) instead
of one-off chat answers.

It stores entries in a local SQLite database (default `~/.robofriends/calories.db`).

## Setup

```bash
npm install
npm run build
```

## Tools

- **log_food** — record a food/drink entry (description, calories, protein/carbs/fat, meal type, notes, timestamp)
- **get_food_log** — list logged entries, optionally filtered by date range / meal type
- **update_food_entry** — fix an existing entry by id
- **delete_food_entry** — remove an entry by id
- **get_daily_summary** — per-day totals (calories + macros) for a date range
- **get_nutrition_stats** — aggregate totals and daily averages over a date range

## Using with Claude Desktop / Claude Code

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

Restart Claude. You can now say things like "I just had a turkey sandwich and an
apple" and Claude can log it, then later ask "how am I doing on calories this week?"
and Claude can pull a summary from your history.

## Configuration

- `ROBOFRIENDS_DB_PATH` — override the SQLite database file location (default `~/.robofriends/calories.db`)
