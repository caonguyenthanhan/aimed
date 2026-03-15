import hashlib
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


def main():
    if not (os.environ.get("DATABASE_URL") or "").strip():
        raise RuntimeError("Missing DATABASE_URL")
    db.ensure_auth_schema()

    username = f"verify-{uuid.uuid4().hex[:12]}@local"
    password = uuid.uuid4().hex
    salt = uuid.uuid4().hex
    pwd_hash = hash_password(password, salt)
    user = db.create_user(username, salt, pwd_hash, role="PATIENT")
    user_id = str(user["id"])

    conv = db.create_conversation(user_id, "verify")
    conv_id = str(conv["id"])
    db.append_message(conv_id, "user", "hello")
    db.append_message(conv_id, "assistant", "world")

    before = db.offboard_user_data(user_id)
    after = db.offboard_user_data(user_id)

    if int(before.get("conversations_deleted") or 0) < 1:
        raise RuntimeError(f"Expected conversations_deleted >= 1, got {before}")
    if int(before.get("messages_deleted") or 0) < 2:
        raise RuntimeError(f"Expected messages_deleted >= 2, got {before}")
    if int(after.get("conversations_deleted") or 0) != 0 or int(after.get("messages_deleted") or 0) != 0:
        raise RuntimeError(f"Expected zero after second offboarding, got {after}")

    with db.db_connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM conversations WHERE user_id = %s", (user_id,))
            if int(cur.fetchone()[0] or 0) != 0:
                raise RuntimeError("Conversations still exist after offboarding")
            cur.execute("SELECT COUNT(*) FROM user_consents WHERE user_id = %s", (user_id,))
            if int(cur.fetchone()[0] or 0) != 0:
                raise RuntimeError("Consents still exist after offboarding")

    print("OK verify_offboarding")


if __name__ == "__main__":
    main()
