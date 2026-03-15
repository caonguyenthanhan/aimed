import hashlib
import json
import os
import sys
import uuid

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from cpu_server import db

def _load_dotenv_file(path: str) -> None:
    try:
        if not path or not os.path.exists(path):
            return
        with open(path, "r", encoding="utf-8") as f:
            for raw in f:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                key = k.strip()
                val = v.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = val
    except Exception:
        return


_load_dotenv_file(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env")))


def hash_password(password: str, salt: str) -> str:
    p = (password or "").encode("utf-8")
    s = (salt or "").encode("utf-8")
    dk = hashlib.pbkdf2_hmac("sha256", p, s, 120000, dklen=32)
    return dk.hex()


def ensure_user(username: str, password: str, role: str):
    existing = db.get_user_by_username(username)
    if existing:
        return existing, False
    salt = uuid.uuid4().hex
    pwd_hash = hash_password(password, salt)
    user = db.create_user(username, salt, pwd_hash, role=role)
    return user, True


def seed_demo():
    if not (os.environ.get("DATABASE_URL") or "").strip():
        raise RuntimeError("Missing DATABASE_URL")

    db.ensure_auth_schema()
    db.ensure_knowledge_schema()
    db.ensure_clinical_memory_schema()

    demo_admin_user = os.environ.get("DEMO_ADMIN_USERNAME", "demo-admin")
    demo_admin_pass = os.environ.get("DEMO_ADMIN_PASSWORD", "DemoAdmin123!")
    demo_doctor_user = os.environ.get("DEMO_DOCTOR_USERNAME", "demo-doctor")
    demo_doctor_pass = os.environ.get("DEMO_DOCTOR_PASSWORD", "DemoDoctor123!")
    demo_patient_user = os.environ.get("DEMO_PATIENT_USERNAME", "demo-patient")
    demo_patient_pass = os.environ.get("DEMO_PATIENT_PASSWORD", "DemoPatient123!")

    admin, _ = ensure_user(demo_admin_user, demo_admin_pass, "ADMIN")
    doctor, _ = ensure_user(demo_doctor_user, demo_doctor_pass, "DOCTOR")
    patient, _ = ensure_user(demo_patient_user, demo_patient_pass, "PATIENT")

    db.set_consent(str(patient["id"]), share_scores=True, share_chat_content=False)

    conv = db.create_conversation(str(patient["id"]), "Demo: Mất ngủ và lo âu")
    conv_id = str(conv["id"])
    db.append_message(conv_id, "user", "Dạo này tôi mất ngủ, hay lo âu và khó tập trung.")
    db.append_message(conv_id, "assistant", "Tôi hiểu. Bạn có thể cho biết tình trạng này kéo dài bao lâu và có dùng cà phê/rượu bia gần đây không?")
    db.append_message(conv_id, "user", "Khoảng 3 tuần. Tôi có uống cà phê chiều và đôi lúc uống bia.")
    db.append_message(conv_id, "assistant", "Bạn có thể thử hít thở 4-7-8 trước giờ ngủ, hạn chế cà phê sau 14h và theo dõi giấc ngủ. Nếu có ý nghĩ tự làm hại bản thân, cần tìm hỗ trợ khẩn cấp.")

    summary = (
        "Lý do: mất ngủ kèm lo âu 3 tuần.\n"
        "Triệu chứng: khó ngủ, lo lắng, khó tập trung.\n"
        "Yếu tố liên quan: cà phê buổi chiều, đôi lúc uống bia.\n"
        "Can thiệp đề xuất: kỹ thuật hít thở 4-7-8, vệ sinh giấc ngủ, hạn chế chất kích thích.\n"
        "An toàn: nhắc tìm hỗ trợ khẩn cấp nếu có ý nghĩ tự hại."
    )
    meta = {"demo": True, "consent": {"share_scores": True, "share_chat_content": False}}
    db.upsert_conversation_summary(conv_id, summary, meta)

    return {
        "ok": True,
        "users": {
            "admin": {"username": demo_admin_user, "password": demo_admin_pass, "role": "ADMIN"},
            "doctor": {"username": demo_doctor_user, "password": demo_doctor_pass, "role": "DOCTOR"},
            "patient": {"username": demo_patient_user, "password": demo_patient_pass, "role": "PATIENT"},
        },
        "patient_conversation_id": conv_id,
    }


if __name__ == "__main__":
    print(json.dumps(seed_demo(), ensure_ascii=False, indent=2))
