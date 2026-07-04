# AGENTS.mcp.md — Graphify knowledge graph MCP

Load for codebase navigation (BFS/DFS/shortest-path) instead of linear grep — especially during deep refactors. Saves tokens.

## Install (one-time, global)

```bash
pip install "graphifyy[mcp]"
pip install openai             # only for type-check; not needed for code-only corpus
```

## Build graph (regeneration)

```bash
# temp: move non-code files out of scan path
mv src/images .graphify-bak-images
mv src/lib/email/README.md src/lib/email/.README.md.bak
rm -rf graphify-out

# build (no API key needed for code-only)
python3 -m graphify src --no-label --no-viz

# restore
mv .graphify-bak-images src/images
mv src/lib/email/.README.md.bak src/lib/email/README.md
```

Output: `graphify-out/graph.json` (~4MB). Gitignored — regeneratable from source.

## `.mcp.json` (project root)

```json
{
  "mcpServers": {
    "graphify": {
      "command": "python3",
      "args": ["-m", "graphify.serve", "graphify-out/graph.json"],
      "type": "stdio"
    }
  }
}
```

## 11 tools available

`query_graph`, `get_node`, `get_neighbors`, `get_community`, `god_nodes`, `graph_stats`, `shortest_path`, `list_prs`, `get_pr_impact`, `triage_prs` (+ `initialize`/`tools/list` MCP primitives).

## Smoke test (no agent)

```bash
python3 -m graphify.serve graphify-out/graph.json <<'EOF'
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0.0.1"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"graph_stats","arguments":{}}}
EOF
```

## Notes

- After big refactor: `python3 -m graphify src --force --no-label` to rebuild.
- For LLM-enriched community naming: set `GEMINI_API_KEY` / `MOONSHOT_API_KEY` / `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` and drop `--no-label`.
- npm `graphify-mcp-tools` is deprecated — use `python -m graphify.serve`.