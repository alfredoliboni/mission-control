#!/usr/bin/env node

/**
 * Workspace File Server
 *
 * Serves workspace .md files for the Mission Control dashboard.
 * Handles agent workspace creation during onboarding.
 *
 * Endpoints:
 *   GET  /files/:agentId          → list .md files in workspace
 *   GET  /files/:agentId/:file    → read a .md file
 *   POST /create-agent            → create agent workspace with template files
 *   GET  /health                  → health check
 *
 * Environment:
 *   WORKSPACE_ROOT  — root directory for all workspaces (default: ~/.openclaw)
 *   PORT            — server port (default: 18790)
 *   AUTH_TOKEN       — bearer token for authentication (optional)
 *
 * Usage:
 *   node scripts/workspace-serve.mjs
 *   PORT=18790 WORKSPACE_ROOT=~/.openclaw node scripts/workspace-serve.mjs
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import os from "node:os";

const PORT = parseInt(process.env.PORT || "18790", 10);
const WORKSPACE_ROOT = (process.env.WORKSPACE_ROOT || path.join(os.homedir(), ".openclaw")).replace(/^~/, os.homedir());
const AUTH_TOKEN = process.env.AUTH_TOKEN || "";

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function getWorkspacePath(agentId) {
  // Map agent ID to workspace directory
  // navigator-santos-alex → workspace-santos/memory (for legacy agents with family prefix)
  // navigator-alex → workspace-alex/memory (for single-name agents)
  const slug = agentId.replace(/^navigator-/, "");
  const parts = slug.split("-");

  // Try family-specific workspace first (e.g., workspace-santos)
  if (parts.length >= 2) {
    const familyDir = path.join(WORKSPACE_ROOT, `workspace-${parts[0]}`);
    const memoryDir = path.join(familyDir, "memory");
    if (fs.existsSync(memoryDir)) return memoryDir;
    if (fs.existsSync(familyDir)) return familyDir;
  }

  // Try direct workspace (e.g., workspace-alex)
  const directDir = path.join(WORKSPACE_ROOT, `workspace-${slug}`);
  const directMemory = path.join(directDir, "memory");
  if (fs.existsSync(directMemory)) return directMemory;
  if (fs.existsSync(directDir)) return directDir;

  // Fallback: return the expected path (will 404 on access)
  return path.join(WORKSPACE_ROOT, `workspace-${slug}`, "memory");
}

function authenticate(req) {
  if (!AUTH_TOKEN) return true;
  const auth = req.headers.authorization;
  return auth === `Bearer ${AUTH_TOKEN}`;
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function sendText(res, status, text) {
  res.writeHead(status, { "Content-Type": "text/markdown; charset=utf-8" });
  res.end(text);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // Auth
  if (!authenticate(req)) { sendJson(res, 401, { error: "Unauthorized" }); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const parts = url.pathname.split("/").filter(Boolean);

  // GET /health
  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, { status: "ok", workspaceRoot: WORKSPACE_ROOT });
    return;
  }

  // GET /files/:agentId — list .md files
  if (req.method === "GET" && parts[0] === "files" && parts.length === 2) {
    const agentId = parts[1];
    const dir = getWorkspacePath(agentId);
    try {
      const files = fs.readdirSync(dir)
        .filter(f => f.endsWith(".md"))
        .sort();
      sendJson(res, 200, files);
    } catch {
      sendJson(res, 404, { error: `Workspace not found: ${agentId}` });
    }
    return;
  }

  // GET /files/:agentId/:filename — read a .md file
  if (req.method === "GET" && parts[0] === "files" && parts.length === 3) {
    const agentId = parts[1];
    const filename = parts[2];
    if (!filename.endsWith(".md")) { sendJson(res, 400, { error: "Only .md files" }); return; }
    const dir = getWorkspacePath(agentId);
    const filepath = path.join(dir, filename);
    try {
      const content = fs.readFileSync(filepath, "utf-8");
      sendText(res, 200, content);
    } catch {
      sendJson(res, 404, { error: `File not found: ${filename}` });
    }
    return;
  }

  // POST /create-agent — create workspace from template bundle
  if (req.method === "POST" && url.pathname === "/create-agent") {
    try {
      const body = await readBody(req);
      const { agentId, childName, files } = body;

      if (!agentId) { sendJson(res, 400, { error: "agentId required" }); return; }

      const slug = agentId.replace(/^navigator-/, "");
      const workspaceDir = path.join(WORKSPACE_ROOT, `workspace-${slug}`);
      const memoryDir = path.join(workspaceDir, "memory");

      // Create directories
      fs.mkdirSync(memoryDir, { recursive: true });
      log(`Created workspace: ${workspaceDir}`);

      // Write template files if provided
      let filesWritten = 0;
      if (files && typeof files === "object") {
        for (const [filename, content] of Object.entries(files)) {
          const filepath = filename.startsWith("memory/")
            ? path.join(workspaceDir, filename)
            : path.join(workspaceDir, filename);

          // Ensure subdirectory exists
          const dir = path.dirname(filepath);
          fs.mkdirSync(dir, { recursive: true });

          fs.writeFileSync(filepath, content);
          filesWritten++;
        }
        log(`Wrote ${filesWritten} template files for ${agentId}`);
      }

      // Register agent with OpenClaw if available
      let agentCreated = false;
      try {
        execSync(`openclaw agents add ${agentId} --workspace ${workspaceDir}`, {
          timeout: 10000,
          stdio: "pipe",
        });
        agentCreated = true;
        log(`Registered OpenClaw agent: ${agentId}`);
      } catch (err) {
        log(`OpenClaw agent registration skipped (CLI not available or failed): ${err.message}`);
      }

      sendJson(res, 200, {
        success: true,
        agentId,
        workspace: workspaceDir,
        filesWritten,
        agentCreated,
      });
    } catch (err) {
      log(`Error creating agent: ${err.message}`);
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  log(`Workspace file server running on http://localhost:${PORT}`);
  log(`Workspace root: ${WORKSPACE_ROOT}`);
  log(`Auth: ${AUTH_TOKEN ? "enabled" : "disabled"}`);
});
