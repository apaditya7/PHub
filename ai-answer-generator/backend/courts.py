from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Generator, List, Optional

from agents import build_agent
from config import MODEL_REGISTRY, ROLE_MODEL_MAP, AppConfig
from record import finalize_record
from roles import ROLE_SPECS
from utils import now_iso


def extract_answer(record: Dict[str, Any]) -> Optional[str]:
    for stage in reversed(record.get("stages", [])):
        for entry in reversed(stage.get("transcripts", [])):
            claims = entry.get("claims", [])
            if not claims:
                continue
            first = claims[0]
            if isinstance(first, str) and first.startswith("ANSWER:"):
                return first.replace("ANSWER:", "", 1).strip()
    return None


@dataclass
class StageResult:
    level: str
    decision: Dict[str, Any]
    transcripts: List[Dict[str, Any]]
    exhibits: List[str]


class CourtLevel:
    def __init__(self, config: AppConfig, client):
        self.config = config
        self.client = client

    def _build_agent(self, role_name: str):
        model_key = ROLE_MODEL_MAP.get(role_name, "fast")
        model = MODEL_REGISTRY.get(model_key, MODEL_REGISTRY["fast"])
        return build_agent(role_name, model, self.config, self.client)

    def _seed(self, base_seed: Optional[int], offset: int) -> Optional[int]:
        if base_seed is None:
            return None
        return base_seed + offset

    def _collect_exhibits(self, transcripts: List[Dict[str, Any]]) -> List[str]:
        exhibits: List[str] = []
        for entry in transcripts:
            exhibits.extend(entry.get("exhibits", []))
        return exhibits


class TrialCourt(CourtLevel):
    def run(self, record: Dict[str, Any], seed: Optional[int], question: Optional[str]) -> StageResult:
        roles = [
            "Bailiff",
            "Prosecution Advocate A",
            "Defense Advocate A",
            "Expert Witness",
            "Trial Judge",
        ]
        prompt = (
            "Trial Court protocol: opening arguments, cross critiques, then vote. "
            "Decide a direct answer to the user's question and justify it with public artifacts. "
            f"Question: {question}"
        )
        transcripts: List[Dict[str, Any]] = []
        for idx, role in enumerate(roles):
            agent = self._build_agent(role)
            response = agent.run(prompt, self._seed(seed, idx + 1))
            transcripts.append(response)

        proposals = [
            entry["proposed_number"]
            for entry in transcripts
            if isinstance(entry.get("proposed_number"), int)
        ]
        tally: Dict[int, int] = {}
        for number in proposals:
            tally[number] = tally.get(number, 0) + 1
        verdict = max(tally, key=tally.get) if tally else 0
        shortlist = sorted(set(proposals), key=lambda n: tally.get(n, 0), reverse=True)[:3]
        dissents = [
            {"role": entry["role"], "proposed_number": entry["proposed_number"]}
            for entry in transcripts
            if entry.get("proposed_number") != verdict
        ]

        decision = {
            "level": "trial",
            "protocol": "majority vote",
            "verdict_number": verdict,
            "shortlist": shortlist,
            "vote_tally": tally,
            "dissents": dissents,
            "timestamp": now_iso(),
        }
        exhibits = self._collect_exhibits(transcripts)
        return StageResult(level="trial", decision=decision, transcripts=transcripts, exhibits=exhibits)

    def run_stream(
        self, record: Dict[str, Any], seed: Optional[int], question: Optional[str]
    ) -> Generator[Dict[str, Any], None, StageResult]:
        roles = [
            "Bailiff",
            "Prosecution Advocate A",
            "Defense Advocate A",
            "Expert Witness",
            "Trial Judge",
        ]
        prompt = (
            "Trial Court protocol: opening arguments, cross critiques, then vote. "
            "Decide a direct answer to the user's question and justify it with public artifacts. "
            f"Question: {question}"
        )
        transcripts: List[Dict[str, Any]] = []
        for idx, role in enumerate(roles):
            agent = self._build_agent(role)
            response = agent.run(prompt, self._seed(seed, idx + 1))
            transcripts.append(response)
            yield {"type": "agent", "level": "trial", "entry": response}

        proposals = [
            entry["proposed_number"]
            for entry in transcripts
            if isinstance(entry.get("proposed_number"), int)
        ]
        tally: Dict[int, int] = {}
        for number in proposals:
            tally[number] = tally.get(number, 0) + 1
        verdict = max(tally, key=tally.get) if tally else 0
        shortlist = sorted(set(proposals), key=lambda n: tally.get(n, 0), reverse=True)[:3]
        dissents = [
            {"role": entry["role"], "proposed_number": entry["proposed_number"]}
            for entry in transcripts
            if entry.get("proposed_number") != verdict
        ]

        decision = {
            "level": "trial",
            "protocol": "majority vote",
            "verdict_number": verdict,
            "shortlist": shortlist,
            "vote_tally": tally,
            "dissents": dissents,
            "timestamp": now_iso(),
        }
        exhibits = self._collect_exhibits(transcripts)
        yield {"type": "stage", "level": "trial", "decision": decision, "exhibits": exhibits}
        return StageResult(level="trial", decision=decision, transcripts=transcripts, exhibits=exhibits)


class AppealsCourt(CourtLevel):
    def run(self, record: Dict[str, Any], seed: Optional[int], question: Optional[str]) -> StageResult:
        roles = [
            "Appellate Judge A",
            "Appellate Judge B",
            "Appellate Judge C",
        ]
        trial_decision = record["stages"][-1]["decision"]
        prompt = (
            "Appeals protocol: critique trial record, issue affirm/reverse/remand vote. "
            f"Question: {question}. Trial verdict: {trial_decision}."
        )
        transcripts: List[Dict[str, Any]] = []
        votes: List[str] = []
        proposals: List[int] = []
        for idx, role in enumerate(roles):
            agent = self._build_agent(role)
            response = agent.run(prompt, self._seed(seed, 20 + idx))
            transcripts.append(response)
            if response.get("vote"):
                votes.append(response["vote"].get("decision", ""))
            if isinstance(response.get("proposed_number"), int):
                proposals.append(response["proposed_number"])

        holding = max(set(votes), key=votes.count) if votes else "affirm"
        majority_number = proposals[0] if proposals else trial_decision["verdict_number"]
        dissents = [
            {"role": entry["role"], "vote": entry.get("vote")}
            for entry in transcripts
            if entry.get("vote") and entry["vote"].get("decision") != holding
        ]
        decision = {
            "level": "appeals",
            "protocol": "critique + panel vote",
            "holding": holding,
            "majority_number": majority_number,
            "dissents": dissents,
            "timestamp": now_iso(),
        }
        exhibits = self._collect_exhibits(transcripts)
        return StageResult(level="appeals", decision=decision, transcripts=transcripts, exhibits=exhibits)

    def run_stream(
        self, record: Dict[str, Any], seed: Optional[int], question: Optional[str]
    ) -> Generator[Dict[str, Any], None, StageResult]:
        roles = [
            "Appellate Judge A",
            "Appellate Judge B",
            "Appellate Judge C",
        ]
        trial_decision = record["stages"][-1]["decision"]
        prompt = (
            "Appeals protocol: critique trial record, issue affirm/reverse/remand vote. "
            f"Question: {question}. Trial verdict: {trial_decision}."
        )
        transcripts: List[Dict[str, Any]] = []
        votes: List[str] = []
        proposals: List[int] = []
        for idx, role in enumerate(roles):
            agent = self._build_agent(role)
            response = agent.run(prompt, self._seed(seed, 20 + idx))
            transcripts.append(response)
            yield {"type": "agent", "level": "appeals", "entry": response}
            if response.get("vote"):
                votes.append(response["vote"].get("decision", ""))
            if isinstance(response.get("proposed_number"), int):
                proposals.append(response["proposed_number"])

        holding = max(set(votes), key=votes.count) if votes else "affirm"
        majority_number = proposals[0] if proposals else trial_decision["verdict_number"]
        dissents = [
            {"role": entry["role"], "vote": entry.get("vote")}
            for entry in transcripts
            if entry.get("vote") and entry["vote"].get("decision") != holding
        ]
        decision = {
            "level": "appeals",
            "protocol": "critique + panel vote",
            "holding": holding,
            "majority_number": majority_number,
            "dissents": dissents,
            "timestamp": now_iso(),
        }
        exhibits = self._collect_exhibits(transcripts)
        yield {"type": "stage", "level": "appeals", "decision": decision, "exhibits": exhibits}
        return StageResult(level="appeals", decision=decision, transcripts=transcripts, exhibits=exhibits)


class SupremeCourt(CourtLevel):
    def run(self, record: Dict[str, Any], seed: Optional[int], question: Optional[str]) -> StageResult:
        roles = [
            "Chief Justice",
            "Justice Originalist",
            "Justice Utilitarian",
            "Justice Empiricist",
        ]
        appeals_decision = record["stages"][-1]["decision"]
        prompt = (
            "Supreme Court protocol: attempt consensus, then craft majority opinion and dissents. "
            f"Question: {question}. Appeals holding: {appeals_decision}."
        )
        transcripts: List[Dict[str, Any]] = []
        proposals: List[int] = []
        for idx, role in enumerate(roles):
            agent = self._build_agent(role)
            response = agent.run(prompt, self._seed(seed, 40 + idx))
            transcripts.append(response)
            if isinstance(response.get("proposed_number"), int):
                proposals.append(response["proposed_number"])

        final_number = proposals[0] if proposals else appeals_decision.get("majority_number", 0)
        opinion = {
            "syllabus": "The Court consolidates the record and affirms procedural legitimacy.",
            "majority": "The majority synthesizes the trial and appellate record into a single number.",
            "dissents": [entry.get("dissent") for entry in transcripts if entry.get("dissent")],
            "writer": "Chief Justice",
        }
        decision = {
            "level": "supreme",
            "protocol": "consensus + authored opinion",
            "final_number": final_number,
            "opinion": opinion,
            "timestamp": now_iso(),
        }
        exhibits = self._collect_exhibits(transcripts)
        return StageResult(level="supreme", decision=decision, transcripts=transcripts, exhibits=exhibits)

    def run_stream(
        self, record: Dict[str, Any], seed: Optional[int], question: Optional[str]
    ) -> Generator[Dict[str, Any], None, StageResult]:
        roles = [
            "Chief Justice",
            "Justice Originalist",
            "Justice Utilitarian",
            "Justice Empiricist",
        ]
        appeals_decision = record["stages"][-1]["decision"]
        prompt = (
            "Supreme Court protocol: attempt consensus, then craft majority opinion and dissents. "
            f"Question: {question}. Appeals holding: {appeals_decision}."
        )
        transcripts: List[Dict[str, Any]] = []
        proposals: List[int] = []
        for idx, role in enumerate(roles):
            agent = self._build_agent(role)
            response = agent.run(prompt, self._seed(seed, 40 + idx))
            transcripts.append(response)
            yield {"type": "agent", "level": "supreme", "entry": response}
            if isinstance(response.get("proposed_number"), int):
                proposals.append(response["proposed_number"])

        final_number = proposals[0] if proposals else appeals_decision.get("majority_number", 0)
        opinion = {
            "syllabus": "The Court consolidates the record and affirms procedural legitimacy.",
            "majority": "The majority synthesizes the trial and appellate record into a single number.",
            "dissents": [entry.get("dissent") for entry in transcripts if entry.get("dissent")],
            "writer": "Chief Justice",
        }
        decision = {
            "level": "supreme",
            "protocol": "consensus + authored opinion",
            "final_number": final_number,
            "opinion": opinion,
            "timestamp": now_iso(),
        }
        exhibits = self._collect_exhibits(transcripts)
        yield {"type": "stage", "level": "supreme", "decision": decision, "exhibits": exhibits}
        return StageResult(level="supreme", decision=decision, transcripts=transcripts, exhibits=exhibits)


class Senate(CourtLevel):
    def run(self, record: Dict[str, Any], seed: Optional[int], question: Optional[str]) -> StageResult:
        roles = [
            "Majority Leader",
            "Minority Leader",
            "Senator 1",
        ]
        supreme_decision = record["stages"][-1]["decision"]
        prompt = (
            "Senate protocol: propose amendments, hold roll-call vote, and set statute-number. "
            f"Question: {question}. Supreme decision: {supreme_decision}."
        )
        transcripts: List[Dict[str, Any]] = []
        roll_call: List[Dict[str, Any]] = []
        amendments: List[str] = []
        for idx, role in enumerate(roles):
            agent = self._build_agent(role)
            response = agent.run(prompt, self._seed(seed, 60 + idx))
            transcripts.append(response)
            if response.get("vote"):
                roll_call.append(
                    {
                        "senator": role,
                        "decision": response["vote"].get("decision", "abstain"),
                        "proposed_number": response.get("proposed_number"),
                    }
                )
            amendments.extend(response.get("claims", []))

        statute_number = supreme_decision.get("final_number", 0)
        yes_votes = sum(1 for vote in roll_call if vote["decision"] == "approve")
        no_votes = sum(1 for vote in roll_call if vote["decision"] == "reject")
        result = "passed" if yes_votes >= no_votes else "failed"
        decision = {
            "level": "senate",
            "protocol": "political override vote",
            "statute_number": statute_number,
            "amendments": amendments[:8],
            "roll_call": roll_call,
            "result": result,
            "timestamp": now_iso(),
        }
        exhibits = self._collect_exhibits(transcripts)
        return StageResult(level="senate", decision=decision, transcripts=transcripts, exhibits=exhibits)

    def run_stream(
        self, record: Dict[str, Any], seed: Optional[int], question: Optional[str]
    ) -> Generator[Dict[str, Any], None, StageResult]:
        roles = [
            "Majority Leader",
            "Minority Leader",
            "Senator 1",
        ]
        supreme_decision = record["stages"][-1]["decision"]
        prompt = (
            "Senate protocol: propose amendments, hold roll-call vote, and set statute-number. "
            f"Question: {question}. Supreme decision: {supreme_decision}."
        )
        transcripts: List[Dict[str, Any]] = []
        roll_call: List[Dict[str, Any]] = []
        amendments: List[str] = []
        for idx, role in enumerate(roles):
            agent = self._build_agent(role)
            response = agent.run(prompt, self._seed(seed, 60 + idx))
            transcripts.append(response)
            yield {"type": "agent", "level": "senate", "entry": response}
            if response.get("vote"):
                roll_call.append(
                    {
                        "senator": role,
                        "decision": response["vote"].get("decision", "abstain"),
                        "proposed_number": response.get("proposed_number"),
                    }
                )
            amendments.extend(response.get("claims", []))

        statute_number = supreme_decision.get("final_number", 0)
        yes_votes = sum(1 for vote in roll_call if vote["decision"] == "approve")
        no_votes = sum(1 for vote in roll_call if vote["decision"] == "reject")
        result = "passed" if yes_votes >= no_votes else "failed"
        decision = {
            "level": "senate",
            "protocol": "political override vote",
            "statute_number": statute_number,
            "amendments": amendments[:8],
            "roll_call": roll_call,
            "result": result,
            "timestamp": now_iso(),
        }
        exhibits = self._collect_exhibits(transcripts)
        yield {"type": "stage", "level": "senate", "decision": decision, "exhibits": exhibits}
        return StageResult(level="senate", decision=decision, transcripts=transcripts, exhibits=exhibits)


class DebateManager:
    def __init__(self, config: AppConfig, client):
        self.config = config
        self.client = client
        self.trial = TrialCourt(config, client)
        self.appeals = AppealsCourt(config, client)
        self.supreme = SupremeCourt(config, client)
        self.senate = Senate(config, client)

    def run(self, record: Dict[str, Any], seed: Optional[int], question: Optional[str]) -> Dict[str, Any]:
        for stage in [self.trial, self.appeals, self.supreme, self.senate]:
            result = stage.run(record, seed, question)
            record["stages"].append(
                {
                    "level": result.level,
                    "decision": result.decision,
                    "transcripts": result.transcripts,
                    "exhibits": result.exhibits,
                }
            )
            record["record_on_appeal"].append(
                {
                    "level": result.level,
                    "decision": result.decision,
                    "exhibits": result.exhibits,
                }
            )

        final_number = record["stages"][-1]["decision"]["statute_number"]
        final_answer = extract_answer(record)
        return finalize_record(record, final_number, final_answer)

    def run_stream(
        self, record: Dict[str, Any], seed: Optional[int], question: Optional[str]
    ) -> Generator[Dict[str, Any], None, Dict[str, Any]]:
        for stage in [self.trial, self.appeals, self.supreme, self.senate]:
            result = yield from stage.run_stream(record, seed, question)
            record["stages"].append(
                {
                    "level": result.level,
                    "decision": result.decision,
                    "transcripts": result.transcripts,
                    "exhibits": result.exhibits,
                }
            )
            record["record_on_appeal"].append(
                {
                    "level": result.level,
                    "decision": result.decision,
                    "exhibits": result.exhibits,
                }
            )

        final_number = record["stages"][-1]["decision"]["statute_number"]
        final_answer = extract_answer(record)
        return finalize_record(record, final_number, final_answer)
