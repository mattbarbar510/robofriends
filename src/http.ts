import { timingSafeEqual } from "node:crypto";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { NextFunction, Request, Response } from "express";
import { getDbPath, openDatabase } from "./db.js";
import { registerTools } from "./tools.js";

const METHOD_NOT_ALLOWED = {
  jsonrpc: "2.0" as const,
  error: { code: -32000, message: "Method not allowed." },
  id: null,
};

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function requireAuth(token: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.header("authorization") ?? "";
    const [scheme, credential] = header.split(" ");
    if (scheme !== "Bearer" || !credential || !constantTimeEquals(credential, token)) {
      res.status(401).json({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Unauthorized" },
        id: null,
      });
      return;
    }
    next();
  };
}

export function startHttpServer(): void {
  const token = process.env.MCP_AUTH_TOKEN;
  if (!token) {
    throw new Error("MCP_AUTH_TOKEN environment variable must be set to run in HTTP mode");
  }

  const db = openDatabase();
  const app = createMcpExpressApp({ host: "0.0.0.0" });
  const auth = requireAuth(token);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/mcp", auth, async (req, res) => {
    const server = new McpServer({
      name: "robofriends-calorie-tracker",
      version: "1.0.0",
    });
    registerTools(server, db);

    try {
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      res.on("close", () => {
        void transport.close();
        void server.close();
      });
    } catch (error) {
      console.error("Error handling MCP request:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  app.get("/mcp", auth, (_req, res) => {
    res.status(405).json(METHOD_NOT_ALLOWED);
  });

  app.delete("/mcp", auth, (_req, res) => {
    res.status(405).json(METHOD_NOT_ALLOWED);
  });

  const port = Number(process.env.PORT ?? 8080);
  app.listen(port, "0.0.0.0", () => {
    console.error(`robofriends calorie tracker MCP server listening on port ${port} (db: ${getDbPath()})`);
  });
}
