"""
seed_demo_student.py
Populates demo student applications and milestones into standalone SQLite database
so the student workspace displays rich, realistic incubation ventures.
"""

import json
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "standalone_data.sqlite"

STUDENT_IDS = [
    "6ae6f2eabcac8a7c0f6a90ea",  # student@aai-dbit.edu
    "6ae6f2ebbcac8a7c0f6a90ec",  # student@aai-dbitic.edu
    "6acd20b9147c52782b1bf617",  # omkargotawade05@gmail.com
]

def now_iso(offset_days: int = 0) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=offset_days)).isoformat()

def date_str(offset_days: int = 0) -> str:
    return (datetime.now(timezone(timedelta(hours=5, minutes=30))) + timedelta(days=offset_days)).strftime("%Y-%m-%d")

def seed():
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    # Clear existing demo student records if any
    for uid in STUDENT_IDS:
        cursor.execute("SELECT id, startup_id FROM applications WHERE applicant_id = ?", (uid,))
        apps = cursor.fetchall()
        for app_id, s_id in apps:
            cursor.execute("DELETE FROM milestones WHERE startup_id = ?", (s_id,))
            cursor.execute("DELETE FROM application_audit_logs WHERE application_id = ?", (app_id,))
            cursor.execute("DELETE FROM applications WHERE id = ?", (app_id,))
            cursor.execute("DELETE FROM startups WHERE id = ?", (s_id,))

    for uid in STUDENT_IDS:
        suffix = uid[:4]
        # Project 1: AgriSort AI (Approved, Prototype)
        s1_id = f"s1-{suffix}-{uuid.uuid4().hex[:8]}"
        a1_id = f"a1-{suffix}-agrisort" if uid != STUDENT_IDS[0] else "d4ad94d7-362f-4e89-834c-f61d7e8f2810"
        
        cursor.execute(
            """
            INSERT INTO startups (id, user_id, name, tagline, problem, solution, stage, sector, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
            """,
            (
                s1_id, uid, "AgriSort AI",
                "Autonomous computer vision sorting for fresh produce reducing harvest waste.",
                "Post-harvest sorting in rural cooperative centers incurs 35% produce loss due to manual grading inconsistency.",
                "Multi-spectral high-speed camera line running embedded neural network inference on conveyor belts.",
                "prototype", "AgriTech", now_iso(-30), now_iso(-2)
            )
        )

        form_data_1 = {
            "name": "AgriSort AI",
            "shortDescription": "Autonomous computer vision sorting for fresh produce reducing harvest waste.",
            "department": "Computer Engineering",
            "projectType": "Hardware & Embedded AI",
            "domain": "AgriTech",
            "maturity": "PROTOTYPE",
            "problem": "Post-harvest sorting in rural cooperative centers incurs 35% produce loss due to manual grading inconsistency.",
            "affectedUsers": "12,000+ smallholder fruit & onion farmers across Maharashtra cooperatives.",
            "currentSolutions": "Manual visual grading by contract laborers, prone to fatigue and subjective error.",
            "solution": "Multi-spectral high-speed camera line running embedded neural network inference on conveyor belts.",
            "differentiation": "98.4% sorting accuracy at 120 units/minute costing 1/5th of imported European optical graders.",
            "teamMembers": [
                {"id": "tm1", "name": "Aarav Patel", "rollNumber": "DBIT-2023-CS-084", "email": "student@aai-dbit.edu", "inviteStatus": "LEAD"},
                {"id": "tm2", "name": "Pooja Verma", "rollNumber": "DBIT-2023-EXTC-042", "email": "pooja.v@dbit.ac.in", "inviteStatus": "ACCEPTED"}
            ],
            "technologies": ["PyTorch", "NVIDIA Jetson Orin", "OpenCV", "Industrial Automation PLC"],
            "githubUrl": "https://github.com/dbit-incubation/agrisort-core",
            "demoUrl": "https://agrisort-demo.dbit.ac.in",
            "prototypeAvailable": "YES"
        }

        cursor.execute(
            """
            INSERT INTO applications (id, startup_id, applicant_id, status, completeness, eligibility_ok, documents, form_data, ai_summary, ai_feedback, reviewer_id, reviewer_comments, submitted_at, reviewed_at, created_at, updated_at)
            VALUES (?, ?, ?, 'approved', 100, 1, '[]', ?, ?, ?, 'admin-dbit', 'Strong technical baseline and clear cooperative market validation.', ?, ?, ?, ?)
            """,
            (
                a1_id, s1_id, uid, json.dumps(form_data_1),
                "Strong commercial viability with high social impact in rural supply chains. Technical feasibility confirmed through edge prototype.",
                "Recommend expanding field validation to diverse lighting conditions and multi-crop varieties.",
                now_iso(-25), now_iso(-10), now_iso(-30), now_iso(-2)
            )
        )

        # Milestones for AgriSort AI
        cursor.execute(
            """
            INSERT INTO milestones (id, startup_id, title, description, due_date, status, completion_pct, created_by, completed_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'completed', 100, ?, ?, ?, ?)
            """,
            (str(uuid.uuid4()), s1_id, "Edge Camera Benchmarking", "Validate optical latency below 15ms under high-speed conveyor conditions.", date_str(-15), uid, now_iso(-12), now_iso(-28), now_iso(-12))
        )
        cursor.execute(
            """
            INSERT INTO milestones (id, startup_id, title, description, due_date, status, completion_pct, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'in_progress', 75, ?, ?, ?)
            """,
            (str(uuid.uuid4()), s1_id, "Model Quantization & TensorRT Deployment", "Optimize ResNet-50 backbone for INT8 precision on Jetson Orin Nano.", date_str(10), uid, now_iso(-20), now_iso(-1))
        )
        cursor.execute(
            """
            INSERT INTO milestones (id, startup_id, title, description, due_date, status, completion_pct, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'pending', 20, ?, ?, ?)
            """,
            (str(uuid.uuid4()), s1_id, "Nashik APMC Pilot Integration", "Deploy physical sorting station on-site for live onion grading trial.", date_str(35), uid, now_iso(-20), now_iso(-1))
        )

        # Project 2: EcoPack Natural Composites (Under Review, Research)
        s2_id = f"s2-{suffix}-{uuid.uuid4().hex[:8]}"
        a2_id = f"a2-{suffix}-ecopack"
        cursor.execute(
            """
            INSERT INTO startups (id, user_id, name, tagline, problem, solution, stage, sector, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
            """,
            (
                s2_id, uid, "EcoPack Natural Composites",
                "Sugarcane bagasse biodegradable thermal packaging achieving 180-day cycle.",
                "E-commerce thermal insulation rely on non-recyclable expanded polystyrene (EPS) causing severe landfill pollution.",
                "Press-molded agricultural waste fibers with food-grade hydrophobic bio-coating.",
                "research", "GreenTech", now_iso(-14), now_iso(-1)
            )
        )
        form_data_2 = {
            "name": "EcoPack Natural Composites",
            "shortDescription": "Sugarcane bagasse biodegradable thermal packaging achieving 180-day cycle.",
            "department": "Mechanical & Chemical Engineering",
            "projectType": "Materials Science",
            "domain": "GreenTech",
            "maturity": "RESEARCH",
            "problem": "E-commerce thermal insulation rely on non-recyclable expanded polystyrene (EPS) causing severe landfill pollution.",
            "affectedUsers": "Sustainable brands, cold-chain logistics, and food delivery platforms.",
            "currentSolutions": "Expanded polystyrene packaging and bubble wraps.",
            "solution": "Press-molded agricultural waste fibers with food-grade hydrophobic bio-coating.",
            "differentiation": "100% home-compostable in 180 days with equivalent thermal retention (R-value 3.8).",
            "teamMembers": [
                {"id": "tm1", "name": "Aarav Patel", "rollNumber": "DBIT-2023-CS-084", "email": "student@aai-dbit.edu", "inviteStatus": "LEAD"}
            ],
            "technologies": ["Bio-composites", "Hydraulic Hot-Press", "Thermal Insulation Testing"],
            "prototypeAvailable": "NO"
        }
        cursor.execute(
            """
            INSERT INTO applications (id, startup_id, applicant_id, status, completeness, eligibility_ok, documents, form_data, ai_summary, submitted_at, created_at, updated_at)
            VALUES (?, ?, ?, 'under_review', 95, 1, '[]', ?, ?, ?, ?, ?)
            """,
            (
                a2_id, s2_id, uid, json.dumps(form_data_2),
                "Promising sustainable alternative to polystyrene with substantial market demand from FMCG and logistics partners.",
                now_iso(-7), now_iso(-14), now_iso(-1)
            )
        )

        # Project 3: MediSense Wearable ECG (Revision Requested, Idea)
        s3_id = f"s3-{suffix}-{uuid.uuid4().hex[:8]}"
        a3_id = f"a3-{suffix}-medisense"
        cursor.execute(
            """
            INSERT INTO startups (id, user_id, name, tagline, problem, solution, stage, sector, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
            """,
            (
                s3_id, uid, "MediSense Wearable ECG",
                "Continuous arrhythmia screening patch for primary rural health clinics.",
                "Lack of continuous ECG monitors in Primary Health Centres delays cardiac event detection.",
                "3-lead wearable adhesive patch with on-board arrhythmia anomaly detection and Bluetooth sync.",
                "idea", "HealthTech", now_iso(-20), now_iso(-3)
            )
        )
        form_data_3 = {
            "name": "MediSense Wearable ECG",
            "shortDescription": "Continuous arrhythmia screening patch for primary rural health clinics.",
            "department": "Electronics & Telecommunication",
            "projectType": "Biomedical IoT",
            "domain": "HealthTech",
            "maturity": "IDEA",
            "problem": "Lack of continuous ECG monitors in Primary Health Centres delays cardiac event detection.",
            "affectedUsers": "Rural PHCs and elderly patients requiring ambulatory cardiac observation.",
            "currentSolutions": "Bulky 12-lead hospital ECG carts requiring clinical technicians.",
            "solution": "3-lead wearable adhesive patch with on-board arrhythmia anomaly detection and Bluetooth sync.",
            "differentiation": "Sub-$20 device cost with 72-hour battery life and offline signal filtering.",
            "teamMembers": [
                {"id": "tm1", "name": "Aarav Patel", "rollNumber": "DBIT-2023-CS-084", "email": "student@aai-dbit.edu", "inviteStatus": "LEAD"}
            ],
            "technologies": ["Analog Front-End ADS1293", "Nordic nRF52840", "TinyML"],
            "prototypeAvailable": "NO"
        }
        cursor.execute(
            """
            INSERT INTO applications (id, startup_id, applicant_id, status, completeness, eligibility_ok, documents, form_data, ai_summary, reviewer_id, reviewer_comments, submitted_at, reviewed_at, created_at, updated_at)
            VALUES (?, ?, ?, 'revision_requested', 85, 1, '[]', ?, ?, 'faculty-evaluator', 'Please provide clinical safety certification pathway (IEC 60601-1) and clarify dry-electrode impedance testing.', ?, ?, ?, ?)
            """,
            (
                a3_id, s3_id, uid, json.dumps(form_data_3),
                "High clinical need, requires thorough compliance planning for medical device regulation before prototyping.",
                now_iso(-10), now_iso(-3), now_iso(-20), now_iso(-3)
            )
        )

    conn.commit()
    conn.close()
    print("Agent service standalone SQLite seeded successfully!")

if __name__ == "__main__":
    seed()
