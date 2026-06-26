# -*- coding: utf-8 -*-
import json
import requests
import sys

# Ensure stdout uses utf-8 encoding on Windows
if sys.platform.startswith("win"):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

url = "https://aimed-one.vercel.app/api/agent-chat"
access_pass = "kltn2026"
user_id = "test_user_py"
conv_id = "test_conv_py_123"

test_cases = [
    {
        "name": "Default Profile",
        "query": "Xin chào trợ lý y tế",
        "expected_profile": "default"
    },
    {
        "name": "Therapy Profile",
        "query": "Tôi cảm thấy lo âu và mất ngủ kéo dài",
        "expected_profile": "therapy"
    },
    {
        "name": "Triage Profile",
        "query": "Tôi bị đau ngực dữ dội và khó thở",
        "expected_profile": "triage"
    },
    {
        "name": "Medication Profile",
        "query": "Nhức đầu nên uống thuốc gì và liều lượng bao nhiêu?",
        "expected_profile": "medication"
    },
    {
        "name": "Doctor Referral Profile",
        "query": "Tôi muốn tìm một bác sĩ tim mạch giỏi",
        "expected_profile": "doctor_referral"
    },
    {
        "name": "Care Plan Profile",
        "query": "Tôi muốn lên kế hoạch ăn uống giảm cân an toàn",
        "expected_profile": "care_plan"
    }
]

print("==========================================================")
print("Starting Python Agent Profile Tests on: " + url)
print("==========================================================")

for idx, case in enumerate(test_cases):
    print(f"\n[Testing {idx+1}] {case['name']} with query: '{case['query']}'")
    
    payload = {
        "message": case["query"],
        "access_pass": access_pass,
        "user_id": user_id,
        "conversation_id": f"{conv_id}_{idx}",
        "messages": []
    }
    
    headers = {
        "Content-Type": "application/json; charset=utf-8"
    }
    
    try:
        r = requests.post(url, json=payload, headers=headers, timeout=45)
        if r.status_code == 200:
            data = r.json()
            # print(json.dumps(data, indent=2, ensure_ascii=False))
            profile = data.get("metadata", {}).get("profile") or data.get("profile") or "unknown"
            response_text = data.get("response", "") or data.get("text", "")
            actions = data.get("actions", [])
            
            print(f"Status: Success (HTTP 200)")
            print(f"Profile Detected: {profile}")
            print(f"Response preview: {response_text[:150]}...")
            print(f"Actions: {json.dumps(actions, ensure_ascii=False)}")
            
            # Simple check
            if profile == case["expected_profile"] or (case["expected_profile"] == "default" and profile in ("default", "unknown", None)):
                print("RESULT: PASS")
            else:
                print(f"RESULT: WARNING (Expected: {case['expected_profile']}, Got: {profile})")
        else:
            print(f"Status: HTTP Error {r.status_code}")
            print(f"Response: {r.text[:300]}")
    except Exception as e:
        print(f"Status: FAILED with exception {type(e).__name__}: {str(e)}")

print("\n==========================================================")
print("All agent profile tests completed.")
print("==========================================================")
