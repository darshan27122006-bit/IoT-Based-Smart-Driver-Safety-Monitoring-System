import os
import json
import sqlite3
import socket
import logging
from datetime import datetime, timezone
from urllib.parse import urlparse
from typing import Optional, List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self):
        # Default to development-mode so operations never hang or fail
        self.mode: str = "development-mode"
        self.mongo_client: Optional[AsyncIOMotorClient] = None
        self.mongo_db = None
        self.sqlite_path = os.path.join(os.path.dirname(__file__), "dev_storage.db")
        self._init_sqlite_schema()

    def _get_sqlite_conn(self):
        conn = sqlite3.connect(self.sqlite_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_sqlite_schema(self):
        conn = self._get_sqlite_conn()
        try:
            with conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS sensor_data (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        device_id TEXT,
                        driver_id TEXT,
                        trip_id TEXT,
                        timestamp TEXT,
                        speed_kmh REAL,
                        acceleration_x REAL,
                        acceleration_y REAL,
                        acceleration_z REAL,
                        gyroscope_x REAL,
                        gyroscope_y REAL,
                        gyroscope_z REAL,
                        latitude REAL,
                        longitude REAL,
                        braking_intensity REAL,
                        throttle_intensity REAL,
                        road_condition TEXT,
                        raw_data TEXT
                    )
                """)
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS trips (
                        trip_id TEXT PRIMARY KEY,
                        driver_id TEXT,
                        start_time TEXT,
                        end_time TEXT,
                        last_updated TEXT,
                        safety_score REAL DEFAULT 100.0,
                        classification TEXT DEFAULT 'SAFE',
                        event_count INTEGER DEFAULT 0,
                        distance_km REAL DEFAULT 0.0,
                        avg_speed REAL DEFAULT 0.0,
                        max_speed REAL DEFAULT 0.0
                    )
                """)
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS events (
                        event_id TEXT PRIMARY KEY,
                        driver_id TEXT,
                        trip_id TEXT,
                        timestamp TEXT,
                        event_type TEXT,
                        severity TEXT,
                        latitude REAL,
                        longitude REAL,
                        speed_kmh REAL,
                        sensor_values TEXT
                    )
                """)
        finally:
            conn.close()

    def _can_connect_tcp(self, uri: str, timeout: float = 0.5) -> bool:
        try:
            parsed = urlparse(uri)
            host = parsed.hostname or "localhost"
            port = parsed.port or 27017
            with socket.create_connection((host, port), timeout=timeout):
                return True
        except Exception:
            return False

    async def connect(self):
        # Quick TCP probe to avoid 30-second Motor driver timeout
        if not self._can_connect_tcp(settings.mongodb_uri, timeout=0.5):
            self.mode = "development-mode"
            self.mongo_client = None
            self.mongo_db = None
            logger.info("MongoDB port unreachable. Running in development-mode (SQLite fallback).")
            return

        try:
            client = AsyncIOMotorClient(settings.mongodb_uri, serverSelectionTimeoutMS=1000)
            await client.admin.command('ping')
            self.mongo_client = client
            self.mongo_db = client[settings.database_name]
            self.mode = "connected"
            logger.info(f"Connected to MongoDB at {settings.mongodb_uri} (database: {settings.database_name})")
        except Exception as e:
            self.mode = "development-mode"
            self.mongo_client = None
            self.mongo_db = None
            logger.warning(f"MongoDB connection ping failed: {e}. Using development-mode (SQLite fallback).")

    async def close(self):
        if self.mongo_client:
            self.mongo_client.close()
            logger.info("MongoDB connection closed")

    def get_status(self) -> str:
        return self.mode

    # SENSOR DATA
    async def insert_sensor_data(self, data: dict):
        if self.mode == "connected" and self.mongo_db is not None:
            doc = dict(data)
            await self.mongo_db["sensor_data"].insert_one(doc)
            return str(doc.get("_id", ""))
        else:
            conn = self._get_sqlite_conn()
            try:
                with conn:
                    ts = data.get("timestamp") or datetime.now(timezone.utc).isoformat()
                    cur = conn.execute("""
                        INSERT INTO sensor_data (
                            device_id, driver_id, trip_id, timestamp,
                            speed_kmh, acceleration_x, acceleration_y, acceleration_z,
                            gyroscope_x, gyroscope_y, gyroscope_z,
                            latitude, longitude, braking_intensity, throttle_intensity,
                            road_condition, raw_data
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        data.get("device_id") or data.get("vehicle_id", "ESP32-001"),
                        data.get("driver_id", "DRV001"),
                        data.get("trip_id", "TRIP001"),
                        str(ts),
                        float(data.get("speed_kmh", 0.0)),
                        float(data.get("acceleration_x", 0.0)),
                        float(data.get("acceleration_y", 0.0)),
                        float(data.get("acceleration_z", 0.0)),
                        float(data.get("gyroscope_x", 0.0)),
                        float(data.get("gyroscope_y", 0.0)),
                        float(data.get("gyroscope_z", 0.0)),
                        float(data.get("latitude", 0.0)),
                        float(data.get("longitude", 0.0)),
                        float(data.get("braking_intensity", 0.0)),
                        float(data.get("throttle_intensity", 0.0)),
                        data.get("road_condition"),
                        json.dumps(data)
                    ))
                    return str(cur.lastrowid)
            finally:
                conn.close()

    async def get_latest_sensor_data(self) -> Optional[dict]:
        if self.mode == "connected" and self.mongo_db is not None:
            doc = await self.mongo_db["sensor_data"].find_one({}, sort=[("timestamp", -1)])
            if doc:
                doc["_id"] = str(doc["_id"])
            return doc
        else:
            conn = self._get_sqlite_conn()
            try:
                row = conn.execute("SELECT * FROM sensor_data ORDER BY id DESC LIMIT 1").fetchone()
                if row:
                    item = dict(row)
                    item["_id"] = str(item.pop("id"))
                    return item
                return None
            finally:
                conn.close()

    async def get_recent_sensor_data(self, trip_id: Optional[str] = None, limit: int = 50) -> List[dict]:
        if self.mode == "connected" and self.mongo_db is not None:
            query = {"trip_id": trip_id} if trip_id else {}
            cursor = self.mongo_db["sensor_data"].find(query).sort("timestamp", -1).limit(limit)
            docs = await cursor.to_list(limit)
            for d in docs:
                d["_id"] = str(d["_id"])
            return list(reversed(docs))
        else:
            conn = self._get_sqlite_conn()
            try:
                if trip_id:
                    rows = conn.execute("SELECT * FROM sensor_data WHERE trip_id = ? ORDER BY id DESC LIMIT ?", (trip_id, limit)).fetchall()
                else:
                    rows = conn.execute("SELECT * FROM sensor_data ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
                items = []
                for r in reversed(rows):
                    it = dict(r)
                    it["_id"] = str(it.pop("id"))
                    items.append(it)
                return items
            finally:
                conn.close()

    # EVENTS
    async def insert_events(self, events: List[dict]):
        if not events:
            return
        if self.mode == "connected" and self.mongo_db is not None:
            events_copy = [dict(e) for e in events]
            await self.mongo_db["events"].insert_many(events_copy)
        else:
            conn = self._get_sqlite_conn()
            try:
                with conn:
                    for e in events:
                        ts = e.get("timestamp") or datetime.now(timezone.utc).isoformat()
                        conn.execute("""
                            INSERT OR REPLACE INTO events (
                                event_id, driver_id, trip_id, timestamp,
                                event_type, severity, latitude, longitude,
                                speed_kmh, sensor_values
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            str(e.get("event_id")),
                            str(e.get("driver_id", "")),
                            str(e.get("trip_id", "")),
                            str(ts),
                            str(e.get("event_type", "")),
                            str(e.get("severity", "LOW")),
                            float(e.get("latitude", 0.0)),
                            float(e.get("longitude", 0.0)),
                            float(e.get("sensor_values", {}).get("speed_kmh", 0.0) if isinstance(e.get("sensor_values"), dict) else 0.0),
                            json.dumps(e.get("sensor_values", {}))
                        ))
            finally:
                conn.close()

    async def get_events(self, limit: int = 50, event_type: Optional[str] = None, severity: Optional[str] = None, driver_id: Optional[str] = None, trip_id: Optional[str] = None) -> List[dict]:
        if self.mode == "connected" and self.mongo_db is not None:
            query = {}
            if event_type: query["event_type"] = event_type
            if severity: query["severity"] = severity
            if driver_id: query["driver_id"] = driver_id
            if trip_id: query["trip_id"] = trip_id
            docs = await self.mongo_db["events"].find(query).sort("timestamp", -1).limit(limit).to_list(limit)
            for d in docs:
                d["_id"] = str(d.get("_id", d.get("event_id", "")))
            return docs
        else:
            conn = self._get_sqlite_conn()
            try:
                sql = "SELECT * FROM events WHERE 1=1"
                params = []
                if event_type:
                    sql += " AND event_type = ?"
                    params.append(event_type)
                if severity:
                    sql += " AND severity = ?"
                    params.append(severity)
                if driver_id:
                    sql += " AND driver_id = ?"
                    params.append(driver_id)
                if trip_id:
                    sql += " AND trip_id = ?"
                    params.append(trip_id)
                sql += " ORDER BY timestamp DESC LIMIT ?"
                params.append(limit)

                rows = conn.execute(sql, params).fetchall()
                results = []
                for r in rows:
                    it = dict(r)
                    it["_id"] = it.get("event_id")
                    if "sensor_values" in it and isinstance(it["sensor_values"], str):
                        try:
                            it["sensor_values"] = json.loads(it["sensor_values"])
                        except Exception:
                            pass
                    results.append(it)
                return results
            finally:
                conn.close()

    async def count_events(self) -> int:
        if self.mode == "connected" and self.mongo_db is not None:
            return await self.mongo_db["events"].count_documents({})
        else:
            conn = self._get_sqlite_conn()
            try:
                row = conn.execute("SELECT COUNT(*) AS cnt FROM events").fetchone()
                return row["cnt"] if row else 0
            finally:
                conn.close()

    async def get_events_breakdown(self) -> Dict[str, int]:
        if self.mode == "connected" and self.mongo_db is not None:
            pipeline = [{"$group": {"_id": "$event_type", "count": {"$sum": 1}}}]
            agg = await self.mongo_db["events"].aggregate(pipeline).to_list(100)
            return {item["_id"]: item["count"] for item in agg if item.get("_id")}
        else:
            conn = self._get_sqlite_conn()
            try:
                rows = conn.execute("SELECT event_type, COUNT(*) as count FROM events GROUP BY event_type").fetchall()
                return {r["event_type"]: r["count"] for r in rows if r["event_type"]}
            finally:
                conn.close()

    # TRIPS
    async def upsert_trip(self, trip_id: str, driver_id: str, timestamp: str, safety_score: float, classification: str, speed_kmh: float = 0.0, event_count_increment: int = 0):
        if self.mode == "connected" and self.mongo_db is not None:
            trip = await self.mongo_db["trips"].find_one({"trip_id": trip_id})
            max_speed = max(trip.get("max_speed", 0.0), speed_kmh) if trip else speed_kmh
            update_doc = {
                "$set": {
                    "driver_id": driver_id,
                    "safety_score": safety_score,
                    "classification": classification,
                    "last_updated": timestamp,
                    "end_time": timestamp,
                    "max_speed": max_speed
                },
                "$setOnInsert": {
                    "start_time": timestamp
                }
            }
            if event_count_increment > 0:
                update_doc["$inc"] = {"event_count": event_count_increment}
            await self.mongo_db["trips"].update_one({"trip_id": trip_id}, update_doc, upsert=True)
        else:
            conn = self._get_sqlite_conn()
            try:
                with conn:
                    cur = conn.execute("SELECT * FROM trips WHERE trip_id = ?", (trip_id,)).fetchone()
                    if cur:
                        new_event_count = cur["event_count"] + event_count_increment
                        new_max_speed = max(cur["max_speed"] or 0.0, speed_kmh)
                        conn.execute("""
                            UPDATE trips SET
                                driver_id = ?,
                                last_updated = ?,
                                end_time = ?,
                                safety_score = ?,
                                classification = ?,
                                event_count = ?,
                                max_speed = ?
                            WHERE trip_id = ?
                        """, (driver_id, timestamp, timestamp, safety_score, classification, new_event_count, new_max_speed, trip_id))
                    else:
                        conn.execute("""
                            INSERT INTO trips (
                                trip_id, driver_id, start_time, end_time, last_updated,
                                safety_score, classification, event_count, max_speed, avg_speed
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (trip_id, driver_id, timestamp, timestamp, timestamp, safety_score, classification, event_count_increment, speed_kmh, speed_kmh))
            finally:
                conn.close()

    async def get_trip(self, trip_id: str) -> Optional[dict]:
        if self.mode == "connected" and self.mongo_db is not None:
            trip = await self.mongo_db["trips"].find_one({"trip_id": trip_id})
            if trip:
                trip["_id"] = str(trip["_id"])
            return trip
        else:
            conn = self._get_sqlite_conn()
            try:
                row = conn.execute("SELECT * FROM trips WHERE trip_id = ?", (trip_id,)).fetchone()
                if row:
                    d = dict(row)
                    d["_id"] = d["trip_id"]
                    return d
                return None
            finally:
                conn.close()

    async def get_trips(self, limit: int = 20) -> List[dict]:
        if self.mode == "connected" and self.mongo_db is not None:
            trips = await self.mongo_db["trips"].find({}).sort("last_updated", -1).limit(limit).to_list(limit)
            for t in trips:
                t["_id"] = str(t["_id"])
            return trips
        else:
            conn = self._get_sqlite_conn()
            try:
                rows = conn.execute("SELECT * FROM trips ORDER BY last_updated DESC LIMIT ?", (limit,)).fetchall()
                results = []
                for r in rows:
                    d = dict(r)
                    d["_id"] = d["trip_id"]
                    results.append(d)
                return results
            finally:
                conn.close()

    async def count_trips(self) -> int:
        if self.mode == "connected" and self.mongo_db is not None:
            return await self.mongo_db["trips"].count_documents({})
        else:
            conn = self._get_sqlite_conn()
            try:
                row = conn.execute("SELECT COUNT(*) AS cnt FROM trips").fetchone()
                return row["cnt"] if row else 0
            finally:
                conn.close()

    async def get_classification_distribution(self) -> Dict[str, int]:
        dist = {"SAFE": 0, "MODERATE": 0, "RISKY": 0}
        trips = await self.get_trips(limit=100)
        for t in trips:
            c = t.get("classification", "SAFE")
            if c in dist:
                dist[c] += 1
            else:
                dist[c] = 1
        return dist

db = DatabaseManager()

async def connect_to_mongo():
    await db.connect()

async def close_mongo_connection():
    await db.close()

def get_database():
    return db
