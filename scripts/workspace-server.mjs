#!/usr/bin/env node
/**
 * Workspace File Server
 *
 * Serves OpenClaw agent workspace .md files over HTTP.
 * Run this on the Mac Mini alongside the OpenClaw Gateway.
 *
 * Usage:
 *   node scripts/workspace-server.mjs
 *   # or with custom port/token:
 *   PORT=18790 TOKEN=mytoken node scripts/workspace-server.mjs
 *
 * Endpoints:
 *   GET /files/:agentId          → List .md files in agent workspace
 *   GET /files/:agentId/:filename → Read a specific .md file
 *
 * Auth: Bearer token (same as COMPANION_API_TOKEN)
 */

import { createServer } from "node:http";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const PORT = parseInt(process.env.PORT || "18790", 10);
const TOKEN = process.env.TOKEN || process.env.COMPANION_API_TOKEN || "";
const HOME = homedir();

function getWorkspacePath(agentId) {
  const suffix = agentId.replace(/^navigator-/, "");
  return join(HOME, `.openclaw/workspace-${suffix}/memory`);
}

function authenticate(req) {
  if (!TOKEN) return true; // No token = open (dev only)
  const auth = req.headers.authorization || "";
  return auth === `Bearer ${TOKEN}`;
}

const server = createServer((req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // Auth
  if (!authenticate(req)) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const parts = url.pathname.split("/").filter(Boolean);

  // GET /files/:agentId → list files
  if (parts.length === 2 && parts[0] === "files") {
    const workspace = getWorkspacePath(parts[1]);
    if (!existsSync(workspace)) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Workspace not found" }));
      return;
    }
    const files = readdirSync(workspace).filter(f => f.endsWith(".md")).sort();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(files));
    return;
  }

  // GET /files/:agentId/:filename → read file
  if (parts.length === 3 && parts[0] === "files") {
    const filename = parts[2];
    if (!filename.endsWith(".md")) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Only .md files allowed" }));
      return;
    }
    const filepath = join(getWorkspacePath(parts[1]), filename);
    if (!existsSync(filepath)) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("File not found");
      return;
    }
    const content = readFileSync(filepath, "utf-8");
    res.writeHead(200, { "Content-Type": "text/markdown; charset=utf-8" });
    res.end(content);
    return;
  }

  // Health check
  if (url.pathname === "/" || url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "workspace-file-server" }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`Workspace file server running on http://localhost:${PORT}`);
  console.log(`Token auth: ${TOKEN ? "enabled" : "DISABLED (dev mode)"}`);
});
