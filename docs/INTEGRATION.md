# Integrating CogxAI Memory Into Your Agent

**Zero to first memory in under 2 minutes.**

---

## 1. Get Your API Key (30 seconds)

### Web UI
Go to **[cogxai.org/register](https://cogxai.org/register)** — enter your agent name and Base wallet, get a key instantly.

### Terminal
```bash
curl -X POST https://cogxai.org/api/cortex/register \
  -H "Content-Type: application/json" \
  -d '{"agentName": "my-agent", "walletAddress": "YOUR_BASE_WALLET"}'
```

Save the `apiKey` from the response — it won't be shown again.

---

## 2. Store Your First Memory (30 seconds)

```bash
curl -X POST https://cogxai.org/api/cortex/store \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "content": "User prefers concise answers with code examples",
    "type": "procedural",
    "importance": 0.8,
    "tags": ["preferences"]
  }'
```

---

## 3. Recall It Back (30 seconds)

```bash
curl -X POST https://cogxai.org/api/cortex/recall \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"query": "user preferences", "limit": 5}'
```

Returns memories ranked by vector similarity + importance + recency + entity graph.

---

## 4. Choose Your Integration

### REST API (any language)

All endpoints use `Authorization: Bearer YOUR_API_KEY`.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cortex/store` | POST | Store a memory |
| `/api/cortex/recall` | POST | Search memories |
| `/api/cortex/stats` | GET | Memory stats |
| `/api/cortex/recent` | GET | Recent memories |

#### Python example

```python
import httpx

class CogxAIMemory:
    def __init__(self, api_key, base_url="https://cogxai.org/api/cortex"):
        self.base = base_url
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }

    async def store(self, content, type="semantic", importance=0.5, tags=None):
        async with httpx.AsyncClient() as client:
            return await client.post(f"{self.base}/store", json={
                "content": content, "type": type,
                "importance": importance, "tags": tags or []
            }, headers=self.headers)

    async def recall(self, query, limit=5):
        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{self.base}/recall", json={
                "query": query, "limit": limit
            }, headers=self.headers)
            return resp.json()["memories"]
```

---

### Python SDK

```bash
pip install cogxai
```

```python
from cogxai import CogxAI

brain = CogxAI(api_key="YOUR_API_KEY")

# Store
brain.store("User prefers dark mode", type="procedural", importance=0.7)

# Recall
memories = brain.recall("user preferences")
```

Get your API key at [cogxai.org/register](https://cogxai.org/register).

---

### Node.js SDK

```bash
npm install cogxai
```

#### Hosted mode (recommended to start)

```typescript
import { Cortex } from 'cogxai';

const brain = new Cortex({
  hosted: {
    apiKey: 'YOUR_API_KEY',  // from cogxai.org/register
    baseUrl: 'https://cogxai.org',
  },
});
await brain.init();

// Store
await brain.store({
  content: 'User prefers concise answers',
  type: 'procedural',
  importance: 0.8,
});

// Recall
const memories = await brain.recall({ query: 'user preferences' });
```

#### Self-hosted mode (full control)

```typescript
const brain = new Cortex({
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_KEY,
  },
  embedding: {
    provider: 'voyage',
    apiKey: process.env.VOYAGE_API_KEY,
    model: 'voyage-4-large',
    dimensions: 1024,
  },
  agentId: 'my-agent',
});
await brain.init();

// Dream cycle + reflection
await brain.dream();
const journal = await brain.reflect();
brain.startDreamSchedule();      // Every 6h
brain.startReflectionSchedule(); // Every 3h
```

---

### MCP (Claude Desktop / Cursor / Windsurf)

```bash
npx cogxai mcp-install --local
```

Or add manually to your MCP config:

```json
{
  "mcpServers": {
    "cogxai": {
      "command": "npx",
      "args": ["cogxai", "mcp-serve", "--local"]
    }
  }
}
```

#### MCP Tools

| Tool | What it does |
|------|-------------|
| `store_memory` | Store a memory (content, type, tags, importance) |
| `recall_memories` | Multi-phase semantic search + graph traversal |
| `get_memory_stats` | Memory breakdown by type, importance, decay |
| `find_clinamen` | Surface unexpected lateral connections |

---

### Agent Skill (ClawHub)

```bash
clawhub install cogxai-memory
```

Or manually:
```bash
curl -o skills/cogxai-memory/SKILL.md \
  https://raw.githubusercontent.com/Black-dork/cogxai-memory-skill/main/SKILL.md
```

GitHub: [github.com/Black-dork/cogxai-memory-skill](https://github.com/Black-dork/cogxai-memory-skill)

---

## Memory Types

| Type | What it stores | Decay |
|------|---------------|-------|
| `episodic` | Events and interactions | 7%/day |
| `semantic` | Distilled knowledge | 2%/day |
| `procedural` | Learned patterns | 3%/day |
| `self_model` | Self-awareness | 1%/day |
| `introspective` | Original thoughts | 2%/day |

---

## Links

- **Register:** [cogxai.org/register](https://cogxai.org/register)
- **GitHub:** [github.com/Black-dork/cogxai](https://github.com/Black-dork/cogxai)
- **npm:** [cogxai](https://www.npmjs.com/package/cogxai)
- **PyPI:** [cogxai](https://pypi.org/project/cogxai/)
- **Benchmark:** [cogxai.org/benchmark](https://cogxai.org/benchmark) (83.9/100)
