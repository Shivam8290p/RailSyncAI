# RAIL-BLOCK AI: Database Layer
# SQLite + SQLAlchemy ORM for all entity persistence

import os
from datetime import datetime, date, time
from typing import Optional

from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Boolean, Text,
    DateTime, Date, Time, ForeignKey, JSON, Enum as SAEnum
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from sqlalchemy.pool import StaticPool

# ═══════════════════════════════════════════
# DATABASE SETUP
# ═══════════════════════════════════════════
_PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
_BUNDLED_DB = os.path.join(_PROJECT_DIR, "railblock.db")

# On Vercel, filesystem is read-only except /tmp/
# Copy the bundled DB there on cold start
if os.environ.get("VERCEL"):
    import shutil
    DB_PATH = "/tmp/railblock.db"
    if not os.path.exists(DB_PATH) and os.path.exists(_BUNDLED_DB):
        shutil.copy2(_BUNDLED_DB, DB_PATH)
else:
    DB_PATH = _BUNDLED_DB

DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency: yields a DB session, auto-closes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables."""
    Base.metadata.create_all(bind=engine)


# ═══════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════

class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    description = Column(Text, default="")
    color = Column(String(20), default="#38bdf8")


class Corridor(Base):
    __tablename__ = "corridors"
    id = Column(Integer, primary_key=True, autoincrement=True)
    corridor_code = Column(String(20), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    zone = Column(String(50), default="")
    division = Column(String(50), default="")
    start_location = Column(String(100), nullable=False)
    end_location = Column(String(100), nullable=False)
    track_count = Column(Integer, default=2)
    electrified = Column(Boolean, default=True)
    traffic_density = Column(String(20), default="medium")  # low/medium/high/critical
    availability_status = Column(String(20), default="available")


class Asset(Base):
    __tablename__ = "assets"
    id = Column(Integer, primary_key=True, autoincrement=True)
    asset_id = Column(String(50), unique=True, nullable=False)
    asset_type = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    corridor_id = Column(Integer, ForeignKey("corridors.id"), nullable=True)
    location = Column(String(200), default="")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    criticality = Column(String(20), default="medium")  # low/medium/high/critical
    health_score = Column(Float, default=85.0)
    failure_probability = Column(Float, default=0.05)
    last_maintenance = Column(Date, nullable=True)
    next_maintenance_due = Column(Date, nullable=True)
    status = Column(String(20), default="operational")

    corridor = relationship("Corridor", backref="assets")


class Defect(Base):
    __tablename__ = "defects"
    id = Column(Integer, primary_key=True, autoincrement=True)
    defect_id = Column(String(50), unique=True, nullable=False)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True)
    department = Column(String(100), nullable=False)
    defect_type = Column(String(100), nullable=False)
    severity = Column(String(20), default="medium")  # critical/high/medium/low
    detected_date = Column(Date, nullable=False)
    description = Column(Text, default="")
    safety_risk = Column(String(20), default="low")
    operational_risk = Column(String(20), default="low")
    status = Column(String(20), default="open")  # open/in_progress/resolved/deferred
    resolution_date = Column(Date, nullable=True)

    asset = relationship("Asset", backref="defects")


class MaintenanceTask(Base):
    __tablename__ = "maintenance_tasks"
    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(String(50), unique=True, nullable=False)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True)
    department = Column(String(100), nullable=False)
    task_type = Column(String(100), nullable=False)
    description = Column(Text, default="")
    location = Column(String(200), default="")
    corridor_id = Column(Integer, ForeignKey("corridors.id"), nullable=True)
    defect_id = Column(Integer, ForeignKey("defects.id"), nullable=True)
    priority = Column(String(20), default="medium")  # critical/high/medium/low
    criticality = Column(String(20), default="medium")
    urgency = Column(String(20), default="normal")
    estimated_duration = Column(Integer, default=60)  # minutes
    actual_duration = Column(Integer, nullable=True)
    due_date = Column(Date, nullable=True)
    overdue_days = Column(Integer, default=0)
    safety_impact = Column(String(20), default="low")
    operational_impact = Column(String(20), default="low")
    resource_requirements = Column(Text, default="")
    isolation_requirement = Column(Boolean, default=False)
    status = Column(String(30), default="pending")
    # pending/approved/scheduled/in_progress/completed/cancelled
    priority_score = Column(Float, default=50.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    asset = relationship("Asset", backref="maintenance_tasks")
    corridor = relationship("Corridor", backref="maintenance_tasks")
    defect = relationship("Defect", backref="maintenance_tasks")


class Train(Base):
    __tablename__ = "trains"
    id = Column(Integer, primary_key=True, autoincrement=True)
    train_number = Column(String(20), unique=True, nullable=False)
    train_name = Column(String(200), nullable=False)
    train_type = Column(String(50), nullable=False)
    # vande-bharat/rajdhani/superfast/express/passenger/freight
    origin = Column(String(100), default="")
    destination = Column(String(100), default="")
    priority = Column(Integer, default=3)  # 1=highest
    route = Column(Text, default="")  # JSON list of station codes


class TrainSchedule(Base):
    __tablename__ = "train_schedules"
    id = Column(Integer, primary_key=True, autoincrement=True)
    train_id = Column(Integer, ForeignKey("trains.id"), nullable=False)
    corridor_id = Column(Integer, ForeignKey("corridors.id"), nullable=True)
    station_code = Column(String(20), nullable=False)
    date = Column(Date, nullable=True)
    arrival_time = Column(String(10), nullable=True)
    departure_time = Column(String(10), nullable=True)
    direction = Column(String(10), default="up")  # up/down
    expected_delay = Column(Integer, default=0)

    train = relationship("Train", backref="schedules")
    corridor = relationship("Corridor", backref="train_schedules")


class GoodsTrainForecast(Base):
    __tablename__ = "goods_forecasts"
    id = Column(Integer, primary_key=True, autoincrement=True)
    corridor_id = Column(Integer, ForeignKey("corridors.id"), nullable=False)
    date = Column(Date, nullable=False)
    time_window = Column(String(20), nullable=False)  # e.g. "18:00-20:00"
    predicted_goods_trains = Column(Integer, default=0)
    confidence = Column(Float, default=0.7)
    traffic_level = Column(String(20), default="medium")
    forecast_method = Column(String(50), default="historical_average")

    corridor = relationship("Corridor", backref="goods_forecasts")


class BlockRequest(Base):
    __tablename__ = "block_requests"
    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(String(50), unique=True, nullable=False)
    requested_by = Column(String(100), default="")
    department = Column(String(100), nullable=False)
    corridor_id = Column(Integer, ForeignKey("corridors.id"), nullable=True)
    start_location = Column(String(100), nullable=False)
    end_location = Column(String(100), nullable=False)
    requested_date = Column(Date, nullable=True)
    requested_start = Column(String(10), nullable=False)
    requested_end = Column(String(10), nullable=False)
    duration = Column(Integer, default=60)  # minutes
    block_type = Column(String(50), default="traffic")
    isolation_required = Column(Boolean, default=False)
    priority = Column(String(20), default="medium")
    status = Column(String(20), default="pending")  # pending/approved/rejected/scheduled
    task_ids = Column(Text, default="")  # comma-separated task IDs

    corridor = relationship("Corridor", backref="block_requests")


class BlockWindow(Base):
    __tablename__ = "block_windows"
    id = Column(Integer, primary_key=True, autoincrement=True)
    corridor_id = Column(Integer, ForeignKey("corridors.id"), nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(String(10), nullable=False)
    end_time = Column(String(10), nullable=False)
    availability = Column(String(20), default="available")
    traffic_level = Column(String(20), default="low")
    train_conflicts = Column(Integer, default=0)
    freight_forecast = Column(Integer, default=0)
    restrictions = Column(Text, default="")

    corridor = relationship("Corridor", backref="block_windows")


class OptimizedBlock(Base):
    __tablename__ = "optimized_blocks"
    id = Column(Integer, primary_key=True, autoincrement=True)
    block_id = Column(String(50), unique=True, nullable=False)
    corridor_id = Column(Integer, ForeignKey("corridors.id"), nullable=True)
    date = Column(Date, nullable=True)
    start_time = Column(String(10), nullable=False)
    end_time = Column(String(10), nullable=False)
    duration = Column(Integer, default=0)
    departments = Column(Text, default="")  # JSON list
    tasks = Column(Text, default="")  # JSON list of task IDs
    optimization_score = Column(Float, default=0.0)
    ai_confidence = Column(Float, default=0.0)
    train_impact = Column(Integer, default=0)
    downtime_saved = Column(Integer, default=0)
    status = Column(String(20), default="proposed")
    approval_status = Column(String(20), default="pending")

    corridor = relationship("Corridor", backref="optimized_blocks")


class Conflict(Base):
    __tablename__ = "conflicts"
    id = Column(Integer, primary_key=True, autoincrement=True)
    conflict_type = Column(String(50), nullable=False)
    severity = Column(String(20), default="medium")
    affected_tasks = Column(Text, default="")
    affected_trains = Column(Text, default="")
    corridor_id = Column(Integer, ForeignKey("corridors.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    description = Column(Text, default="")
    suggested_resolution = Column(Text, default="")
    status = Column(String(20), default="active")

    corridor = relationship("Corridor", backref="conflicts")


class OHEPowerBlock(Base):
    __tablename__ = "ohe_power_blocks"
    id = Column(Integer, primary_key=True, autoincrement=True)
    corridor_id = Column(Integer, ForeignKey("corridors.id"), nullable=True)
    section = Column(String(100), nullable=False)
    requested_start = Column(String(10), nullable=False)
    requested_end = Column(String(10), nullable=False)
    isolation_type = Column(String(50), default="full")
    traction_status = Column(String(50), default="de-energized")
    linked_block_id = Column(String(50), nullable=True)
    status = Column(String(20), default="pending")
    approval_status = Column(String(20), default="pending")

    corridor = relationship("Corridor", backref="ohe_power_blocks")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), default="system")
    action = Column(String(100), nullable=False)
    entity = Column(String(50), default="")
    entity_id = Column(String(50), default="")
    old_value = Column(Text, default="")
    new_value = Column(Text, default="")
    timestamp = Column(DateTime, default=datetime.utcnow)
