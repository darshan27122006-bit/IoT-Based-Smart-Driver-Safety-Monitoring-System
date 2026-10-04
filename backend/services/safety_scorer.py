from typing import List
from schemas.sensor import EventCreate
from config import settings

def calculate_score_deductions(events: List[EventCreate]) -> float:
    deduction = 0.0
    for event in events:
        sev = event.severity.upper()
        etype = event.event_type.upper()
        
        if etype in ("OVERSPEED", "OVERSPEEDING"):
            if sev == "LOW":
                deduction += settings.penalty_overspeed_low
            elif sev == "MEDIUM":
                deduction += settings.penalty_overspeed_med
            elif sev == "HIGH":
                deduction += settings.penalty_overspeed_high
                
        elif etype in ("HARSH_BRAKING", "HARSH BRAKING"):
            if sev == "LOW":
                deduction += settings.penalty_harsh_braking_low
            elif sev == "MEDIUM":
                deduction += settings.penalty_harsh_braking_med
            elif sev == "HIGH":
                deduction += settings.penalty_harsh_braking_high
                
        elif etype in ("SUDDEN_ACCELERATION", "SUDDEN ACCELERATION"):
            if sev == "LOW":
                deduction += settings.penalty_sudden_accel_low
            elif sev == "MEDIUM":
                deduction += settings.penalty_sudden_accel_med
            elif sev == "HIGH":
                deduction += settings.penalty_sudden_accel_high
                
        elif etype in ("SHARP_TURN", "SHARP TURN"):
            if sev == "LOW":
                deduction += settings.penalty_sharp_turn_low
            elif sev == "MEDIUM":
                deduction += settings.penalty_sharp_turn_med
            elif sev == "HIGH":
                deduction += settings.penalty_sharp_turn_high
                
        elif etype in ("ABNORMAL_BEHAVIOR", "ABNORMAL BEHAVIOR"):
            if sev == "LOW":
                deduction += 3.0
            elif sev == "MEDIUM":
                deduction += 6.0
            elif sev == "HIGH":
                deduction += 12.0
            else:
                deduction += 5.0
                
    return deduction

def get_classification(score: float) -> str:
    if score >= settings.score_safe_min:
        return "SAFE"
    elif score >= settings.score_moderate_min:
        return "MODERATE"
    else:
        return "RISKY"
