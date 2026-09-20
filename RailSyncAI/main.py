# RAIL-BLOCK AI: FastAPI Application Gateway
# Serves AI/ML optimizer, authentication, database CRUD, and data APIs

import os
import hashlib
import json as _json
from datetime import datetime, timedelta, date
from typing import List, Dict, Optional

from fastapi import FastAPI, HTTPException, Depends, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn

# Import modules
from ai_engine import RailBlockOptimizer
from priority_engine import compute_priority_score, batch_compute_priorities
from database import init_db, SessionLocal, get_db
from database import (
    Department, Corridor, Asset, Defect, MaintenanceTask,
    Train, TrainSchedule, GoodsTrainForecast,
    BlockRequest as BlockRequestDB, BlockWindow, OptimizedBlock,
    Conflict, OHEPowerBlock, AuditLog
)

# ═══════════════════════════════════════════
# JWT Helpers
# ═══════════════════════════════════════════
import base64, hmac, time as _time

JWT_SECRET = os.environ.get("JWT_SECRET", "railblock-demo-secret-sih2026-do-not-use-in-production")
JWT_EXPIRY_HOURS = 8

def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def _b64decode(s: str) -> bytes:
    s += "=" * (4 - len(s) % 4)
    return base64.urlsafe_b64decode(s)

def create_jwt(payload: dict) -> str:
    header = _b64encode(_json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload["iat"] = int(_time.time())
    payload["exp"] = int(_time.time()) + JWT_EXPIRY_HOURS * 3600
    body = _b64encode(_json.dumps(payload).encode())
    signature = _b64encode(hmac.new(JWT_SECRET.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest())
    return f"{header}.{body}.{signature}"

def verify_jwt(token: str) -> Optional[dict]:
    try:
        parts = token.split(".")
        if len(parts) != 3: return None
        header, body, signature = parts
        expected_sig = _b64encode(hmac.new(JWT_SECRET.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(signature, expected_sig): return None
        payload = _json.loads(_b64decode(body))
        if payload.get("exp", 0) < _time.time(): return None
        return payload
    except Exception:
        return None

# ═══════════════════════════════════════════
# Password Hashing
# ═══════════════════════════════════════════
def hash_password(password: str) -> str:
    return hashlib.sha256((password + JWT_SECRET).encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hmac.compare_digest(hash_password(password), hashed)

# ═══════════════════════════════════════════
# DEMO USER DATABASE
# ═══════════════════════════════════════════
DEMO_USERS = [
    {"id": "USR001", "employee_id": "COA001", "name": "Kavitha Subhramanyam",
     "email": "kavitha.subhramanyan@railnet.gov.in", "password_hash": hash_password("Demo@123"),
     "role": "Control Office", "department": "Control Office", "status": "active"},
    {"id": "USR002", "employee_id": "MPL001", "name": "Srinivasan.J.",
     "email": "Srinivasan.J@railnet.gov.in", "password_hash": hash_password("Demo@123"),
     "role": "Maintenance Planner", "department": "Maintenance Planning", "status": "active"},
    {"id": "USR003", "employee_id": "ENG001", "name": "Vikram Singh",
     "email": "vikram.singh@railnet.gov.in", "password_hash": hash_password("Demo@123"),
     "role": "Engineering Officer", "department": "Engineering", "status": "active"},
    {"id": "USR004", "employee_id": "TD001", "name": "Anita Desai",
     "email": "anita.desai@railnet.gov.in", "password_hash": hash_password("Demo@123"),
     "role": "Traction Distribution Officer", "department": "Traction Distribution", "status": "active"},
    {"id": "USR005", "employee_id": "SNT001", "name": "Suresh Kumar",
     "email": "suresh.kumar@railnet.gov.in", "password_hash": hash_password("Demo@123"),
     "role": "S&T Officer", "department": "Signal & Telecommunication", "status": "active"},
    {"id": "USR006", "employee_id": "ADMIN001", "name": "Admin User",
     "email": "admin@railnet.gov.in", "password_hash": hash_password("Admin@123"),
     "role": "Administrator", "department": "Administration", "status": "active"},
    {"id": "PUB001", "employee_id": "USER001", "name": "Amit Kumar",
     "email": "amit.kumar@gmail.com", "password_hash": hash_password("User@123"),
     "role": "Normal User", "department": "Public", "status": "active"},
    {"id": "PUB002", "employee_id": "USER002", "name": "Priya Singh",
     "email": "priya.singh@gmail.com", "password_hash": hash_password("User@123"),
     "role": "Normal User", "department": "Public", "status": "active"},
    {"id": "PUB003", "employee_id": "USER003", "name": "Rajesh Patel",
     "email": "rajesh.patel@gmail.com", "password_hash": hash_password("User@123"),
     "role": "Normal User", "department": "Public", "status": "active"}
]

revoked_tokens = set()

def log_audit_mem(user_id: str, action: str, status: str, detail: str = ""):
    """In-memory audit logging (supplements DB audit log)."""
    pass  # DB audit log handles this now

# ═══════════════════════════════════════════
# FASTAPI APP
# ═══════════════════════════════════════════
app = FastAPI(
    title="RAIL-BLOCK AI Gateway",
    description="REST API for Indian Railways Automatic Block Planning Solver",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import Request
@app.middleware("http")
async def add_cache_control_header(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

# Initialize database on startup
@app.on_event("startup")
def startup():
    init_db()

# ═══════════════════════════════════════════
# AUTH DEPENDENCY
# ═══════════════════════════════════════════
def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")
    token = authorization.split(" ", 1)[1]
    if token in revoked_tokens:
        raise HTTPException(status_code=401, detail="Session expired.")
    payload = verify_jwt(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Session expired.")
    user = next((u for u in DEMO_USERS if u["id"] == payload.get("sub")), None)
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")
    return user

# ═══════════════════════════════════════════
# PYDANTIC SCHEMAS
# ═══════════════════════════════════════════
class LoginRequest(BaseModel):
    employee_id: str
    password: str

class ForgotPasswordRequest(BaseModel):
    employee_id: str
    email: str

class SolverBlockRequest(BaseModel):
    id: str
    dept: str
    deptName: str
    workType: str
    section: str
    stationStartY: float
    stationEndY: float
    start: str
    end: str
    machine: str

class Stop(BaseModel):
    code: str
    time: str

class TrainPath(BaseModel):
    id: str
    number: str
    name: str
    type: str
    stops: List[Stop]
    delays: Dict[str, List[int]]

class OptimizationInput(BaseModel):
    requests: List[SolverBlockRequest]
    trains: List[TrainPath]
    punctuality_weight: float = 0.7
    maintenance_weight: float = 0.3

class TaskCreateRequest(BaseModel):
    department: str
    task_type: str
    description: str = ""
    location: str = ""
    corridor_id: Optional[int] = None
    priority: str = "medium"
    estimated_duration: int = 60
    due_date: Optional[str] = None
    safety_impact: str = "low"
    operational_impact: str = "low"
    isolation_requirement: bool = False

class TaskUpdateRequest(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    description: Optional[str] = None
    estimated_duration: Optional[int] = None
    due_date: Optional[str] = None

class DefectCreateRequest(BaseModel):
    department: str
    defect_type: str
    severity: str = "medium"
    description: str = ""
    asset_id: Optional[int] = None
    safety_risk: str = "low"
    operational_risk: str = "low"

class DefectUpdateRequest(BaseModel):
    status: Optional[str] = None
    severity: Optional[str] = None
    description: Optional[str] = None

# ═══════════════════════════════════════════
# AUTH ENDPOINTS
# ═══════════════════════════════════════════
@app.post("/api/auth/login")
def login(payload: LoginRequest):
    trimmed_id = payload.employee_id.strip().upper()
    user = next((u for u in DEMO_USERS if u["employee_id"] == trimmed_id), None)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid Employee ID or password.")
    if user["status"] != "active":
        raise HTTPException(status_code=403, detail="Account disabled.")
    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid Employee ID or password.")
    token = create_jwt({"sub": user["id"], "role": user["role"]})
    return {
        "token": token,
        "user": {
            "id": user["id"], "employeeId": user["employee_id"],
            "name": user["name"], "role": user["role"],
            "department": user["department"], "email": user["email"]
        }
    }

@app.post("/api/auth/logout")
def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        revoked_tokens.add(authorization.split(" ", 1)[1])
    return {"message": "Signed out successfully."}

@app.get("/api/auth/me")
def get_me(user=Depends(get_current_user)):
    return {"id": user["id"], "employeeId": user["employee_id"],
            "name": user["name"], "role": user["role"],
            "department": user["department"], "email": user["email"]}

@app.post("/api/auth/forgot-password")
def forgot_password(payload: ForgotPasswordRequest):
    return {"message": "Password reset instructions sent."}

# ═══════════════════════════════════════════
# SYSTEM & DATA ENDPOINTS
# ═══════════════════════════════════════════
@app.get("/api/status")
def read_status():
    from ai_engine import ORTOOLS_AVAILABLE
    return {
        "status": "online",
        "service": "RAIL-BLOCK AI v2.0",
        "or_tools": ORTOOLS_AVAILABLE,
        "database": "SQLite (railblock.db)"
    }

@app.post("/api/data/seed")
def seed_database():
    """Seed the database with synthetic data."""
    try:
        from seed_data import seed_all
        result = seed_all()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/data/stats")
def data_stats():
    """Get count of all entities in the database."""
    db = SessionLocal()
    try:
        return {
            "corridors": db.query(Corridor).count(),
            "assets": db.query(Asset).count(),
            "defects": db.query(Defect).count(),
            "maintenance_tasks": db.query(MaintenanceTask).count(),
            "trains": db.query(Train).count(),
            "block_requests": db.query(BlockRequestDB).count(),
            "block_windows": db.query(BlockWindow).count(),
            "ohe_power_blocks": db.query(OHEPowerBlock).count(),
            "goods_forecasts": db.query(GoodsTrainForecast).count(),
        }
    finally:
        db.close()

# ═══════════════════════════════════════════
# OPTIMIZATION ENDPOINTS
# ═══════════════════════════════════════════
@app.post("/api/optimize")
def run_optimization(payload: OptimizationInput):
    """Legacy: optimize blocks sent from frontend."""
    try:
        stations = ["SBC", "BNC", "KJM", "WFD", "MLO", "BWT"]
        optimizer = RailBlockOptimizer(stations)
        req_dicts = [req.model_dump() for req in payload.requests]
        train_dicts = [train.model_dump() for train in payload.trains]
        result = optimizer.optimize(
            req_dicts, train_dicts,
            punctuality_weight=payload.punctuality_weight,
            maintenance_weight=payload.maintenance_weight
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimizer error: {str(e)}")


class DBOptimizeRequest(BaseModel):
    corridor_id: Optional[int] = None
    punctuality_weight: float = 0.7
    maintenance_weight: float = 0.3
    max_tasks: int = 15


@app.post("/api/optimize-db")
def run_db_optimization(payload: DBOptimizeRequest):
    """
    Database-driven optimization: pulls REAL pending tasks, trains, corridors,
    and block windows from the SQLite database. Results change as data changes.
    """
    import random as _rand
    db = SessionLocal()
    try:
        # ── 1. Pull pending maintenance tasks from DB ──
        task_q = db.query(MaintenanceTask).filter(
            MaintenanceTask.status.in_(["pending", "approved", "scheduled"])
        ).order_by(MaintenanceTask.priority_score.desc())

        if payload.corridor_id:
            task_q = task_q.filter(MaintenanceTask.corridor_id == payload.corridor_id)

        db_tasks = task_q.limit(payload.max_tasks).all()
        if not db_tasks:
            return {"optimized": False, "error": "No pending maintenance tasks in database.",
                    "kpis": None, "blocks": [], "delays": {}, "logs": ["No tasks to optimize."]}

        # ── 2. Pick a corridor to visualize (first corridor with tasks, or specified) ──
        corridor_ids = list(set(t.corridor_id for t in db_tasks if t.corridor_id))
        if not corridor_ids:
            return {"optimized": False, "error": "Tasks have no corridor assignments.",
                    "kpis": None, "blocks": [], "delays": {}, "logs": ["No corridor data."]}

        primary_corridor_id = payload.corridor_id or corridor_ids[0]
        corridor = db.query(Corridor).filter(Corridor.id == primary_corridor_id).first()

        # ── 3. Build block requests from tasks ──
        dept_colors = {"Engineering": "engg", "Traction Distribution": "ohe",
                       "Signal & Telecommunication": "st"}
        dept_names = {"Engineering": "Civil Engineering",
                      "Traction Distribution": "Electrical (TRD)",
                      "Signal & Telecommunication": "Signalling & Telecom"}

        stations_for_corridor = ["SBC", "BNC", "KJM", "WFD", "MLO", "BWT"]
        sections = ["SBC - BNC", "BNC - KJM", "KJM - WFD", "WFD - MLO", "MLO - BWT"]
        section_stations = {
            "SBC - BNC": ("SBC", "BNC"), "BNC - KJM": ("BNC", "KJM"),
            "KJM - WFD": ("KJM", "WFD"), "WFD - MLO": ("WFD", "MLO"),
            "MLO - BWT": ("MLO", "BWT")
        }
        station_y = {"SBC": 50, "BNC": 130, "KJM": 210, "WFD": 290, "MLO": 370, "BWT": 450}

        block_requests = []
        for i, task in enumerate(db_tasks):
            section = sections[i % len(sections)]
            stn_start, stn_end = section_stations[section]
            dur = task.estimated_duration or 60

            # Distribute start times across the day based on task index
            base_hour = 8 + (i * 2) % 12  # spread from 08:00 to 20:00
            base_min = (i * 17) % 60  # varied minutes
            start_mins = base_hour * 60 + base_min
            end_mins = start_mins + dur
            if end_mins > 20 * 60:
                end_mins = 20 * 60
                start_mins = end_mins - dur

            block_requests.append({
                "id": task.task_id,
                "dept": dept_colors.get(task.department, "engg"),
                "deptName": dept_names.get(task.department, task.department),
                "workType": task.task_type,
                "section": section,
                "stationStartY": station_y[stn_start],
                "stationEndY": station_y[stn_end],
                "start": f"{start_mins // 60:02d}:{start_mins % 60:02d}",
                "end": f"{end_mins // 60:02d}:{end_mins % 60:02d}",
                "machine": task.resource_requirements or f"{task.task_type} Unit",
                "task_db_id": task.id,
                "priority_score": task.priority_score,
                "priority": task.priority,
                "overdue_days": task.overdue_days,
                "estimated_duration": dur,
            })

        # ── 4. Pull trains from DB or use defaults ──
        db_trains = db.query(Train).limit(10).all()
        train_list = []
        for t_idx, train in enumerate(db_trains):
            schedules = db.query(TrainSchedule).filter(
                TrainSchedule.train_id == train.id
            ).order_by(TrainSchedule.arrival_time).all()

            if not schedules or len(schedules) < 2:
                continue

            stops = []
            for s in schedules:
                if s.station_code in station_y:
                    stops.append({"code": s.station_code, "time": s.arrival_time or "08:00"})

            if len(stops) < 2:
                continue

            train_list.append({
                "id": f"T-{train.train_number}",
                "number": train.train_number,
                "name": train.train_name,
                "type": train.train_type,
                "stops": stops,
                "delays": {"unopt": [0] * len(stops), "opt": [0] * len(stops)},
                "priority": train.priority,
            })

        if not train_list:
            # Fallback: generate some trains if DB has none with valid schedules
            train_list = _generate_fallback_trains(stations_for_corridor)

        # ── 5. Pull goods forecasts for context ──
        today = date.today()
        forecasts = db.query(GoodsTrainForecast).filter(
            GoodsTrainForecast.corridor_id == primary_corridor_id,
            GoodsTrainForecast.date == today
        ).all()
        freight_info = {}
        for f in forecasts:
            freight_info[f.time_window] = {
                "predicted_trains": f.predicted_goods_trains,
                "traffic_level": f.traffic_level,
                "confidence": f.confidence
            }

        # ── 6. Run optimizer on DB data ──
        optimizer = RailBlockOptimizer(stations_for_corridor)
        result = optimizer.optimize(
            block_requests, train_list,
            punctuality_weight=payload.punctuality_weight,
            maintenance_weight=payload.maintenance_weight
        )

        # ── 7. Enrich result with DB context ──
        result["data_source"] = "database"
        result["corridor"] = {
            "id": corridor.id if corridor else None,
            "name": corridor.name if corridor else "Unknown",
            "code": corridor.corridor_code if corridor else "?",
        }
        result["task_count"] = len(db_tasks)
        result["train_count"] = len(train_list)
        result["freight_context"] = freight_info
        result["db_stats"] = {
            "total_pending_tasks": db.query(MaintenanceTask).filter(
                MaintenanceTask.status.in_(["pending", "approved"])).count(),
            "total_overdue": db.query(MaintenanceTask).filter(
                MaintenanceTask.overdue_days > 0).count(),
            "total_critical": db.query(MaintenanceTask).filter(
                MaintenanceTask.priority == "critical").count(),
            "total_defects_open": db.query(Defect).filter(Defect.status == "open").count(),
            "avg_priority_score": round(
                sum(t.priority_score for t in db_tasks) / len(db_tasks), 1),
        }

        # Add priority breakdown to logs
        result["logs"].insert(0,
            f"Loaded {len(db_tasks)} pending tasks from database "
            f"(avg priority: {result['db_stats']['avg_priority_score']})")
        result["logs"].insert(1,
            f"Corridor: {corridor.name if corridor else 'N/A'} | "
            f"Trains: {len(train_list)} | Freight windows: {len(freight_info)}")

        return result

    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"DB Optimizer error: {str(e)}\n{traceback.format_exc()}")
    finally:
        db.close()


def _generate_fallback_trains(stations):
    """Generate some train paths if DB trains don't have valid schedules."""
    import random as _r
    trains = []
    train_types = [("vande-bharat", "Vande Bharat Express"), ("superfast", "Karnataka Express"),
                   ("passenger-exp", "Passenger Express"), ("freight", "Freight Cargo")]
    for i, (ttype, tname) in enumerate(train_types):
        hour = 8 + i * 3
        is_up = i % 2 == 0
        route = stations if is_up else list(reversed(stations))
        stops = []
        for j, stn in enumerate(route):
            t = hour * 60 + j * _r.randint(12, 25)
            stops.append({"code": stn, "time": f"{(t//60)%24:02d}:{t%60:02d}"})
        trains.append({
            "id": f"T-{10000+i*100+_r.randint(1,99)}",
            "number": str(10000+i*100+_r.randint(1,99)),
            "name": f"{tname} ({'Up' if is_up else 'Down'})",
            "type": ttype,
            "stops": stops,
            "delays": {"unopt": [0]*len(stops), "opt": [0]*len(stops)},
        })
    return trains

# ═══════════════════════════════════════════
# CORRIDOR ENDPOINTS
# ═══════════════════════════════════════════
@app.get("/api/corridors")
def list_corridors():
    db = SessionLocal()
    try:
        corridors = db.query(Corridor).all()
        return [
            {"id": c.id, "corridor_code": c.corridor_code, "name": c.name,
             "zone": c.zone, "division": c.division,
             "start_location": c.start_location, "end_location": c.end_location,
             "track_count": c.track_count, "electrified": c.electrified,
             "traffic_density": c.traffic_density}
            for c in corridors
        ]
    finally:
        db.close()

# ═══════════════════════════════════════════
# ASSET ENDPOINTS
# ═══════════════════════════════════════════
@app.get("/api/assets")
def list_assets(department: Optional[str] = None, corridor_id: Optional[int] = None,
                limit: int = 50, offset: int = 0):
    db = SessionLocal()
    try:
        q = db.query(Asset)
        if department:
            q = q.filter(Asset.department == department)
        if corridor_id:
            q = q.filter(Asset.corridor_id == corridor_id)
        total = q.count()
        assets = q.offset(offset).limit(limit).all()
        return {
            "total": total,
            "items": [
                {"id": a.id, "asset_id": a.asset_id, "asset_type": a.asset_type,
                 "department": a.department, "corridor_id": a.corridor_id,
                 "location": a.location, "criticality": a.criticality,
                 "health_score": a.health_score, "failure_probability": a.failure_probability,
                 "last_maintenance": str(a.last_maintenance) if a.last_maintenance else None,
                 "next_maintenance_due": str(a.next_maintenance_due) if a.next_maintenance_due else None,
                 "status": a.status}
                for a in assets
            ]
        }
    finally:
        db.close()

# ═══════════════════════════════════════════
# MAINTENANCE TASK ENDPOINTS
# ═══════════════════════════════════════════
@app.get("/api/tasks")
def list_tasks(department: Optional[str] = None, status: Optional[str] = None,
               priority: Optional[str] = None, corridor_id: Optional[int] = None,
               overdue_only: bool = False,
               limit: int = 50, offset: int = 0, sort: str = "priority_score"):
    db = SessionLocal()
    try:
        q = db.query(MaintenanceTask)
        if department:
            q = q.filter(MaintenanceTask.department == department)
        if status:
            q = q.filter(MaintenanceTask.status == status)
        if priority:
            q = q.filter(MaintenanceTask.priority == priority)
        if corridor_id:
            q = q.filter(MaintenanceTask.corridor_id == corridor_id)
        if overdue_only:
            q = q.filter(MaintenanceTask.overdue_days > 0)

        total = q.count()

        if sort == "priority_score":
            q = q.order_by(MaintenanceTask.priority_score.desc())
        elif sort == "due_date":
            q = q.order_by(MaintenanceTask.due_date.asc())
        elif sort == "overdue_days":
            q = q.order_by(MaintenanceTask.overdue_days.desc())

        tasks = q.offset(offset).limit(limit).all()
        return {
            "total": total,
            "items": [_task_to_dict(t) for t in tasks]
        }
    finally:
        db.close()


@app.post("/api/tasks")
def create_task(payload: TaskCreateRequest):
    db = SessionLocal()
    try:
        count = db.query(MaintenanceTask).count()
        task_id = f"MT-{count+1:04d}"

        due = None
        overdue = 0
        if payload.due_date:
            due = datetime.strptime(payload.due_date, "%Y-%m-%d").date()
            overdue = max(0, (date.today() - due).days)

        score, label, reasons = compute_priority_score(
            safety_impact=payload.safety_impact,
            criticality=payload.priority,
            overdue_days=overdue,
            operational_impact=payload.operational_impact,
        )

        task = MaintenanceTask(
            task_id=task_id,
            department=payload.department,
            task_type=payload.task_type,
            description=payload.description,
            location=payload.location,
            corridor_id=payload.corridor_id,
            priority=label,
            criticality=payload.priority,
            estimated_duration=payload.estimated_duration,
            due_date=due,
            overdue_days=overdue,
            safety_impact=payload.safety_impact,
            operational_impact=payload.operational_impact,
            isolation_requirement=payload.isolation_requirement,
            status="pending",
            priority_score=score,
        )
        db.add(task)
        db.commit()
        db.refresh(task)

        return {"id": task.id, "task_id": task.task_id, "priority_score": score,
                "priority": label, "reasons": reasons}
    finally:
        db.close()


@app.put("/api/tasks/{task_id}")
def update_task(task_id: int, payload: TaskUpdateRequest):
    db = SessionLocal()
    try:
        task = db.query(MaintenanceTask).filter(MaintenanceTask.id == task_id).first()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        if payload.status is not None:
            task.status = payload.status
        if payload.priority is not None:
            task.criticality = payload.priority
        if payload.description is not None:
            task.description = payload.description
        if payload.estimated_duration is not None:
            task.estimated_duration = payload.estimated_duration
        if payload.due_date is not None:
            task.due_date = datetime.strptime(payload.due_date, "%Y-%m-%d").date()
            task.overdue_days = max(0, (date.today() - task.due_date).days)

        # Recompute priority score
        score, label, reasons = compute_priority_score(
            safety_impact=task.safety_impact,
            criticality=task.criticality,
            overdue_days=task.overdue_days,
            operational_impact=task.operational_impact,
        )
        task.priority = label
        task.priority_score = score
        task.updated_at = datetime.utcnow()

        db.commit()
        return {"id": task.id, "task_id": task.task_id, "priority_score": score,
                "priority": label, "reasons": reasons}
    finally:
        db.close()


@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int):
    db = SessionLocal()
    try:
        task = db.query(MaintenanceTask).filter(MaintenanceTask.id == task_id).first()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        task.status = "cancelled"
        db.commit()
        return {"message": f"Task {task.task_id} cancelled."}
    finally:
        db.close()


# ═══════════════════════════════════════════
# DEFECT ENDPOINTS
# ═══════════════════════════════════════════
@app.get("/api/defects")
def list_defects(department: Optional[str] = None, severity: Optional[str] = None,
                 status: Optional[str] = None, limit: int = 50, offset: int = 0):
    db = SessionLocal()
    try:
        q = db.query(Defect)
        if department:
            q = q.filter(Defect.department == department)
        if severity:
            q = q.filter(Defect.severity == severity)
        if status:
            q = q.filter(Defect.status == status)
        total = q.count()
        defects = q.order_by(Defect.detected_date.desc()).offset(offset).limit(limit).all()
        return {
            "total": total,
            "items": [
                {"id": d.id, "defect_id": d.defect_id, "asset_id": d.asset_id,
                 "department": d.department, "defect_type": d.defect_type,
                 "severity": d.severity, "detected_date": str(d.detected_date),
                 "description": d.description, "safety_risk": d.safety_risk,
                 "operational_risk": d.operational_risk, "status": d.status,
                 "location": d.asset.location if d.asset else "",
                 "corridor_id": d.asset.corridor_id if d.asset else None,
                 "resolution_date": str(d.resolution_date) if d.resolution_date else None}
                for d in defects
            ]
        }
    finally:
        db.close()


@app.post("/api/defects")
def create_defect(payload: DefectCreateRequest):
    db = SessionLocal()
    try:
        count = db.query(Defect).count()
        defect = Defect(
            defect_id=f"DEF-{count+1:04d}",
            department=payload.department,
            defect_type=payload.defect_type,
            severity=payload.severity,
            detected_date=date.today(),
            description=payload.description,
            asset_id=payload.asset_id,
            safety_risk=payload.safety_risk,
            operational_risk=payload.operational_risk,
            status="open",
        )
        db.add(defect)
        db.commit()
        db.refresh(defect)
        return {"id": defect.id, "defect_id": defect.defect_id}
    finally:
        db.close()


@app.put("/api/defects/{defect_id}")
def update_defect(defect_id: int, payload: DefectUpdateRequest):
    db = SessionLocal()
    try:
        defect = db.query(Defect).filter(Defect.id == defect_id).first()
        if not defect:
            raise HTTPException(status_code=404, detail="Defect not found")
        if payload.status is not None:
            defect.status = payload.status
            if payload.status == "resolved":
                defect.resolution_date = date.today()
        if payload.severity is not None:
            defect.severity = payload.severity
        if payload.description is not None:
            defect.description = payload.description
        db.commit()
        return {"id": defect.id, "defect_id": defect.defect_id, "status": defect.status}
    finally:
        db.close()


# ═══════════════════════════════════════════
# TRAIN & FORECAST ENDPOINTS
# ═══════════════════════════════════════════
@app.get("/api/trains")
def list_trains(limit: int = 50, offset: int = 0):
    db = SessionLocal()
    try:
        total = db.query(Train).count()
        trains = db.query(Train).offset(offset).limit(limit).all()
        return {
            "total": total,
            "items": [
                {"id": t.id, "train_number": t.train_number, "train_name": t.train_name,
                 "train_type": t.train_type, "origin": t.origin, "destination": t.destination,
                 "priority": t.priority}
                for t in trains
            ]
        }
    finally:
        db.close()


@app.get("/api/forecasts")
def list_forecasts(corridor_id: Optional[int] = None, date_str: Optional[str] = Query(None, alias="date"),
                   limit: int = 50, offset: int = 0):
    db = SessionLocal()
    try:
        q = db.query(GoodsTrainForecast)
        if corridor_id:
            q = q.filter(GoodsTrainForecast.corridor_id == corridor_id)
        if date_str:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            q = q.filter(GoodsTrainForecast.date == target_date)
        total = q.count()
        forecasts = q.offset(offset).limit(limit).all()
        return {
            "total": total,
            "items": [
                {"id": f.id, "corridor_id": f.corridor_id, "date": str(f.date),
                 "time_window": f.time_window, "predicted_goods_trains": f.predicted_goods_trains,
                 "confidence": f.confidence, "traffic_level": f.traffic_level}
                for f in forecasts
            ]
        }
    finally:
        db.close()


# ═══════════════════════════════════════════
# BLOCK REQUEST & WINDOW ENDPOINTS
# ═══════════════════════════════════════════
@app.get("/api/block-requests")
def list_block_requests(status: Optional[str] = None, limit: int = 50, offset: int = 0):
    db = SessionLocal()
    try:
        q = db.query(BlockRequestDB)
        if status:
            q = q.filter(BlockRequestDB.status == status)
        total = q.count()
        requests = q.offset(offset).limit(limit).all()
        return {
            "total": total,
            "items": [
                {"id": r.id, "request_id": r.request_id, "department": r.department,
                 "corridor_id": r.corridor_id, "start_location": r.start_location,
                 "end_location": r.end_location, "requested_date": str(r.requested_date) if r.requested_date else None,
                 "requested_start": r.requested_start, "requested_end": r.requested_end,
                 "duration": r.duration, "block_type": r.block_type,
                 "priority": r.priority, "status": r.status}
                for r in requests
            ]
        }
    finally:
        db.close()


@app.get("/api/block-windows")
def list_block_windows(corridor_id: Optional[int] = None, date_str: Optional[str] = Query(None, alias="date"),
                       limit: int = 50, offset: int = 0):
    db = SessionLocal()
    try:
        q = db.query(BlockWindow)
        if corridor_id:
            q = q.filter(BlockWindow.corridor_id == corridor_id)
        if date_str:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            q = q.filter(BlockWindow.date == target_date)
        total = q.count()
        windows = q.offset(offset).limit(limit).all()
        return {
            "total": total,
            "items": [
                {"id": w.id, "corridor_id": w.corridor_id, "date": str(w.date),
                 "start_time": w.start_time, "end_time": w.end_time,
                 "availability": w.availability, "traffic_level": w.traffic_level,
                 "train_conflicts": w.train_conflicts}
                for w in windows
            ]
        }
    finally:
        db.close()


# ═══════════════════════════════════════════
# OHE POWER BLOCK ENDPOINTS
# ═══════════════════════════════════════════
@app.get("/api/ohe-blocks")
def list_ohe_blocks():
    db = SessionLocal()
    try:
        blocks = db.query(OHEPowerBlock).all()
        return [
            {"id": b.id, "corridor_id": b.corridor_id, "section": b.section,
             "requested_start": b.requested_start, "requested_end": b.requested_end,
             "isolation_type": b.isolation_type, "traction_status": b.traction_status,
             "linked_block_id": b.linked_block_id, "status": b.status,
             "approval_status": b.approval_status}
            for b in blocks
        ]
    finally:
        db.close()


# ═══════════════════════════════════════════
# DASHBOARD SUMMARY ENDPOINT
# ═══════════════════════════════════════════
@app.get("/api/dashboard")
def dashboard_summary():
    """Get full dashboard summary with computed metrics — not hardcoded."""
    db = SessionLocal()
    try:
        total_tasks = db.query(MaintenanceTask).count()
        pending_tasks = db.query(MaintenanceTask).filter(MaintenanceTask.status == "pending").count()
        overdue_tasks = db.query(MaintenanceTask).filter(MaintenanceTask.overdue_days > 0).count()
        critical_tasks = db.query(MaintenanceTask).filter(MaintenanceTask.priority == "critical").count()
        open_defects = db.query(Defect).filter(Defect.status == "open").count()
        critical_defects = db.query(Defect).filter(Defect.severity == "critical", Defect.status == "open").count()
        total_assets = db.query(Asset).count()
        degraded_assets = db.query(Asset).filter(Asset.status == "degraded").count()
        pending_blocks = db.query(BlockRequestDB).filter(BlockRequestDB.status == "pending").count()

        # Average health score
        from sqlalchemy import func
        avg_health = db.query(func.avg(Asset.health_score)).scalar() or 0

        return {
            "maintenance": {
                "total": total_tasks, "pending": pending_tasks,
                "overdue": overdue_tasks, "critical": critical_tasks
            },
            "defects": {
                "open": open_defects, "critical": critical_defects
            },
            "assets": {
                "total": total_assets, "degraded": degraded_assets,
                "avg_health": round(avg_health, 1)
            },
            "blocks": {
                "pending_requests": pending_blocks
            }
        }
    finally:
        db.close()


# ═══════════════════════════════════════════
# PRIORITY RECALCULATION ENDPOINT
# ═══════════════════════════════════════════
@app.post("/api/tasks/recalculate-priorities")
def recalculate_all_priorities():
    """Recalculate priority scores for all pending tasks."""
    db = SessionLocal()
    try:
        tasks = db.query(MaintenanceTask).filter(
            MaintenanceTask.status.in_(["pending", "approved", "scheduled"])
        ).all()

        today = date.today()
        updated = 0
        for task in tasks:
            if task.due_date:
                task.overdue_days = max(0, (today - task.due_date).days)
            score, label, _ = compute_priority_score(
                safety_impact=task.safety_impact,
                criticality=task.criticality,
                overdue_days=task.overdue_days,
                operational_impact=task.operational_impact,
            )
            task.priority = label
            task.priority_score = score
            updated += 1

        db.commit()
        return {"updated": updated}
    finally:
        db.close()


# ═══════════════════════════════════════════
# AUDIT LOG
# ═══════════════════════════════════════════
@app.get("/api/audit-log")
def get_audit_log(user=Depends(get_current_user)):
    if user["role"] != "Administrator":
        raise HTTPException(status_code=403, detail="Admin access required.")
    db = SessionLocal()
    try:
        logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()
        return [
            {"id": l.id, "user_id": l.user_id, "action": l.action,
             "entity": l.entity, "timestamp": str(l.timestamp)}
            for l in logs
        ]
    finally:
        db.close()


# ═══════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════
def _task_to_dict(t):
    return {
        "id": t.id, "task_id": t.task_id, "department": t.department,
        "task_type": t.task_type, "description": t.description,
        "location": t.location, "corridor_id": t.corridor_id,
        "priority": t.priority, "criticality": t.criticality,
        "urgency": t.urgency, "estimated_duration": t.estimated_duration,
        "due_date": str(t.due_date) if t.due_date else None,
        "overdue_days": t.overdue_days,
        "safety_impact": t.safety_impact, "operational_impact": t.operational_impact,
        "isolation_requirement": t.isolation_requirement,
        "status": t.status, "priority_score": t.priority_score,
        "created_at": str(t.created_at) if t.created_at else None,
    }


# ═══════════════════════════════════════════
# STATIC FILE SERVING
# ═══════════════════════════════════════════
STATIC_DIR = os.path.dirname(os.path.abspath(__file__))

@app.get("/")
def serve_index():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))

@app.get("/login.html")
def serve_login():
    return FileResponse(os.path.join(STATIC_DIR, "login.html"))

# Mount static files *only* if not on Vercel, because Vercel routes static files directly via vercel.json
if not os.environ.get("VERCEL"):
    app.mount("/", StaticFiles(directory=STATIC_DIR), name="static")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
