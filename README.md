# robofriends — Calorie Tracker MCP Server

An MCP server that gives Claude persistent storage for a food/calorie log,
so you get richer history (daily summaries, macro totals, trends over time) instead
of one-off chat answers.

It stores entries in SQLite and can run either:

- **locally over stdio** — for Claude Desktop / Claude Code on your machine
- **remotely over HTTP** — deploy it once (e.g. to Fly.io) and connect to it from
  anywhere, without your computer needing to be on

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

## Option 1: Run locally over stdio

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

## Option 2: Deploy as a remote HTTP server (Fly.io)

This runs the same server in HTTP mode, protected by a bearer token, with the
SQLite database on a persistent volume.

### Deploy

```bash
# 1. Install the flyctl CLI and log in: https://fly.io/docs/flyctl/install/
fly auth login

# 2. Create the app (pick a unique name, or edit fly.toml afterwards)
fly launch --no-deploy

# 3. Create a persistent volume for the database (same region as your app)
fly volumes create robofriends_data --region iad --size 1

# 4. Generate and set an auth token - keep this secret, it's the password for your data
fly secrets set MCP_AUTH_TOKEN=$(openssl rand -hex 32)

# 5. Deploy
fly deploy
```

Your server is now reachable at `https://<your-app>.fly.dev/mcp`. A `/health`
endpoint (no auth required) is available for Fly's health checks.

### Connect to the remote server

For MCP clients that support remote HTTP servers with custom headers (e.g.
Claude Code's `.mcp.json` / `claude mcp add --transport http`):

```json
{
  "mcpServers": {
    "calorie-tracker": {
      "type": "http",
      "url": "https://<your-app>.fly.dev/mcp",
      "headers": {
        "Authorization": "Bearer <your MCP_AUTH_TOKEN>"
      }
    }
  }
}
```

For Claude Desktop, which doesn't yet support custom headers for remote servers
directly, use the [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) proxy:

```json
{
  "mcpServers": {
    "calorie-tracker": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://<your-app>.fly.dev/mcp",
        "--header",
        "Authorization: Bearer <your MCP_AUTH_TOKEN>"
      ]
    }
  }
}
```

> **Note:** claude.ai's web/mobile "Connectors" UI currently expects remote MCP
> servers to support OAuth, which this simple bearer-token server does not
> implement. Bearer-token auth works great with Claude Code and Claude
> Desktop (via `mcp-remote`) from any device. If you want full claude.ai
> mobile/web connector support, that needs an OAuth layer added on top — let
> me know if you'd like that as a follow-up.

## Configuration

| Env var | Description | Default |
| --- | --- | --- |
| `ROBOFRIENDS_DB_PATH` | SQLite database file location | `~/.robofriends/calories.db` (or `/data/calories.db` in Docker) |
| `MCP_TRANSPORT` | `stdio` or `http`. Defaults to `http` if `PORT` is set, else `stdio` | - |
| `PORT` | Port for HTTP mode | `8080` |
| `MCP_AUTH_TOKEN` | Bearer token required for HTTP mode (required, no default) | - |
