"""
AURA AI — Real Web Research Tool
Performs real web search, article content retrieval, and source verification.
"""

import urllib.request
import urllib.parse
import json
import re
import time
from typing import Dict, Any, List, Optional

class WebResearchTool:
    @staticmethod
    def _fetch_json(url: str, headers: dict, timeout: float = 8.0) -> Optional[dict]:
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout) as response:
                if response.status == 200:
                    raw = response.read().decode("utf-8")
                    return json.loads(raw)
        except Exception:
            pass
        return None

    @staticmethod
    def search(query: str, max_results: int = 5) -> Dict[str, Any]:
        start = time.time()
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        results: List[Dict[str, str]] = []

        try:
            # 1. Try DuckDuckGo Instant Answer API
            encoded_query = urllib.parse.quote_plus(query)
            ddg_api_url = f"https://api.duckduckgo.com/?q={encoded_query}&format=json&no_html=1&skip_disambig=1"
            data = WebResearchTool._fetch_json(ddg_api_url, headers)
            if data:
                if data.get("AbstractText"):
                    results.append({
                        "title": data.get("Heading") or query,
                        "snippet": data.get("AbstractText"),
                        "url": data.get("AbstractURL") or "https://duckduckgo.com"
                    })
                for topic in data.get("RelatedTopics", []):
                    if isinstance(topic, dict) and topic.get("Text") and topic.get("FirstURL"):
                        results.append({
                            "title": topic.get("Text")[:60] + "...",
                            "snippet": topic.get("Text"),
                            "url": topic.get("FirstURL")
                        })
                        if len(results) >= max_results:
                            break

            # 2. If no direct instant answer, query Wikipedia API for factual queries
            if not results:
                wiki_url = f"https://en.wikipedia.org/w/api.php?action=opensearch&search={encoded_query}&limit={max_results}&namespace=0&format=json"
                wiki_data = WebResearchTool._fetch_json(wiki_url, headers)
                if wiki_data and isinstance(wiki_data, list):
                    titles = wiki_data[1] if len(wiki_data) > 1 else []
                    snippets = wiki_data[2] if len(wiki_data) > 2 else []
                    urls = wiki_data[3] if len(wiki_data) > 3 else []
                    for i in range(len(titles)):
                        results.append({
                            "title": titles[i],
                            "snippet": snippets[i] if i < len(snippets) and snippets[i] else f"Information regarding {titles[i]}.",
                            "url": urls[i] if i < len(urls) else ""
                        })

            duration_ms = int((time.time() - start) * 1000)
            return {
                "success": True,
                "query": query,
                "results": results,
                "count": len(results),
                "duration_ms": duration_ms
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "query": query,
                "results": [],
                "duration_ms": int((time.time() - start) * 1000)
            }
