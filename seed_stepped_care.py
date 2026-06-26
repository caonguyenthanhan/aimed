# -*- coding: utf-8 -*-
import os
import sys
import json
import uuid
import subprocess

# Ensure stdout uses utf-8 on Windows
if sys.platform.startswith("win"):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

def ensure_dependencies():
    dependencies = ["psycopg2-binary"]
    for dep in dependencies:
        try:
            __import__(dep.replace("-", "_"))
        except ImportError:
            print(f"[INFO] Installing missing dependency: {dep}...")
            try:
                subprocess.run([sys.executable, "-m", "pip", "install", dep], check=True)
            except Exception as e:
                print(f"[ERROR] Failed to install dependency {dep}: {e}")
                sys.exit(1)

ensure_dependencies()

import psycopg2

def load_database_url():
    paths = [
        "medical-consultation-app/.env",
        "medical-consultation-app/.env.local",
        "cpu_server/.env"
    ]
    env_vars = {}
    for path in paths:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        k, v = line.split("=", 1)
                        v = v.strip("'\"")
                        env_vars[k.strip()] = v.strip()
                        
    # Priority of connection strings
    candidates = [
        "DATABASE_URL",
        "POSTGRES_URL",
        "POSTGRES_PRISMA_URL",
        "DATABASE_URL_UNPOOLED",
        "POSTGRES_URL_NON_POOLING"
    ]
    for c in candidates:
        if env_vars.get(c):
            # Strip simple sslmode parameters if present for compatibility
            url = env_vars[c]
            return url
            
    return None

def main():
    print("======================================================================")
    print("AIMed Stepped Care Seeder Starting...")
    print("======================================================================")
    
    db_url = load_database_url()
    if not db_url:
        print("[ERROR] DATABASE_URL not found in environment or .env files!")
        sys.exit(1)
        
    print(f"Connecting to database...")
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        print("[SUCCESS] Database connected successfully.")
    except Exception as e:
        print(f"[ERROR] Connection failed: {e}")
        sys.exit(1)
        
    # Step 1: Find an existing user_id or use fallback
    try:
        cur.execute("SELECT DISTINCT user_id FROM conversations LIMIT 5;")
        rows = cur.fetchall()
        if rows and rows[0][0]:
            user_id = rows[0][0]
            print(f"Using existing user_id found in database: {user_id}")
        else:
            user_id = str(uuid.uuid4())
            print(f"No existing user_id found. Generated a new user_id: {user_id}")
    except Exception as e:
        user_id = str(uuid.uuid4())
        print(f"Failed to fetch existing user_id: {e}. Generated new user_id: {user_id}")
        conn.rollback()

    # Step 2: Define stepped care conversations
    sc_conversations = [
        {
            "id": "d1111111-1111-1111-1111-111111111111",
            "title": "Cấp 1 - Giáo dục tâm lý (Psychoeducation)",
            "messages": [
                ("user", "Tôi cảm thấy dạo này đầu óc căng thẳng, khó tập trung, có cách nào thư giãn đầu óc không?"),
                ("assistant", "Chào bạn, tình trạng căng thẳng và khó tập trung rất phổ biến khi cơ thể mệt mỏi hoặc chịu áp lực kéo dài. Để hỗ trợ bạn lập tức, hệ thống khuyên bạn nên thực hiện bài tập thiền định ngắn (Mindfulness Meditation) giúp điều hòa nhịp thở và làm dịu hệ thần kinh.\n\nDưới đây là video hướng dẫn thiền thư giãn đầu óc mà bạn có thể thực hiện ngay tại nhà:")
            ]
        },
        {
            "id": "d2222222-2222-2222-2222-222222222222",
            "title": "Cấp 2 - Kích hoạt hành vi (CBT BA)",
            "messages": [
                ("user", "Dạo này tôi bị trầm cảm nhẹ, không muốn làm gì cả, suốt ngày chỉ nằm một chỗ."),
                ("assistant", "Chào bạn, tôi rất chia sẻ với trạng thái mệt mỏi mà bạn đang trải qua. Khi tâm trạng đi xuống, chúng ta dễ có xu hướng cô lập bản thân, ngắt các hoạt động và dẫn đến vòng lặp trầm cảm nặng hơn. Trong trị liệu nhận thức hành vi (CBT), kỹ thuật Kích hoạt hành vi (Behavioral Activation) là giải pháp giúp bạn phá vỡ vòng lặp này bằng những bước đi nhỏ nhất. Tôi đề xuất cho bạn 1 lịch trình hoạt động vi mô tăng dần dưới đây để bạn thực hiện từng bước:")
            ]
        },
        {
            "id": "d3333333-3333-3333-3333-333333333333",
            "title": "Cấp 3 - Trị liệu thấu cảm CBT",
            "messages": [
                ("user", "Tôi cảm thấy mình là một kẻ thất bại, làm việc gì cũng hỏng và là gánh nặng cho mọi người."),
                ("assistant", "Tôi nghe và hiểu cảm giác nặng nề bạn đang trải qua lúc này. Khi đối diện với áp lực lớn, tâm trí chúng ta thường có xu hướng bóp méo nhận thức (Cognitive Distortions), tự động gắn mác bản thân là 'kẻ thất bại' hay 'gánh nặng'. Nhưng hãy nhớ rằng, một vài kết quả không như ý muốn không định nghĩa giá trị toàn bộ con người bạn. Bạn có muốn cùng tôi thử thách những suy nghĩ tiêu cực này bằng cách nhìn nhận lại 3 điều nhỏ bé bạn đã hoàn thành tốt trong tuần qua không? Tôi luôn ở đây lắng nghe bạn.")
            ]
        },
        {
            "id": "d4444444-4444-4444-4444-444444444444",
            "title": "Cấp 4 - Chốt chặn an toàn SOS",
            "messages": [
                ("user", "Tôi không muốn sống nữa, cuộc sống này quá bế tắc, tôi muốn kết liễu đời mình ngay bây giờ"),
                ("assistant", "Mình nghe bạn đang ở trong trạng thái rất khó chịu. Vì an toàn của bạn, mình không thể hỗ trợ nội dung liên quan đến tự làm hại bản thân. Nếu bạn đang có ý định hoặc cảm thấy có thể làm hại bản thân ngay lúc này, xin vui lòng liên hệ ngay với các đường dây cứu trợ khẩn cấp dưới đây:")
            ]
        }
    ]

    # Step 3: Insert sessions and messages
    try:
        for conv in sc_conversations:
            cid = conv["id"]
            title = conv["title"]
            
            print(f"Seeding '{title}' (ID: {cid})...")
            
            # Upsert conversation
            cur.execute("""
                INSERT INTO conversations (id, user_id, title, created_at, last_active)
                VALUES (%s, %s, %s, NOW(), NOW())
                ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, last_active = NOW();
            """, (cid, user_id, title))
            
            # Delete old messages
            cur.execute("DELETE FROM conversation_messages WHERE conv_id = %s;", (cid,))
            
            # Insert messages
            for role, content in conv["messages"]:
                cur.execute("""
                    INSERT INTO conversation_messages (conv_id, role, content, created_at)
                    VALUES (%s, %s, %s, NOW());
                """, (cid, role, content))
                
        conn.commit()
        print("\n======================================================================")
        print("[SUCCESS] Seeding completed successfully!")
        print(f"Assigned User ID: {user_id}")
        print("======================================================================")
        print("BƯỚC TIẾP THEO ĐỂ CHỤP ẢNH MINH CHỨNG:")
        print("1. Chạy frontend Next.js (nếu chưa chạy): npm run dev")
        print("2. Để hiển thị các cuộc hội thoại này trên danh sách chat, bạn cần thiết lập User ID.")
        print(f"   Mở F12 Console trên trình duyệt và gõ lệnh sau:")
        print(f"   localStorage.setItem('userId', '{user_id}')")
        print("3. Tải lại trang chat, 4 cuộc hội thoại Stepped Care sẽ xuất hiện trong thanh bên cạnh.")
        print("4. Nhấp vào từng cuộc hội thoại để hiển thị lịch sử chat và chụp màn hình.")
        print("======================================================================")
        
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Failed to seed database: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()
