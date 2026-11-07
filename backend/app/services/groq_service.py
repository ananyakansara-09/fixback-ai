import json
import logging
import re
from typing import Any, Dict, List, Optional
from groq import Groq

from app.config import settings
from app.schemas.incident import AIDiagnosisSchema

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a senior Site Reliability Engineer (SRE) and Principal Infrastructure Architect.
Your task is to analyze production incidents and diagnose possible root causes by comparing current symptoms against verified historical incident memories.

CRITICAL RULES:
1. Analyze current errors and logs with high technical precision.
2. Identify plausible, technically rigorous possible root causes.
3. Compare with provided historical engineering incidents from memory (if available).
4. Explain historical relevance: identify exact patterns, shared symptoms, or divergence.
5. Suggest actionable, non-destructive investigation steps in priority order.
6. Rigorously distinguish historical facts from current hypotheses.
7. NEVER invent historical incidents. If no historical memories are provided, explicitly state that no historical precedent was found.
8. NEVER claim the current incident is resolved. It is currently actively impacting or awaiting confirmation.
9. NEVER suggest or simulate executing automated production changes.
10. ALWAYS output strictly valid JSON matching the exact schema below, with NO markdown backticks or commentary outside the JSON.

REQUIRED JSON SCHEMA:
{
  "summary": "Concise summary of the incident and operational impact",
  "possible_root_cause": "Detailed technical explanation of plausible root cause(s)",
  "historical_context": "Analysis of relevant past incidents retrieved from memory, or statement that none were found",
  "recommended_steps": [
    "Step 1: Immediate triage check...",
    "Step 2: Deep-dive diagnostic command...",
    "Step 3: Verification check..."
  ],
  "memory_used": true,
  "related_memories": [
    {"id": "...", "relevance": "Why this historical memory applies"}
  ]
}
"""


class GroqService:
    """Service wrapping the official Groq Python SDK for SRE AI diagnosis."""

    def __init__(self) -> None:
        self.api_key = settings.GROQ_API_KEY
        self.model = settings.GROQ_MODEL
        self._client: Optional[Groq] = None

    @property
    def client(self) -> Groq:
        """Get or initialize the persistent Groq SDK client."""
        if self._client is None:
            self._client = Groq(api_key=self.api_key)
        return self._client

    def is_configured(self) -> bool:
        """Check if Groq API credentials are configured."""
        return bool(self.api_key and self.api_key.strip() and self.api_key != "your_groq_api_key")

    def diagnose_incident(
        self,
        title: str,
        service: str,
        environment: str,
        error_message: str,
        logs: Optional[str] = None,
        historical_memories: Optional[List[Dict[str, Any]]] = None,
    ) -> AIDiagnosisSchema:
        """Analyze current incident and historical memories using Groq AI."""
        memories = historical_memories or []
        has_memories = len(memories) > 0

        if not self.is_configured():
            logger.warning("Groq API key is not configured. Generating standard SRE fallback diagnosis.")
            return self._build_offline_diagnosis(
                title=title,
                service=service,
                environment=environment,
                error_message=error_message,
                logs=logs,
                memories=memories,
            )

        # Build prompt
        user_prompt = self._build_prompt(
            title=title,
            service=service,
            environment=environment,
            error_message=error_message,
            logs=logs,
            memories=memories,
        )

        try:
            chat_completion = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.2,
                max_tokens=2048,
                response_format={"type": "json_object"},
            )

            raw_content = chat_completion.choices[0].message.content or "{}"
            parsed_json = self._parse_and_validate_json(raw_content)

            # Ensure memory_used accurately reflects if memories were used
            parsed_json["memory_used"] = has_memories and bool(parsed_json.get("memory_used", True))
            if not has_memories:
                parsed_json["related_memories"] = []

            return AIDiagnosisSchema(**parsed_json)

        except Exception as exc:
            logger.error("Groq AI diagnosis call failed: %s", str(exc))
            # Fall back to safe deterministic diagnostic object instead of breaking API
            return self._build_offline_diagnosis(
                title=title,
                service=service,
                environment=environment,
                error_message=error_message,
                logs=logs,
                memories=memories,
                fallback_reason=f"Groq API call error: {str(exc)}",
            )

    def _build_prompt(
        self,
        title: str,
        service: str,
        environment: str,
        error_message: str,
        logs: Optional[str],
        memories: List[Dict[str, Any]],
    ) -> str:
        prompt = (
            f"=== CURRENT INCIDENT TO DIAGNOSE ===\n"
            f"Title: {title}\n"
            f"Service: {service}\n"
            f"Environment: {environment}\n"
            f"Error Message: {error_message}\n"
            f"Logs:\n{logs or 'No explicit logs provided'}\n\n"
        )

        if memories:
            prompt += "=== RECALLED HISTORICAL INCIDENTS FROM HINDSIGHT MEMORY ===\n"
            for i, mem in enumerate(memories, 1):
                mem_id = mem.get("id", f"MEM-{i}")
                content = mem.get("content", "")
                mtype = mem.get("memory_type", "incident")
                prompt += f"[Memory #{i}] ID: {mem_id} | Type: {mtype}\nContent:\n{content}\n---\n"
        else:
            prompt += "=== HISTORICAL MEMORY STATUS ===\nNo historical memories found for this incident query.\n"

        prompt += "\nDiagnose this incident according to your SRE instructions and output valid JSON only."
        return prompt

    def _parse_and_validate_json(self, raw_content: str) -> Dict[str, Any]:
        """Clean markdown formatting and parse JSON output safely."""
        text = raw_content.strip()

        # Remove markdown code blocks if present
        if text.startswith("```"):
            lines = text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Attempt to extract JSON substring
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(0))
                except json.JSONDecodeError:
                    pass
            raise ValueError(f"Could not parse valid JSON from AI response: {raw_content[:200]}")

    def _build_offline_diagnosis(
        self,
        title: str,
        service: str,
        environment: str,
        error_message: str,
        logs: Optional[str],
        memories: List[Dict[str, Any]],
        fallback_reason: Optional[str] = None,
    ) -> AIDiagnosisSchema:
        """Create a structured SRE diagnosis when Groq is unconfigured or unavailable."""
        has_memories = len(memories) > 0
        historical_summary = (
            f"Identified {len(memories)} historical incident memory record(s) matching error signature."
            if has_memories
            else "No historical incident precedent found in engineering memory bank."
        )

        reason_note = f" (Note: {fallback_reason})" if fallback_reason else " (Groq credentials pending configuration)"

        return AIDiagnosisSchema(
            summary=f"Incident in {service} [{environment}]: {title}. Observed error indicates {error_message[:120]}{reason_note}.",
            possible_root_cause=(
                f"Observed error: '{error_message}'. Likely resource saturation, timeout, or configuration failure in '{service}'. "
                f"Inspect connection pools, thread starvation, or dependent service degradation."
            ),
            historical_context=historical_summary,
            recommended_steps=[
                f"Step 1: Inspect active metrics and error rate spikes for service '{service}' in {environment}.",
                "Step 2: Check database connection pool utilization, thread saturation, and network latency.",
                "Step 3: Review recently deployed changes or configuration drift in the environment.",
                "Step 4: Verify downstream service health and timeout tolerances.",
            ],
            memory_used=has_memories,
            related_memories=[
                {"id": m.get("id"), "content_preview": str(m.get("content"))[:100]}
                for m in memories
            ] if has_memories else [],
        )

    def check_health(self) -> Dict[str, Any]:
        """Check Groq configuration and model readiness."""
        configured = self.is_configured()
        return {
            "configured": configured,
            "ready": configured,
            "model": self.model,
            "message": "Groq client configured and ready" if configured else "GROQ_API_KEY is not configured",
        }


groq_service = GroqService()
