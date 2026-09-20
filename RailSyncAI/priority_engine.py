# RAIL-BLOCK AI: Maintenance Priority Engine
# Computes explainable priority scores (0–100) for maintenance tasks

from typing import Dict, List, Optional, Tuple
from datetime import date


# Default configurable weights (can be changed via admin)
DEFAULT_WEIGHTS = {
    "safety": 0.25,
    "criticality": 0.20,
    "urgency": 0.15,
    "overdue": 0.15,
    "failure_risk": 0.10,
    "operational_impact": 0.10,
    "health_degradation": 0.05,
}

LEVEL_MAP = {"critical": 1.0, "high": 0.75, "medium": 0.5, "low": 0.25}


def compute_priority_score(
    safety_impact: str = "low",
    criticality: str = "medium",
    urgency: str = "normal",
    overdue_days: int = 0,
    failure_probability: float = 0.05,
    operational_impact: str = "low",
    health_score: float = 80.0,
    traffic_density: str = "medium",
    weights: Optional[Dict[str, float]] = None
) -> Tuple[float, str, List[str]]:
    """
    Compute a priority score 0–100 with explanation.

    Returns:
        score (float): 0–100
        priority_label (str): critical/high/medium/low
        reasons (list[str]): contributing factors
    """
    w = weights or DEFAULT_WEIGHTS
    reasons = []

    # ── Safety component ──
    safety_val = LEVEL_MAP.get(safety_impact, 0.25)
    safety_score = safety_val * 100
    if safety_val >= 0.75:
        reasons.append(f"Safety-critical impact ({safety_impact})")

    # ── Criticality component ──
    crit_val = LEVEL_MAP.get(criticality, 0.5)
    crit_score = crit_val * 100
    if crit_val >= 0.75:
        reasons.append(f"High criticality asset ({criticality})")

    # ── Urgency component ──
    urg_val = 1.0 if urgency == "urgent" else 0.6 if urgency == "high" else 0.3
    urg_score = urg_val * 100
    if urgency == "urgent":
        reasons.append("Marked as urgent by department")

    # ── Overdue component ──
    overdue_score = min(100, overdue_days * 5)  # 20 days overdue → 100
    if overdue_days > 0:
        reasons.append(f"{overdue_days} days overdue")
    if overdue_days > 14:
        reasons.append("Severely overdue — exceeds 14-day threshold")

    # ── Failure risk component ──
    fail_score = min(100, failure_probability * 100 * 1.2)
    if failure_probability > 0.3:
        reasons.append(f"High failure probability ({failure_probability:.0%})")

    # ── Operational impact component ──
    ops_val = LEVEL_MAP.get(operational_impact, 0.25)
    ops_score = ops_val * 100
    if ops_val >= 0.75:
        reasons.append(f"High operational impact ({operational_impact})")

    # ── Health degradation component ──
    health_deg = max(0, (100 - health_score))  # 0–100, higher = worse
    health_deg_score = min(100, health_deg * 1.2)
    if health_score < 50:
        reasons.append(f"Asset health degraded ({health_score:.0f}%)")

    # ── Traffic density bonus (not weighted, additive) ──
    traffic_bonus = {"critical": 8, "high": 5, "medium": 2, "low": 0}.get(traffic_density, 0)
    if traffic_density in ("critical", "high"):
        reasons.append(f"High traffic corridor ({traffic_density})")

    # ── Weighted sum ──
    weighted_score = (
        w.get("safety", 0.25) * safety_score +
        w.get("criticality", 0.20) * crit_score +
        w.get("urgency", 0.15) * urg_score +
        w.get("overdue", 0.15) * overdue_score +
        w.get("failure_risk", 0.10) * fail_score +
        w.get("operational_impact", 0.10) * ops_score +
        w.get("health_degradation", 0.05) * health_deg_score
    ) + traffic_bonus

    final_score = min(100, max(0, round(weighted_score, 1)))

    # Priority label
    if final_score >= 80:
        label = "critical"
    elif final_score >= 60:
        label = "high"
    elif final_score >= 35:
        label = "medium"
    else:
        label = "low"

    if not reasons:
        reasons.append("Standard scheduled maintenance")

    return final_score, label, reasons


def batch_compute_priorities(tasks: list, weights: Optional[Dict] = None) -> list:
    """Compute priorities for a list of task dicts, returning enriched dicts."""
    results = []
    for task in tasks:
        score, label, reasons = compute_priority_score(
            safety_impact=task.get("safety_impact", "low"),
            criticality=task.get("criticality", "medium"),
            urgency=task.get("urgency", "normal"),
            overdue_days=task.get("overdue_days", 0),
            failure_probability=task.get("failure_probability", 0.05),
            operational_impact=task.get("operational_impact", "low"),
            health_score=task.get("health_score", 80),
            traffic_density=task.get("traffic_density", "medium"),
            weights=weights,
        )
        task_result = dict(task)
        task_result["priority_score"] = score
        task_result["priority_label"] = label
        task_result["priority_reasons"] = reasons
        results.append(task_result)
    return sorted(results, key=lambda x: x["priority_score"], reverse=True)
