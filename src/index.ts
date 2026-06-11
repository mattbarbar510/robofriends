#!/usr/bin/env node
import { startStdioServer } from "./stdio.js";

startStdioServer().catch((error) => {
  console.error("Fatal error starting MCP server:", error);
  process.exit(1);
});
