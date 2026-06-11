import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type Database from "better-sqlite3";
import { z } from "zod";
import {
  deleteEntry,
  getDailySummary,
  getNutritionStats,
  insertEntry,
  listEntries,
  updateEntry,
} from "./db.js";

const mealTypeSchema = z
  .enum(["breakfast", "lunch", "dinner", "snack", "other"])
  .optional()
  .describe("Type of meal this entry belongs to");

const dateSchema = z
  .string()
  .describe("Date in YYYY-MM-DD format (or a full ISO 8601 timestamp)");

export function registerTools(server: McpServer, db: Database.Database): void {
  server.registerTool(
    "log_food",
    {
      title: "Log Food",
      description:
        "Record a food/drink entry with its calories and macros. Use this whenever the user mentions something they ate or drank.",
      inputSchema: {
        description: z.string().describe("What was eaten or drunk, e.g. 'grilled chicken salad'"),
        calories: z.number().describe("Total calories for this entry"),
        protein_g: z.number().optional().describe("Protein in grams"),
        carbs_g: z.number().optional().describe("Carbohydrates in grams"),
        fat_g: z.number().optional().describe("Fat in grams"),
        meal_type: mealTypeSchema,
        notes: z.string().optional().describe("Any extra context, e.g. 'ate out', 'estimated portion'"),
        timestamp: z
          .string()
          .optional()
          .describe("ISO 8601 timestamp for when this was consumed. Defaults to now if omitted."),
      },
    },
    async (args) => {
      const entry = insertEntry(db, {
        timestamp: args.timestamp ?? new Date().toISOString(),
        description: args.description,
        calories: args.calories,
        protein_g: args.protein_g,
        carbs_g: args.carbs_g,
        fat_g: args.fat_g,
        meal_type: args.meal_type,
        notes: args.notes,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(entry, null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_food_log",
    {
      title: "Get Food Log",
      description: "Retrieve logged food entries, optionally filtered by date range and meal type.",
      inputSchema: {
        start_date: dateSchema.optional().describe("Only include entries on or after this date"),
        end_date: dateSchema.optional().describe("Only include entries on or before this date"),
        meal_type: mealTypeSchema,
        limit: z.number().int().positive().optional().describe("Maximum number of entries to return (default 50)"),
      },
    },
    async (args) => {
      const entries = listEntries(db, {
        startDate: args.start_date,
        endDate: args.end_date,
        mealType: args.meal_type,
        limit: args.limit,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(entries, null, 2) }],
      };
    }
  );

  server.registerTool(
    "update_food_entry",
    {
      title: "Update Food Entry",
      description: "Update fields on an existing food log entry, e.g. to correct a calorie estimate.",
      inputSchema: {
        id: z.number().int().describe("ID of the food log entry to update"),
        description: z.string().optional(),
        calories: z.number().optional(),
        protein_g: z.number().optional(),
        carbs_g: z.number().optional(),
        fat_g: z.number().optional(),
        meal_type: mealTypeSchema,
        notes: z.string().optional(),
        timestamp: z.string().optional().describe("ISO 8601 timestamp"),
      },
    },
    async (args) => {
      const { id, ...update } = args;
      const entry = updateEntry(db, id, update);
      if (!entry) {
        return {
          content: [{ type: "text", text: `No food log entry found with id ${id}` }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(entry, null, 2) }],
      };
    }
  );

  server.registerTool(
    "delete_food_entry",
    {
      title: "Delete Food Entry",
      description: "Delete a food log entry by ID.",
      inputSchema: {
        id: z.number().int().describe("ID of the food log entry to delete"),
      },
    },
    async (args) => {
      const deleted = deleteEntry(db, args.id);
      return {
        content: [
          {
            type: "text",
            text: deleted ? `Deleted entry ${args.id}` : `No food log entry found with id ${args.id}`,
          },
        ],
        isError: !deleted,
      };
    }
  );

  server.registerTool(
    "get_daily_summary",
    {
      title: "Get Daily Summary",
      description:
        "Get per-day totals (calories, protein, carbs, fat, entry count) for a date range. Defaults to today if no dates are given.",
      inputSchema: {
        start_date: dateSchema.optional().describe("Defaults to today"),
        end_date: dateSchema.optional().describe("Defaults to start_date"),
      },
    },
    async (args) => {
      const today = new Date().toISOString().slice(0, 10);
      const startDate = args.start_date ?? today;
      const endDate = args.end_date ?? startDate;
      const summary = getDailySummary(db, startDate, endDate);
      return {
        content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_nutrition_stats",
    {
      title: "Get Nutrition Stats",
      description:
        "Get aggregate nutrition stats (totals and daily averages) over a date range. Defaults to the last 7 days.",
      inputSchema: {
        start_date: dateSchema.optional().describe("Defaults to 7 days ago"),
        end_date: dateSchema.optional().describe("Defaults to today"),
      },
    },
    async (args) => {
      const today = new Date();
      const endDate = args.end_date ?? today.toISOString().slice(0, 10);
      const defaultStart = new Date(today);
      defaultStart.setDate(defaultStart.getDate() - 6);
      const startDate = args.start_date ?? defaultStart.toISOString().slice(0, 10);
      const stats = getNutritionStats(db, startDate, endDate);
      return {
        content: [{ type: "text", text: JSON.stringify(stats, null, 2) }],
      };
    }
  );
}
