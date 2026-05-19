#!/usr/bin/env node

import * as readline from "readline";
import { runHandoff } from "../handoff";
import { VERSION } from "../version";

const defaultRepo = process.cwd();
const repoPath = process.argv[2] || defaultRepo;

function send(msg: object): void {
  process.stdout.write(`${JSON.stringify(msg)}\n`);
}

async function handleRequest(line: string): Promise<void> {
  let req: {
    id?: number | string;
    method?: string;
    params?: { name?: string; arguments?: Record<string, string> };
  };
  try {
    req = JSON.parse(line);
  } catch {
    return;
  }

  const id = req.id;

  if (req.method === "initialize") {
    send({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "handoff-md", version: VERSION },
      },
    });
    return;
  }

  if (req.method === "tools/list") {
    send({
      jsonrpc: "2.0",
      id,
      result: {
        tools: [
          {
            name: "get_handoff_context",
            description: "Generate HANDOFF.md context for a repository",
            inputSchema: {
              type: "object",
              properties: {
                path: { type: "string", description: "Repository path" },
                format: {
                  type: "string",
                  enum: ["compact", "standard", "full"],
                },
                profile: {
                  type: "string",
                  enum: ["default", "cursor", "ci", "pr"],
                },
              },
            },
          },
        ],
      },
    });
    return;
  }

  if (req.method === "tools/call") {
    const args = req.params?.arguments ?? {};
    const target = args.path || repoPath;
    try {
      const result = runHandoff({
        cwd: target,
        format: args.format,
        profile: args.profile,
      });
      send({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: result.markdown }],
        },
      });
    } catch (err) {
      send({
        jsonrpc: "2.0",
        id,
        error: { code: -32000, message: (err as Error).message },
      });
    }
    return;
  }

  if (req.method === "notifications/initialized") {
    return;
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on("line", (line) => {
  void handleRequest(line);
});
