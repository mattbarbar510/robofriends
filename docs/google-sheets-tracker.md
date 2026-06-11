# Calorie Tracking with Google Sheets (no new accounts, works anywhere)

This is the zero-setup option: Claude logs your food to a Google Sheet using
your existing Google account, via claude.ai's built-in Google Drive connector.
No hosting, no Docker, no new signups — works from claude.ai on your phone or
any computer.

## 1. Connect Google Drive in claude.ai

1. Open claude.ai → **Settings → Connectors**.
2. Find **Google Drive** (sometimes listed under "Google Workspace") and click
   **Connect**, then sign in with your existing Google account.
3. Make sure the connector has permission to create/edit files (Claude needs
   write access to add rows).

## 2. Create the tracking sheet

Create a new Google Sheet called **Calorie Log** with these column headers in
row 1:

| date | time | description | calories | protein_g | carbs_g | fat_g | meal_type | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

A starter file with just this header row is included at
[`docs/calorie-log-template.csv`](calorie-log-template.csv) — import it into
Google Sheets (File → Import → Upload) to create the sheet pre-formatted.

## 3. (Recommended) Create a Claude Project with standing instructions

Create a claude.ai **Project** (e.g. "Calorie Tracker"), enable the Google
Drive connector for it, and add these custom instructions:

```
You help me track food and calories using my "Calorie Log" Google Sheet.

When I mention something I ate or drank:
- Estimate calories, protein_g, carbs_g, and fat_g as best you can.
- Append a new row to the "Calorie Log" sheet with: date (today, YYYY-MM-DD
  unless I specify otherwise), time (HH:MM), description, calories,
  protein_g, carbs_g, fat_g, meal_type (breakfast/lunch/dinner/snack/other),
  and notes (e.g. "estimated").
- Briefly confirm what you logged and the running total for today.

When I ask about my history, trends, or "how am I doing":
- Read the relevant rows from the "Calorie Log" sheet.
- Compute totals/averages as needed (e.g. daily totals, weekly averages,
  macro breakdowns) and summarize clearly.

If I ask to fix or remove an entry, find the matching row and edit/delete it.
```

Every conversation in that Project will now use the same sheet automatically.

## 4. Use it

- "I just had a turkey sandwich and an apple for lunch" → Claude estimates
  calories/macros and appends a row.
- "How am I doing on calories today?" / "this week?" → Claude reads the sheet
  and summarizes.
- "Actually that sandwich was more like 500 calories" → Claude updates the row.

## Tradeoffs vs. the local MCP server

- ✅ No setup beyond connecting your existing Google account
- ✅ Works from any device, including mobile claude.ai
- ⚠️ Summaries are computed by Claude reading the sheet each time, rather than
  via dedicated SQL queries — fine at the scale of a personal food log, but
  slower if the sheet grows very large (thousands of rows)
- ⚠️ Relies on Claude consistently following the Project instructions rather
  than a fixed tool schema
