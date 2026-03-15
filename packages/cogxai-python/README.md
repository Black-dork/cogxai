# cogxai

[![PyPI version](https://img.shields.io/pypi/v/cogxai)](https://pypi.org/project/cogxai/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Persistent memory for AI agents.** Python SDK for the [CogxAI](https://cogxai.org) Cortex API.

## Install

```bash
pip install cogxai
```

## Quick Start

```python
import asyncio
from cogxai import Cortex

async def main():
    brain = Cortex(api_key="clk_...")

    # Store a memory
    memory_id = await brain.store(
        content="User asked about pricing and seemed frustrated.",
        summary="Frustrated user asking about pricing",
        type="episodic",
        tags=["pricing", "user-concern"],
        importance=0.7,
    )

    # Recall relevant memories
    memories = await brain.recall(query="what do users think about pricing")
    for m in memories:
        print(f"[{m.type}] {m.summary} (importance: {m.importance})")

    # Get stats
    stats = await brain.stats()
    print(f"Total memories: {stats.total}")

    await brain.close()

asyncio.run(main())
```

## Context Manager

```python
async with Cortex(api_key="clk_...") as brain:
    await brain.store(content="...", summary="...", type="semantic")
    memories = await brain.recall(query="...")
```

## API

### `Cortex(api_key, base_url="https://cogxai.org", timeout=30)`

All methods are async.

| Method | Description |
|--------|-------------|
| `store(content, summary, type, ...)` | Store a memory. Returns memory ID. |
| `recall(query, tags, limit, ...)` | Recall memories with hybrid search. |
| `recall_summaries(query, ...)` | Lightweight summaries (~50 tokens each). |
| `hydrate(ids)` | Load full content for specific IDs. |
| `stats()` | Memory system statistics. |
| `recent(hours, limit)` | Recent memories from last N hours. |
| `self_model()` | Agent's self-model memories. |
| `link(source_id, target_id, type)` | Create typed link between memories. |
| `clinamen(context, limit)` | Find surprising lateral connections. |
| `brain(limit)` | Brain visualization data. |
| `export_pack(name, query, ...)` | Export memory pack. |
| `import_pack(pack)` | Import memory pack. |
| `close()` | Close HTTP client. |

### Memory Types

| Type | Use for |
|------|---------|
| `episodic` | Events, conversations |
| `semantic` | Facts, knowledge |
| `procedural` | Patterns, how-to |
| `self_model` | Self-awareness |

## Get an API Key

```bash
npx cogxai register
```

Or register at [cogxai.org/register](https://cogxai.org/register).

## Part of the CogxAI Ecosystem

- [`cogxai`](https://www.npmjs.com/package/cogxai) — Full Node.js package (MCP server, CLI, SDK)
- [`cogxai-brain`](https://www.npmjs.com/package/cogxai-brain) — Core memory engine
- [`cogxai-cloud`](https://www.npmjs.com/package/cogxai-cloud) — Supabase storage provider
- [`cogxai-local`](https://www.npmjs.com/package/cogxai-local) — SQLite + local embeddings

## License

MIT — [CogxAI](https://cogxai.org)
