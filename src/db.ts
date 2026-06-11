import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DEFAULT_DB_PATH = path.join(os.homedir(), ".robofriends", "calories.db");

export interface FoodEntry {
  id: number;
  timestamp: string;
  description: string;
  calories: number;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  meal_type: string | null;
  notes: string | null;
}

export interface NewFoodEntry {
  timestamp: string;
  description: string;
  calories: number;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  meal_type?: string | null;
  notes?: string | null;
}

export interface FoodEntryUpdate {
  timestamp?: string;
  description?: string;
  calories?: number;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  meal_type?: string | null;
  notes?: string | null;
}

export interface ListFilters {
  startDate?: string;
  endDate?: string;
  mealType?: string;
  limit?: number;
}

export interface DailySummary {
  date: string;
  entry_count: number;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
}

export interface NutritionStats {
  start_date: string;
  end_date: string;
  entry_count: number;
  days_with_entries: number;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  avg_calories_per_day: number;
  avg_protein_g_per_day: number;
  avg_carbs_g_per_day: number;
  avg_fat_g_per_day: number;
}

export function getDbPath(): string {
  return process.env.ROBOFRIENDS_DB_PATH || DEFAULT_DB_PATH;
}

export function openDatabase(dbPath: string = getDbPath()): Database.Database {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS food_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      description TEXT NOT NULL,
      calories REAL NOT NULL,
      protein_g REAL,
      carbs_g REAL,
      fat_g REAL,
      meal_type TEXT,
      notes TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_food_log_timestamp ON food_log(timestamp);
  `);
  return db;
}

export function insertEntry(db: Database.Database, entry: NewFoodEntry): FoodEntry {
  const stmt = db.prepare(`
    INSERT INTO food_log (timestamp, description, calories, protein_g, carbs_g, fat_g, meal_type, notes)
    VALUES (@timestamp, @description, @calories, @protein_g, @carbs_g, @fat_g, @meal_type, @notes)
  `);
  const result = stmt.run({
    timestamp: entry.timestamp,
    description: entry.description,
    calories: entry.calories,
    protein_g: entry.protein_g ?? null,
    carbs_g: entry.carbs_g ?? null,
    fat_g: entry.fat_g ?? null,
    meal_type: entry.meal_type ?? null,
    notes: entry.notes ?? null,
  });
  return getEntry(db, Number(result.lastInsertRowid)) as FoodEntry;
}

export function getEntry(db: Database.Database, id: number): FoodEntry | undefined {
  return db.prepare("SELECT * FROM food_log WHERE id = ?").get(id) as FoodEntry | undefined;
}

export function listEntries(db: Database.Database, filters: ListFilters = {}): FoodEntry[] {
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (filters.startDate) {
    conditions.push("date(timestamp) >= date(@startDate)");
    params.startDate = filters.startDate;
  }
  if (filters.endDate) {
    conditions.push("date(timestamp) <= date(@endDate)");
    params.endDate = filters.endDate;
  }
  if (filters.mealType) {
    conditions.push("meal_type = @mealType");
    params.mealType = filters.mealType;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = filters.limit ?? 50;

  return db
    .prepare(`SELECT * FROM food_log ${where} ORDER BY timestamp DESC LIMIT @limit`)
    .all({ ...params, limit }) as FoodEntry[];
}

export function updateEntry(db: Database.Database, id: number, update: FoodEntryUpdate): FoodEntry | undefined {
  const existing = getEntry(db, id);
  if (!existing) return undefined;

  const fields = Object.keys(update) as (keyof FoodEntryUpdate)[];
  if (fields.length === 0) return existing;

  const setClause = fields.map((field) => `${field} = @${field}`).join(", ");
  const params: Record<string, unknown> = { id };
  for (const field of fields) {
    params[field] = update[field] ?? null;
  }

  db.prepare(`UPDATE food_log SET ${setClause} WHERE id = @id`).run(params);
  return getEntry(db, id);
}

export function deleteEntry(db: Database.Database, id: number): boolean {
  const result = db.prepare("DELETE FROM food_log WHERE id = ?").run(id);
  return result.changes > 0;
}

export function getDailySummary(db: Database.Database, startDate: string, endDate: string): DailySummary[] {
  return db
    .prepare(
      `SELECT
         date(timestamp) AS date,
         COUNT(*) AS entry_count,
         COALESCE(SUM(calories), 0) AS total_calories,
         COALESCE(SUM(protein_g), 0) AS total_protein_g,
         COALESCE(SUM(carbs_g), 0) AS total_carbs_g,
         COALESCE(SUM(fat_g), 0) AS total_fat_g
       FROM food_log
       WHERE date(timestamp) >= date(@startDate) AND date(timestamp) <= date(@endDate)
       GROUP BY date(timestamp)
       ORDER BY date`
    )
    .all({ startDate, endDate }) as DailySummary[];
}

export function getNutritionStats(db: Database.Database, startDate: string, endDate: string): NutritionStats {
  const row = db
    .prepare(
      `SELECT
         COUNT(*) AS entry_count,
         COUNT(DISTINCT date(timestamp)) AS days_with_entries,
         COALESCE(SUM(calories), 0) AS total_calories,
         COALESCE(SUM(protein_g), 0) AS total_protein_g,
         COALESCE(SUM(carbs_g), 0) AS total_carbs_g,
         COALESCE(SUM(fat_g), 0) AS total_fat_g
       FROM food_log
       WHERE date(timestamp) >= date(@startDate) AND date(timestamp) <= date(@endDate)`
    )
    .get({ startDate, endDate }) as Omit<NutritionStats, "start_date" | "end_date" | "avg_calories_per_day" | "avg_protein_g_per_day" | "avg_carbs_g_per_day" | "avg_fat_g_per_day">;

  const days = row.days_with_entries || 1;

  return {
    start_date: startDate,
    end_date: endDate,
    entry_count: row.entry_count,
    days_with_entries: row.days_with_entries,
    total_calories: row.total_calories,
    total_protein_g: row.total_protein_g,
    total_carbs_g: row.total_carbs_g,
    total_fat_g: row.total_fat_g,
    avg_calories_per_day: row.total_calories / days,
    avg_protein_g_per_day: row.total_protein_g / days,
    avg_carbs_g_per_day: row.total_carbs_g / days,
    avg_fat_g_per_day: row.total_fat_g / days,
  };
}
