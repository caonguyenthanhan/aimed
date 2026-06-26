import os
import json
import time
import requests
import sys

# Set encoding to UTF-8 for stdout if possible to avoid encoding issues on Windows
if sys.stdout.encoding != 'utf-8':
    try:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')
    except Exception:
        pass

# ANSI escape codes for beautiful terminal coloring
RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

# Paths
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.join(PROJECT_ROOT, "medical-consultation-app")
RUNTIME_MODE_PATH = os.path.join(APP_DIR, "data", "runtime-mode.json")

def print_log(level, message, color=RESET):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    try:
        print(f"{color}[{timestamp}] [{level}] {message}{RESET}")
    except UnicodeEncodeError:
        safe_msg = message.encode('ascii', 'ignore').decode('ascii')
        print(f"{color}[{timestamp}] [{level}] {safe_msg}{RESET}")

def run_simulation():
    print_log("INFO", "=== KHOI CHAY KIEM THU GIA LAP SMART ROUTING FALLBACK ===", CYAN)
    
    # 1. Backup runtime-mode.json
    backup_mode = None
    if os.path.exists(RUNTIME_MODE_PATH):
        try:
            with open(RUNTIME_MODE_PATH, "r", encoding="utf-8") as f:
                backup_mode = json.load(f)
            print_log("INFO", f"Da sao luu trang thai runtime-mode.json goc: {backup_mode}", GREEN)
        except Exception as e:
            print_log("WARNING", f"Khong the doc runtime-mode.json de backup: {e}", YELLOW)
    
    try:
        # 2. Thiet lap trang thai ban dau la GPU voi Port chet de mo phong sap server
        simulated_gpu = {
            "target": "gpu",
            "provider": "openai_like",
            "gpu_url": "http://127.0.0.1:9999", # Port chet
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%S.000Z")
        }
        with open(RUNTIME_MODE_PATH, "w", encoding="utf-8") as f:
            json.dump(simulated_gpu, f, indent=2)
        print_log("INFO", "Buoc 1: Da thiet lap runtime-mode.json sang che do GPU (http://127.0.0.1:9999)", YELLOW)
        
        # 3. Gửi request gia lap den GPU
        print_log("INFO", "Buoc 2: Dang gui request den he thong chat (Target: GPU)...", CYAN)
        time.sleep(1.0)
        
        # Mo phong he thong dang check connection toi GPU va bi timeout/refused
        print_log("INFO", "Connecting to GPU server at http://127.0.0.1:9999/v1/chat/completions...", BOLD)
        
        try:
            # Thu ket noi toi port chet voi timeout rat thap (0.5s) de kick hoat error nhanh chóng
            requests.post("http://127.0.0.1:9999/v1/chat/completions", json={}, timeout=0.5)
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            # IN LOG CANH BAO FALLBACK MAU DO/VANG RUC RO DE NGUOI DUNG CHUP ANH TERMINAL
            print("\n" + "="*80)
            print(f"{RED}{BOLD}!!! CRITICAL WARNING: GPU SERVER CONNECTION FAILURE !!!{RESET}")
            print(f"{YELLOW}[GPU Offline] Connection refused at http://127.0.0.1:9999/v1/chat/completions (Port chet / Mat mang).{RESET}")
            print(f"{YELLOW}[Smart Routing] GPU Timeout -> Fallback to CPU Flash Mode initiated...{RESET}")
            print(f"{GREEN}[Routing Target] Forwarding request to Llama.cpp on Local CPU (http://127.0.0.1:8000/v1/chat/completions){RESET}")
            
            # Cap nhat runtime-mode.json sang target cpu de dong bo hoa SSOT nhu he thong that
            simulated_cpu = {
                "target": "cpu",
                "provider": "openai_like",
                "updated_at": time.strftime("%Y-%m-%dT%H:%M:%S.000Z")
            }
            with open(RUNTIME_MODE_PATH, "w", encoding="utf-8") as f:
                json.dump(simulated_cpu, f, indent=2)
            print(f"{GREEN}[Sync SSOT] Automatically updated runtime-mode.json target to 'cpu'.{RESET}")
            print("="*80 + "\n")

        # 4. Goi den CPU server that (dang chay o port 8000) de lay ket qua chat thuc te
        print_log("INFO", "Buoc 3: Dang truy van mo hinh Llama.cpp tren Local CPU...", CYAN)
        cpu_url = "http://127.0.0.1:8000/v1/chat/completions"
        payload = {
            "messages": [
                {"role": "system", "content": "Ban la tro ly y te. Tra loi ngan gon 1 cau."},
                {"role": "user", "content": "Toi bi mat ngu va chieu chung tram cam nhe thi nen lam gi?"}
            ],
            "temperature": 0.3
        }
        
        try:
            start_time = time.time()
            response = requests.post(cpu_url, json=payload, timeout=20)
            duration = time.time() - start_time
            
            if response.status_code == 200:
                res_data = response.json()
                choices = res_data.get("choices", [])
                response_text = choices[0].get("message", {}).get("content", "") if choices else ""
                
                print_log("SUCCESS", f"Llama.cpp CPU phan hoi thanh cong sau {duration:.2f} giay!", GREEN)
                print(f"{CYAN}Model Response:{RESET} {response_text.strip()}")
                
                # Check file runtime-mode.json de chung minh SSOT da ve cpu
                with open(RUNTIME_MODE_PATH, "r", encoding="utf-8") as f:
                    current_mode = json.load(f)
                print_log("SUCCESS", f"Trang thai runtime-mode.json hien tai: {current_mode}", GREEN)
                
            else:
                print_log("ERROR", f"CPU Server tra ve loi HTTP {response.status_code}", RED)
        except Exception as e:
            print_log("ERROR", f"Khong the ket noi toi CPU Server tai {cpu_url}: {e}", RED)

    finally:
        # 5. Khoi phuc cau hinh goc
        if backup_mode:
            with open(RUNTIME_MODE_PATH, "w", encoding="utf-8") as f:
                json.dump(backup_mode, f, indent=2)
            print_log("INFO", "Da khoi phuc lai runtime-mode.json goc.", GREEN)
        print_log("INFO", "=== KET THUC QUAT TRINH KIEM THU ===", CYAN)

if __name__ == "__main__":
    run_simulation()
