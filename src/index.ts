#!/usr/bin/env node
import { startHttpServer } from "./http.js";
import { startStdioServer } from "./stdio.js";

const mode = process.env.MCP_TRANSPORT ?? (process.env.PORT ? "http" : "stdio");

if (mode === "http") {
  try {
    startHttpServer();
  } catch (error) {
    console.error("Fatal error starting MCP server:", error);
    process.exit(1);
  }
} else {
  startStdioServer().catch((error) => {
    console.error("Fatal error starting MCP server:", error);
    process.exit(1);
  });
}
