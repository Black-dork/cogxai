"""
CogxAI Python SDK — async client for the Cortex API.

Usage:
    from cogxai import Cortex

    brain = Cortex(api_key="clk_...")
    await brain.store(content="User prefers dark mode", summary="UI preference", type="semantic")
    memories = await brain.recall(query="user preferences")
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional

import httpx

MemoryType = Literal["episodic", "semantic", "procedural", "self_model"]
LinkType = Literal["supports", "contradicts", "elaborates", "causes", "follows", "relates", "resolves"]

DEFAULT_BASE_URL = "https://cogxai.org"


@dataclass
class Memory:
    id: int
    type: str
    memory_type: str
    summary: str
    content: str
    tags: List[str]
    concepts: List[str]
    importance: float
    decay_factor: float
    access_count: int
    emotional_valence: float
    source: Optional[str]
    created_at: str
    last_accessed: str
    score: Optional[float] = None


@dataclass
class MemorySummary:
    id: int
    summary: str
    type: str
    tags: List[str]
    concepts: List[str]
    importance: float
    decay_factor: float
    created_at: str


@dataclass
class MemoryStats:
    total: int
    by_type: Dict[str, int] = field(default_factory=dict)
    avg_importance: float = 0.0
    avg_decay: float = 0.0
    total_dream_sessions: int = 0
    top_tags: List[Dict[str, Any]] = field(default_factory=list)
    embedded_count: int = 0


class Cortex:
    """Async client for the CogxAI Cortex API.

    Args:
        api_key: API key from ``npx cogxai register`` or POST /api/cortex/register.
        base_url: Cortex API base URL. Defaults to ``https://cogxai.org``.
        timeout: Request timeout in seconds. Defaults to 30.
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 30.0,
    ) -> None:
        self._base = base_url.rstrip("/") + "/api/cortex"
        self._client = httpx.AsyncClient(
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            timeout=timeout,
        )

    async def _post(self, path: str, json: Dict[str, Any]) -> Dict[str, Any]:
        resp = await self._client.post(f"{self._base}{path}", json=json)
        resp.raise_for_status()
        return resp.json()

    async def _get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        resp = await self._client.get(f"{self._base}{path}", params=params)
        resp.raise_for_status()
        return resp.json()

    # ── Store ────────────────────────────────────────────

    async def store(
        self,
        content: str,
        summary: str,
        type: MemoryType = "episodic",
        tags: Optional[List[str]] = None,
        concepts: Optional[List[str]] = None,
        importance: Optional[float] = None,
        emotional_valence: Optional[float] = None,
        source: Optional[str] = None,
        source_id: Optional[str] = None,
        related_user: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[int]:
        """Store a new memory. Returns the memory ID or None."""
        body: Dict[str, Any] = {"content": content, "summary": summary, "type": type}
        if tags:
            body["tags"] = tags
        if concepts:
            body["concepts"] = concepts
        if importance is not None:
            body["importance"] = importance
        if emotional_valence is not None:
            body["emotional_valence"] = emotional_valence
        if source:
            body["source"] = source
        if source_id:
            body["source_id"] = source_id
        if related_user:
            body["related_user"] = related_user
        if metadata:
            body["metadata"] = metadata

        data = await self._post("/store", body)
        return data.get("memory_id")

    # ── Recall ───────────────────────────────────────────

    async def recall(
        self,
        query: Optional[str] = None,
        tags: Optional[List[str]] = None,
        memory_types: Optional[List[MemoryType]] = None,
        limit: int = 10,
        min_importance: Optional[float] = None,
        min_decay: Optional[float] = None,
    ) -> List[Memory]:
        """Recall memories with hybrid search."""
        body: Dict[str, Any] = {"limit": limit}
        if query:
            body["query"] = query
        if tags:
            body["tags"] = tags
        if memory_types:
            body["memory_types"] = memory_types
        if min_importance is not None:
            body["min_importance"] = min_importance
        if min_decay is not None:
            body["min_decay"] = min_decay

        data = await self._post("/recall", body)
        return [Memory(**{**m, "score": m.get("_score")}) for m in data.get("memories", [])]

    # ── Recall Summaries ─────────────────────────────────

    async def recall_summaries(
        self,
        query: Optional[str] = None,
        tags: Optional[List[str]] = None,
        memory_types: Optional[List[MemoryType]] = None,
        limit: int = 20,
    ) -> List[MemorySummary]:
        """Recall lightweight summaries (~50 tokens each)."""
        body: Dict[str, Any] = {"limit": limit}
        if query:
            body["query"] = query
        if tags:
            body["tags"] = tags
        if memory_types:
            body["memory_types"] = memory_types

        data = await self._post("/recall/summaries", body)
        return [MemorySummary(**s) for s in data.get("summaries", [])]

    # ── Hydrate ──────────────────────────────────────────

    async def hydrate(self, ids: List[int]) -> List[Memory]:
        """Load full content for specific memory IDs."""
        data = await self._post("/hydrate", {"ids": ids})
        return [Memory(**m) for m in data.get("memories", [])]

    # ── Stats ────────────────────────────────────────────

    async def stats(self) -> MemoryStats:
        """Get memory system statistics."""
        data = await self._get("/stats")
        return MemoryStats(
            total=data.get("total", 0),
            by_type=data.get("byType", {}),
            avg_importance=data.get("avgImportance", 0),
            avg_decay=data.get("avgDecay", 0),
            total_dream_sessions=data.get("totalDreamSessions", 0),
            top_tags=data.get("topTags", []),
            embedded_count=data.get("embeddedCount", 0),
        )

    # ── Recent ───────────────────────────────────────────

    async def recent(
        self,
        hours: int = 6,
        types: Optional[str] = None,
        limit: int = 20,
    ) -> List[Memory]:
        """Fetch recent memories from the last N hours."""
        params: Dict[str, Any] = {"hours": hours, "limit": limit}
        if types:
            params["types"] = types
        data = await self._get("/recent", params)
        return [Memory(**m) for m in data.get("memories", [])]

    # ── Self Model ───────────────────────────────────────

    async def self_model(self) -> List[Memory]:
        """Access the agent's current self-model memories."""
        data = await self._get("/self-model")
        return [Memory(**m) for m in data.get("memories", [])]

    # ── Link ─────────────────────────────────────────────

    async def link(
        self,
        source_id: int,
        target_id: int,
        link_type: LinkType,
        strength: float = 0.5,
    ) -> bool:
        """Create a typed link between two memories."""
        data = await self._post("/link", {
            "source_id": source_id,
            "target_id": target_id,
            "link_type": link_type,
            "strength": strength,
        })
        return data.get("ok", False)

    # ── Clinamen ─────────────────────────────────────────

    async def clinamen(
        self,
        context: str,
        limit: int = 3,
        min_importance: Optional[float] = None,
    ) -> List[Memory]:
        """Find surprising lateral connections."""
        body: Dict[str, Any] = {"context": context, "limit": limit}
        if min_importance is not None:
            body["min_importance"] = min_importance
        data = await self._post("/clinamen", body)
        return [Memory(**m) for m in data.get("memories", [])]

    # ── Brain ────────────────────────────────────────────

    async def brain(self, limit: int = 300) -> Dict[str, Any]:
        """Get brain visualization data (nodes + metadata)."""
        return await self._get("/brain", {"limit": limit})

    # ── Pack Export ───────────────────────────────────────

    async def export_pack(
        self,
        name: str,
        description: str = "",
        query: Optional[str] = None,
        types: Optional[List[MemoryType]] = None,
        limit: int = 50,
    ) -> Dict[str, Any]:
        """Export a memory pack."""
        body: Dict[str, Any] = {"name": name, "description": description, "limit": limit}
        if query:
            body["query"] = query
        if types:
            body["types"] = types
        return await self._post("/packs/export", body)

    # ── Pack Import ───────────────────────────────────────

    async def import_pack(self, pack: Dict[str, Any]) -> Dict[str, Any]:
        """Import a memory pack."""
        return await self._post("/packs/import", {"pack": pack})

    # ── Cleanup ──────────────────────────────────────────

    async def close(self) -> None:
        """Close the HTTP client."""
        await self._client.aclose()

    async def __aenter__(self) -> "Cortex":
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self.close()
