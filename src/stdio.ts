import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getDbPath, openDatabase } from "./db.js";
import { registerTools } from "./tools.js";

export async function startStdioServer(): Promise<void> {
  const db = openDatabase();
  const server = new McpServer({
    name: "robofriends-calorie-tracker",
    version: "1.0.0",
  });
  registerTools(server, db);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`robofriends calorie tracker MCP server running on stdio (db: ${getDbPath()})`);
}
