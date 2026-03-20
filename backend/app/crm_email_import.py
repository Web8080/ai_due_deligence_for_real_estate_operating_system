# Author: Victor.I
# Heuristic extraction from pasted email threads. Replace with Microsoft Graph / Gmail when credentials exist.

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List

EMAIL_RE = re.compile(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}")


@dataclass
class DetectedParty:
    email: str
    full_name_guess: str | None
    company_guess: str | None
    decision_hint: str
    rationale: str


def _clean_name(token: str) -> str | None:
    t = token.strip().strip('"').strip("'")
    if len(t) < 2 or "@" in t:
        return None
    return t


def _domain_company(email: str) -> str | None:
    parts = email.split("@", 1)
    if len(parts) != 2:
        return None
    domain = parts[1].lower()
    if domain in {"gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"}:
        return None
    return domain.split(".")[0].replace("-", " ").title()


def _infer_decision(text: str) -> tuple[str, str]:
    lower = text.lower()
    rules = [
        (
            "committed",
            ["committed", "subscription doc", "wire instruction", "sign subscription", "executed subdocs", "capital call"],
        ),
        ("pass", ["hard pass", "not pursuing", "passing", "decline", "will not participate", "no longer interested"]),
        ("interested", ["interested", "want to proceed", "soft circle", "continue diligence", "like the deal", "in for"]),
        ("follow_up", ["question", "can you send", "clarify", "follow up", "schedule a call", "more detail"]),
    ]
    for label, phrases in rules:
        for p in phrases:
            if p in lower:
                return label, f"Matched phrase near investor language: {p!r}."
    if "ic" in lower and "memo" in lower:
        return "interested", "IC / memo language suggests active evaluation."
    return "unknown", "No strong investor decision phrase detected; review manually."


def parse_investor_email_text(raw: str) -> List[DetectedParty]:
    if not raw or not raw.strip():
        return []
    text = raw.strip()
    decision_hint, rationale = _infer_decision(text[:8000])

    senders: list[tuple[str, str | None]] = []
    for line in text.splitlines():
        lower = line.lower().strip()
        if lower.startswith("from:"):
            rest = line.split(":", 1)[1].strip()
            if "<" in rest and ">" in rest:
                name_part = rest.split("<", 1)[0].strip()
                email_part = EMAIL_RE.search(rest)
                em = email_part.group(0) if email_part else None
                if em:
                    senders.append((em, _clean_name(name_part)))
            else:
                em = EMAIL_RE.search(rest)
                if em:
                    senders.append((em.group(0), None))

    seen: set[str] = set()
    parties: List[DetectedParty] = []

    for email, name_guess in senders:
        el = email.lower()
        if el in seen:
            continue
        seen.add(el)
        company = _domain_company(el)
        parties.append(
            DetectedParty(
                email=el,
                full_name_guess=name_guess or company or el.split("@")[0].replace(".", " ").title(),
                company_guess=company,
                decision_hint=decision_hint,
                rationale=rationale,
            )
        )

    for email_match in EMAIL_RE.finditer(text):
        em = email_match.group(0).lower()
        if em in seen:
            continue
        seen.add(em)
        company = _domain_company(em)
        parties.append(
            DetectedParty(
                email=em,
                full_name_guess=em.split("@")[0].replace(".", " ").title(),
                company_guess=company,
                decision_hint=decision_hint,
                rationale=rationale,
            )
        )

    return parties[:25]
