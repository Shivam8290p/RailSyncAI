# RAIL-BLOCK AI: Synthetic Data Seeder
# Generates realistic Indian Railways data for all entities

import random
import json
from datetime import datetime, date, timedelta
from database import (
    engine, SessionLocal, init_db, Base,
    Department, Corridor, Asset, Defect, MaintenanceTask,
    Train, TrainSchedule, GoodsTrainForecast,
    BlockRequest, BlockWindow, OHEPowerBlock, AuditLog
)

random.seed(42)  # Reproducible

# ═══════════════════════════════════════════
# REFERENCE DATA
# ═══════════════════════════════════════════

ZONES = ["SWR", "SCR", "SR", "CR", "WR", "NR", "ER", "SER", "NFR", "ECR"]
DIVISIONS = {
    "SWR": ["Bengaluru", "Mysuru", "Hubballi"],
    "SCR": ["Secunderabad", "Vijayawada", "Guntur"],
    "SR": ["Chennai", "Madurai", "Salem"],
    "CR": ["Mumbai CSMT", "Pune", "Nagpur"],
}

CORRIDOR_DATA = [
    ("C-01", "SBC-BWT Main Line", "SWR", "Bengaluru", "KSR Bengaluru", "Bangarapet", 2, True, "high"),
    ("C-02", "SBC-MYS Trunk", "SWR", "Bengaluru", "KSR Bengaluru", "Mysuru Jn", 2, True, "high"),
    ("C-03", "MYS-ASK Section", "SWR", "Mysuru", "Mysuru Jn", "Arsikere Jn", 1, False, "medium"),
    ("C-04", "BWT-JTJ Link", "SWR", "Bengaluru", "Bangarapet", "Jolarpettai", 2, True, "medium"),
    ("C-05", "SBC-BYPL Suburban", "SWR", "Bengaluru", "KSR Bengaluru", "Baiyyappanahalli", 4, True, "critical"),
    ("C-06", "YPR-TK Section", "SWR", "Bengaluru", "Yesvantpur Jn", "Tumakuru", 2, True, "high"),
    ("C-07", "UBL-HPT Line", "SWR", "Hubballi", "Hubballi Jn", "Hosapete Jn", 1, False, "medium"),
    ("C-08", "GTL-GY Section", "SCR", "Secunderabad", "Guntakal Jn", "Gooty Jn", 2, True, "high"),
    ("C-09", "SC-WL Main", "SCR", "Secunderabad", "Secunderabad", "Wadi Jn", 2, True, "high"),
    ("C-10", "BZA-GNT Link", "SCR", "Vijayawada", "Vijayawada Jn", "Guntur Jn", 2, True, "high"),
    ("C-11", "MAS-AJJ Main", "SR", "Chennai", "Chennai Central", "Arakkonam Jn", 4, True, "critical"),
    ("C-12", "MAS-BBQ Chord", "SR", "Chennai", "Chennai Beach", "Basin Bridge Jn", 4, True, "critical"),
    ("C-13", "MDU-TPJ Section", "SR", "Madurai", "Madurai Jn", "Tiruchirappalli Jn", 2, True, "medium"),
    ("C-14", "SA-ED Route", "SR", "Salem", "Salem Jn", "Erode Jn", 2, True, "medium"),
    ("C-15", "CSMT-KYN Trunk", "CR", "Mumbai CSMT", "Mumbai CSMT", "Kalyan Jn", 4, True, "critical"),
    ("C-16", "KYN-PUNE Line", "CR", "Pune", "Kalyan Jn", "Pune Jn", 2, True, "high"),
    ("C-17", "PUNE-SUR Section", "CR", "Pune", "Pune Jn", "Solapur Jn", 2, True, "medium"),
    ("C-18", "NGP-BSL Main", "CR", "Nagpur", "Nagpur Jn", "Bhusaval Jn", 2, True, "high"),
    ("C-19", "BCT-BVI Suburban", "WR", "Mumbai CSMT", "Mumbai Central", "Borivali", 4, True, "critical"),
    ("C-20", "ADI-BRC Section", "WR", "Mumbai CSMT", "Ahmedabad Jn", "Vadodara Jn", 2, True, "high"),
]

STATIONS = {
    "C-01": ["SBC", "BNC", "KJM", "WFD", "MLO", "BWT"],
    "C-02": ["SBC", "RRB", "BID", "MDU", "MYA", "MYS"],
    "C-05": ["SBC", "BNC", "KJM", "BYPL"],
}

ASSET_TYPES = {
    "Engineering": [
        "Track Section", "Turnout/Switch", "Rail Joint", "Level Crossing",
        "Bridge/Culvert", "Track Bed", "Ballast Section", "Rail Weld"
    ],
    "Traction Distribution": [
        "OHE Wire", "OHE Mast", "Pantograph Section", "Contact Wire",
        "Catenary Wire", "Return Conductor", "Feeder Station",
        "Traction Substation", "Sectioning Post"
    ],
    "Signal & Telecommunication": [
        "Point Machine", "Signal Post", "Track Circuit", "Axle Counter",
        "Relay Room", "Interlocking System", "CTC Panel",
        "OFC Cable", "Communication Tower", "LED Signal"
    ]
}

DEFECT_TYPES = {
    "Engineering": [
        "Rail Fracture", "Track Gauge Deviation", "Worn Rail",
        "Loose Fastening", "Ballast Deficiency", "Fish Plate Crack",
        "Weld Defect", "Sleeper Damage", "Level Crossing Defect"
    ],
    "Traction Distribution": [
        "Wire Sag Excess", "Insulator Crack", "Mast Foundation Settle",
        "Contact Wire Wear", "Jumper Damage", "Dropper Failure",
        "Return Conductor Break", "Feeder Cable Fault"
    ],
    "Signal & Telecommunication": [
        "Signal Failure", "Point Machine Malfunction", "Track Circuit Failure",
        "Relay Defect", "Cable Fault", "Communication Failure",
        "Axle Counter Error", "LED Signal Dim"
    ]
}

TASK_TYPES = {
    "Engineering": [
        "Track Tamping", "Rail Grinding", "Turnout Renewal",
        "Ballast Screening", "Level Crossing Repair", "Bridge Inspection",
        "Rail Replacement", "Weld Repair", "Gauge Correction",
        "Sleeper Replacement", "Track Patrolling"
    ],
    "Traction Distribution": [
        "OHE Wire Replacement", "Mast Painting", "Insulator Cleaning",
        "Contact Wire Adjustment", "Traction Sub-Station Maintenance",
        "Sectioning Post Maintenance", "Return Conductor Repair",
        "Pantograph Clearance Check", "Feeder Cable Testing"
    ],
    "Signal & Telecommunication": [
        "Point Machine Testing", "Signal Lamp Replacement",
        "Track Circuit Maintenance", "Relay Testing",
        "Interlocking System Check", "OFC Cable Repair",
        "CTC Panel Calibration", "Axle Counter Calibration",
        "Communication Equipment Testing"
    ]
}

TRAIN_TYPES = [
    ("vande-bharat", 1), ("rajdhani", 1), ("superfast", 2),
    ("express", 3), ("passenger", 4), ("freight", 5)
]

TRAIN_NAMES = {
    "vande-bharat": ["Vande Bharat Express", "Namo Bharat Express"],
    "rajdhani": ["Rajdhani Express", "Duronto Express"],
    "superfast": [
        "Karnataka Express", "Brindavan Express", "Lalbagh Express",
        "Shatabdi Express", "Jan Shatabdi Express", "Mysuru Express"
    ],
    "express": [
        "Hampi Express", "Chalukya Express", "Gol Gumbaz Express",
        "Tipu Express", "Island Express", "Netravati Express",
        "Mangala Express", "Sabari Express", "Kerala Express"
    ],
    "passenger": [
        "SBC-BWT Passenger", "MYS-SBC Passenger", "YPR-TK Passenger",
        "SBC-BYPL Suburban", "MEMU Local"
    ],
    "freight": [
        "Freight Cargo", "BCNA Rake", "BLC Container",
        "Tanker Rake", "Military Special", "Coal Rake"
    ]
}


def seed_all():
    """Seed the complete database with synthetic data."""
    init_db()
    db = SessionLocal()

    try:
        # Skip if already seeded
        if db.query(Corridor).count() > 0:
            return {"status": "already_seeded", "message": "Database already contains data."}

        _seed_departments(db)
        corridors = _seed_corridors(db)
        assets = _seed_assets(db, corridors)
        defects = _seed_defects(db, assets)
        tasks = _seed_maintenance_tasks(db, assets, defects, corridors)
        trains = _seed_trains(db)
        _seed_train_schedules(db, trains, corridors)
        _seed_goods_forecasts(db, corridors)
        _seed_block_requests(db, tasks, corridors)
        _seed_block_windows(db, corridors)
        _seed_ohe_power_blocks(db, corridors)

        db.commit()

        counts = {
            "departments": db.query(Department).count(),
            "corridors": db.query(Corridor).count(),
            "assets": db.query(Asset).count(),
            "defects": db.query(Defect).count(),
            "maintenance_tasks": db.query(MaintenanceTask).count(),
            "trains": db.query(Train).count(),
            "train_schedules": db.query(TrainSchedule).count(),
            "goods_forecasts": db.query(GoodsTrainForecast).count(),
            "block_requests": db.query(BlockRequest).count(),
            "block_windows": db.query(BlockWindow).count(),
            "ohe_power_blocks": db.query(OHEPowerBlock).count(),
        }
        return {"status": "seeded", "counts": counts}

    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def _seed_departments(db):
    depts = [
        ("Engineering", "ENGG", "Civil engineering & track maintenance", "#c084fc"),
        ("Traction Distribution", "TRD", "OHE & electrical traction systems", "#fb7185"),
        ("Signal & Telecommunication", "S&T", "Signals, interlocking, telecom", "#fbbf24"),
        ("Control Office", "COA", "Train operations & block planning", "#38bdf8"),
        ("Administration", "ADMIN", "System administration", "#9ca3af"),
    ]
    for name, code, desc, color in depts:
        db.add(Department(name=name, code=code, description=desc, color=color))
    db.flush()


def _seed_corridors(db):
    corridors = []
    for code, name, zone, div, start, end, tracks, elec, density in CORRIDOR_DATA:
        c = Corridor(
            corridor_code=code, name=name, zone=zone, division=div,
            start_location=start, end_location=end,
            track_count=tracks, electrified=elec, traffic_density=density
        )
        db.add(c)
        corridors.append(c)
    db.flush()
    return corridors


def _seed_assets(db, corridors):
    assets = []
    asset_counter = 0
    depts = list(ASSET_TYPES.keys())

    for corridor in corridors:
        n_assets = random.randint(4, 8)
        for _ in range(n_assets):
            dept = random.choice(depts)
            atype = random.choice(ASSET_TYPES[dept])
            asset_counter += 1

            health = round(random.gauss(78, 15), 1)
            health = max(20, min(100, health))
            fp = round(max(0.01, min(0.95, (100 - health) / 100 * random.uniform(0.3, 1.2))), 3)
            crit = "critical" if health < 45 else "high" if health < 60 else "medium" if health < 80 else "low"

            last_maint = date.today() - timedelta(days=random.randint(10, 180))
            next_due = last_maint + timedelta(days=random.randint(30, 120))

            a = Asset(
                asset_id=f"AST-{asset_counter:04d}",
                asset_type=atype,
                department=dept,
                corridor_id=corridor.id,
                location=f"{corridor.start_location} - {corridor.end_location}",
                criticality=crit,
                health_score=health,
                failure_probability=fp,
                last_maintenance=last_maint,
                next_maintenance_due=next_due,
                status="operational" if health > 35 else "degraded"
            )
            db.add(a)
            assets.append(a)
    db.flush()
    return assets


def _seed_defects(db, assets):
    defects = []
    defect_counter = 0
    today = date.today()

    # Create defects for ~40% of assets
    for asset in random.sample(assets, min(len(assets), int(len(assets) * 0.4))):
        dept = asset.department
        n_defects = random.choices([1, 2, 3], weights=[60, 30, 10])[0]

        for _ in range(n_defects):
            defect_counter += 1
            dtypes = DEFECT_TYPES.get(dept, DEFECT_TYPES["Engineering"])
            sev = random.choices(
                ["critical", "high", "medium", "low"],
                weights=[8, 20, 45, 27]
            )[0]

            detected = today - timedelta(days=random.randint(1, 60))
            status = random.choices(
                ["open", "in_progress", "resolved"],
                weights=[50, 30, 20]
            )[0]

            safety = "critical" if sev == "critical" else "high" if sev == "high" else "medium" if random.random() < 0.3 else "low"

            d = Defect(
                defect_id=f"DEF-{defect_counter:04d}",
                asset_id=asset.id,
                department=dept,
                defect_type=random.choice(dtypes),
                severity=sev,
                detected_date=detected,
                description=f"{random.choice(dtypes)} detected on {asset.asset_type} at {asset.location}",
                safety_risk=safety,
                operational_risk=sev,
                status=status,
                resolution_date=today if status == "resolved" else None
            )
            db.add(d)
            defects.append(d)
    db.flush()
    return defects


def _seed_maintenance_tasks(db, assets, defects, corridors):
    tasks = []
    task_counter = 0
    today = date.today()
    depts = list(TASK_TYPES.keys())

    # Create tasks linked to defects
    for defect in defects:
        if defect.status == "resolved":
            continue
        task_counter += 1
        dept = defect.department
        ttype = random.choice(TASK_TYPES.get(dept, TASK_TYPES["Engineering"]))
        asset = next((a for a in assets if a.id == defect.asset_id), None)
        corridor = next((c for c in corridors if asset and c.id == asset.corridor_id), None)

        due = today + timedelta(days=random.randint(-15, 30))
        overdue = max(0, (today - due).days) if due < today else 0
        duration = random.choice([30, 45, 60, 90, 120, 150, 180])
        priority = "critical" if defect.severity == "critical" else defect.severity

        score = _calc_priority_score(priority, overdue, defect.safety_risk,
                                      asset.health_score if asset else 70)

        t = MaintenanceTask(
            task_id=f"MT-{task_counter:04d}",
            asset_id=defect.asset_id,
            department=dept,
            task_type=ttype,
            description=f"{ttype} for {defect.defect_type}",
            location=asset.location if asset else "",
            corridor_id=corridor.id if corridor else None,
            defect_id=defect.id,
            priority=priority,
            criticality=priority,
            urgency="urgent" if overdue > 7 else "normal",
            estimated_duration=duration,
            due_date=due,
            overdue_days=overdue,
            safety_impact=defect.safety_risk,
            operational_impact=defect.operational_risk,
            isolation_requirement=dept == "Traction Distribution" or random.random() < 0.2,
            status="pending",
            priority_score=score,
        )
        db.add(t)
        tasks.append(t)

    # Create additional routine tasks
    for _ in range(max(0, 200 - len(tasks))):
        task_counter += 1
        dept = random.choice(depts)
        ttype = random.choice(TASK_TYPES[dept])
        asset = random.choice(assets) if assets else None
        corridor = next((c for c in corridors if asset and c.id == asset.corridor_id), None)

        due = today + timedelta(days=random.randint(-10, 45))
        overdue = max(0, (today - due).days) if due < today else 0
        duration = random.choice([30, 45, 60, 90, 120, 150, 180])
        priority = random.choices(["critical", "high", "medium", "low"], weights=[5, 20, 50, 25])[0]

        score = _calc_priority_score(priority, overdue, "low",
                                      asset.health_score if asset else 70)

        t = MaintenanceTask(
            task_id=f"MT-{task_counter:04d}",
            asset_id=asset.id if asset else None,
            department=dept,
            task_type=ttype,
            description=f"Routine {ttype}",
            location=asset.location if asset else "",
            corridor_id=corridor.id if corridor else random.choice(corridors).id,
            priority=priority,
            criticality=priority,
            urgency="urgent" if overdue > 7 else "normal",
            estimated_duration=duration,
            due_date=due,
            overdue_days=overdue,
            safety_impact="low",
            operational_impact=priority,
            isolation_requirement=dept == "Traction Distribution" or random.random() < 0.15,
            status=random.choices(["pending", "approved", "scheduled"], weights=[60, 25, 15])[0],
            priority_score=score,
        )
        db.add(t)
        tasks.append(t)

    db.flush()
    return tasks


def _calc_priority_score(priority, overdue, safety, health):
    """Simple priority scoring for seed data."""
    base = {"critical": 80, "high": 60, "medium": 40, "low": 20}.get(priority, 40)
    safety_bonus = {"critical": 15, "high": 10, "medium": 5, "low": 0}.get(safety, 0)
    overdue_bonus = min(20, overdue * 1.5)
    health_bonus = max(0, (100 - health) * 0.15)
    return min(100, round(base + safety_bonus + overdue_bonus + health_bonus, 1))


def _seed_trains(db):
    trains = []
    train_counter = 10000

    for ttype, priority in TRAIN_TYPES:
        names = TRAIN_NAMES.get(ttype, ["Train"])
        n_trains = random.randint(3, 8) if ttype in ("express", "freight") else random.randint(2, 4)
        for i in range(n_trains):
            train_counter += random.randint(1, 50)
            name = random.choice(names)
            direction = random.choice(["Up", "Down"])

            t = Train(
                train_number=str(train_counter),
                train_name=f"{name} ({direction})",
                train_type=ttype,
                origin="SBC" if direction == "Up" else "BWT",
                destination="BWT" if direction == "Up" else "SBC",
                priority=priority,
            )
            db.add(t)
            trains.append(t)

    db.flush()
    return trains


def _seed_train_schedules(db, trains, corridors):
    stations = ["SBC", "BNC", "KJM", "WFD", "MLO", "BWT"]
    today = date.today()

    for train in trains:
        is_up = "Up" in train.train_name
        start_hour = random.randint(4, 22)
        start_min = random.choice([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55])

        route = stations if is_up else list(reversed(stations))
        for idx, stn in enumerate(route):
            offset = idx * random.randint(12, 25)
            total_mins = start_hour * 60 + start_min + offset
            h = (total_mins // 60) % 24
            m = total_mins % 60
            time_str = f"{h:02d}:{m:02d}"

            db.add(TrainSchedule(
                train_id=train.id,
                corridor_id=corridors[0].id if corridors else None,
                station_code=stn,
                date=today,
                arrival_time=time_str,
                departure_time=time_str,
                direction="up" if is_up else "down",
            ))
    db.flush()


def _seed_goods_forecasts(db, corridors):
    today = date.today()
    windows = [
        "00:00-02:00", "02:00-04:00", "04:00-06:00", "06:00-08:00",
        "08:00-10:00", "10:00-12:00", "12:00-14:00", "14:00-16:00",
        "16:00-18:00", "18:00-20:00", "20:00-22:00", "22:00-00:00"
    ]

    for corridor in corridors:
        for day_offset in range(14):
            d = today + timedelta(days=day_offset)
            dow = d.weekday()
            for window in windows:
                hour = int(window.split(":")[0])
                # Freight is higher at night and on weekdays
                base = 8 if 22 <= hour or hour < 6 else 4 if 10 <= hour <= 16 else 6
                if dow >= 5:  # weekend
                    base = int(base * 0.6)
                if corridor.traffic_density == "critical":
                    base = int(base * 1.5)
                elif corridor.traffic_density == "high":
                    base = int(base * 1.2)

                predicted = max(0, base + random.randint(-2, 3))
                level = "critical" if predicted > 12 else "high" if predicted > 8 else "medium" if predicted > 4 else "low"

                db.add(GoodsTrainForecast(
                    corridor_id=corridor.id,
                    date=d,
                    time_window=window,
                    predicted_goods_trains=predicted,
                    confidence=round(random.uniform(0.65, 0.95), 2),
                    traffic_level=level,
                    forecast_method="historical_average"
                ))
    db.flush()


def _seed_block_requests(db, tasks, corridors):
    pending_tasks = [t for t in tasks if t.status in ("pending", "approved")]
    for i, task in enumerate(pending_tasks[:40]):
        corridor = next((c for c in corridors if c.id == task.corridor_id), random.choice(corridors))
        # Generate requested time in the block window (nighttime preferred)
        hour = random.choice([0, 1, 2, 3, 4, 5, 10, 11, 14, 15, 22, 23])
        dur = task.estimated_duration

        db.add(BlockRequest(
            request_id=f"BR-{i+1:04d}",
            requested_by=task.department,
            department=task.department,
            corridor_id=corridor.id,
            start_location=corridor.start_location,
            end_location=corridor.end_location,
            requested_date=task.due_date or date.today(),
            requested_start=f"{hour:02d}:00",
            requested_end=f"{(hour + dur // 60) % 24:02d}:{dur % 60:02d}",
            duration=dur,
            block_type="traffic" if task.isolation_requirement else "non-traffic",
            isolation_required=task.isolation_requirement,
            priority=task.priority,
            status="pending",
            task_ids=task.task_id,
        ))
    db.flush()


def _seed_block_windows(db, corridors):
    today = date.today()
    for corridor in corridors:
        for day_offset in range(7):
            d = today + timedelta(days=day_offset)
            # Generate 3-5 block windows per corridor per day
            windows = [
                ("01:00", "03:00", "low"), ("03:00", "05:00", "low"),
                ("10:30", "12:30", "medium"), ("14:00", "16:00", "medium"),
                ("22:00", "00:00", "low"),
            ]
            for start, end, traffic in windows:
                if random.random() < 0.7:  # Not all windows available every day
                    db.add(BlockWindow(
                        corridor_id=corridor.id,
                        date=d,
                        start_time=start, end_time=end,
                        availability="available",
                        traffic_level=traffic,
                        train_conflicts=random.randint(0, 3),
                        freight_forecast=random.randint(0, 8),
                    ))
    db.flush()


def _seed_ohe_power_blocks(db, corridors):
    elec = [c for c in corridors if c.electrified]
    for i, corridor in enumerate(elec[:10]):
        db.add(OHEPowerBlock(
            corridor_id=corridor.id,
            section=f"{corridor.start_location} - {corridor.end_location}",
            requested_start=f"{random.randint(0,4):02d}:00",
            requested_end=f"{random.randint(3,6):02d}:00",
            isolation_type=random.choice(["full", "partial"]),
            traction_status="de-energized",
            linked_block_id=f"BR-{i+1:04d}",
            status=random.choice(["pending", "approved"]),
            approval_status=random.choice(["pending", "approved"]),
        ))
    db.flush()


if __name__ == "__main__":
    result = seed_all()
    print(json.dumps(result, indent=2))
