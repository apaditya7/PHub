import json
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Union

import requests

from config import AppConfig
from roles import JSON_SCHEMA, ROLE_SPECS, RoleSpec
from utils import now_iso, safe_json_loads, stable_seed

REQUIRED_KEYS = {
    "role",
    "level",
    "message_type",
    "proposed_number",
    "vote",
    "claims",
    "evidence",
    "critiques",
    "counterarguments",
    "confidence",
    "transcript_text",
    "exhibits",
    "dissent",
    "metadata",
}



@dataclass
class OpenAIClient:
    api_key: str
    base_url: str = "https://api.openai.com/v1"

    def chat(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float,
        seed: Optional[int],
        timeout: int,
    ) -> str:
        response = requests.post(
            f"{self.base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "seed": seed,
            },
            timeout=timeout,
        )
        try:
            response.raise_for_status()
        except requests.HTTPError as exc:
            detail = response.text.strip()
            raise requests.HTTPError(f"{exc} :: {detail}") from exc
        payload = response.json()
        return payload["choices"][0]["message"]["content"]


class JsonAgent:
    def __init__(self, role_name: str, model: str, config: AppConfig, client: OpenAIClient):
        self.role_spec: RoleSpec = ROLE_SPECS[role_name]
        self.model = model
        self.config = config
        self.client = client

    def run(self, prompt: str, seed: Optional[int]) -> Dict[str, Any]:
        system_prompt = self.role_spec.prompt
        response = self._call_model(system_prompt, prompt, seed, self.config.max_retries)
        response["metadata"]["model"] = self.model
        if not response["metadata"].get("timestamp"):
            response["metadata"]["timestamp"] = now_iso()
        return response

    def _call_model(
        self,
        system_prompt: str,
        prompt: str,
        seed: Optional[int],
        retries: int,
    ) -> Dict[str, Any]:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ]
        raw = self.client.chat(
            model=self.model,
            messages=messages,
            temperature=0 if self.config.deterministic else 0.7,
            seed=seed,
            timeout=self.config.request_timeout,
        )
        try:
            parsed = safe_json_loads(raw)
            self._validate(parsed)
            return parsed
        except ValueError:
            return self._repair(raw, retries, seed)

    def _repair(self, raw: str, retries: int, seed: Optional[int]) -> Dict[str, Any]:
        last_error = raw
        for _ in range(retries):
            fix_prompt = (
                "You are a JSON repair tool. Fix the following output to match the schema exactly. "
                "Return ONLY valid JSON.\n\nSchema:\n"
                + JSON_SCHEMA
                + "\n\nBroken output:\n"
                + last_error
            )
            repaired = self.client.chat(
                model=self.model,
                messages=[{"role": "user", "content": fix_prompt}],
                temperature=0,
                seed=seed,
                timeout=self.config.request_timeout,
            )
            try:
                parsed = safe_json_loads(repaired)
                self._validate(parsed)
                return parsed
            except ValueError:
                last_error = repaired
        raise ValueError("json_repair_failed")

    def _validate(self, data: Dict[str, Any]) -> None:
        if set(data.keys()) != REQUIRED_KEYS:
            raise ValueError("invalid_schema")
        for key in ["claims", "evidence", "critiques", "counterarguments", "exhibits"]:
            if not isinstance(data[key], list):
                raise ValueError("invalid_schema")
        if not isinstance(data.get("metadata"), dict):
            raise ValueError("invalid_schema")


class MockAgent:
    def __init__(self, role_name: str):
        self.role_spec: RoleSpec = ROLE_SPECS[role_name]

    def run(self, prompt: str, seed: Optional[int]) -> Dict[str, Any]:
        rng = stable_seed(seed)
        proposed = rng.randint(1, 100)
        level = self.role_spec.level
        response = {
            "role": self.role_spec.name,
            "level": level,
            "message_type": "analysis",
            "proposed_number": proposed,
            "vote": None,
            "claims": [f"ANSWER: Mock answer {proposed}."],
            "evidence": ["Mocked evidence entry."],
            "critiques": ["Mocked critique entry."],
            "counterarguments": ["Mocked counterargument entry."],
            "confidence": round(rng.random(), 2),
            "transcript_text": f"{self.role_spec.name} delivers a mock courtroom statement.",
            "exhibits": ["Mock Exhibit A"],
            "dissent": None,
            "metadata": {"model": "mock", "timestamp": now_iso()},
        }
        return response


def build_agent(
    role_name: str,
    model: str,
    config: AppConfig,
    client: OpenAIClient,
) -> Union[JsonAgent, MockAgent]:
    if config.mock_mode or not client.api_key:
        return MockAgent(role_name)
    return JsonAgent(role_name, model, config, client)
