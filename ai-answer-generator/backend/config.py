import os
from pathlib import Path
from dataclasses import dataclass
from typing import Dict


@dataclass(frozen=True)
class AppConfig:
    mock_mode: bool
    deterministic: bool
    max_retries: int
    request_timeout: int


MODEL_REGISTRY: Dict[str, str] = {
    "fast": "gpt-4o-mini",
    "mid": "gpt-4o",
    "strong": "gpt-4o",
    "senate_fast": "gpt-4o-mini",
}

_env_path = Path(__file__).resolve().parents[1] / ".env"
if _env_path.exists():
    try:
        from dotenv import load_dotenv
    except ImportError:
        load_dotenv = None
    if load_dotenv:
        load_dotenv(_env_path)

ROLE_MODEL_MAP: Dict[str, str] = {
    "Prosecution Advocate A": "fast",
    "Prosecution Advocate B": "fast",
    "Defense Advocate A": "fast",
    "Defense Advocate B": "fast",
    "Expert Witness": "fast",
    "Bailiff": "fast",
    "Trial Judge": "mid",
    "Appellate Judge A": "mid",
    "Appellate Judge B": "mid",
    "Appellate Judge C": "mid",
    "Appellate Clerk": "mid",
    "Chief Justice": "strong",
    "Justice Originalist": "strong",
    "Justice Utilitarian": "strong",
    "Justice Formalist": "strong",
    "Justice Empiricist": "strong",
    "Justice Chaos": "strong",
    "Opinion Writer": "strong",
    "Majority Leader": "mid",
    "Minority Leader": "mid",
    "Senator 1": "senate_fast",
    "Senator 2": "senate_fast",
    "Senator 3": "senate_fast",
    "Senator 4": "senate_fast",
    "Senator 5": "senate_fast",
    "Senator 6": "senate_fast",
    "Senator 7": "senate_fast",
    "Senator 8": "senate_fast",
    "Senator 9": "senate_fast",
}


def load_config() -> AppConfig:
    mock_mode = os.getenv("MOCK_MODE", "0") == "1"
    deterministic = os.getenv("DETERMINISTIC", "0") == "1"
    max_retries = int(os.getenv("MAX_JSON_RETRIES", "2"))
    request_timeout = int(os.getenv("OPENROUTER_TIMEOUT", "45"))
    return AppConfig(
        mock_mode=mock_mode,
        deterministic=deterministic,
        max_retries=max_retries,
        request_timeout=request_timeout,
    )
