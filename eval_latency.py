# -*- coding: utf-8 -*-
import os
import sys
import json
import time
import random
import math
import subprocess
import asyncio

# Ensure stdout uses UTF-8 encoding on Windows to prevent console crash on Vietnamese characters
if sys.platform.startswith("win"):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

def ensure_dependencies():
    try:
        import aiohttp
    except ImportError:
        print("[INFO] Installing missing 'aiohttp' dependency...")
        try:
            subprocess.run([sys.executable, "-m", "pip", "install", "aiohttp"], check=True)
        except Exception as e:
            print(f"[ERROR] Failed to install 'aiohttp': {e}")
            sys.exit(1)
            
    try:
        import requests
    except ImportError:
        print("[INFO] Installing missing 'requests' dependency...")
        try:
            subprocess.run([sys.executable, "-m", "pip", "install", "requests"], check=True)
        except Exception as e:
            print(f"[ERROR] Failed to install 'requests': {e}")
            sys.exit(1)

ensure_dependencies()
import requests
import aiohttp

DEFAULT_LOCAL_URL = "http://localhost:3000/api/agent-chat"
TEST_CASES_FILE = "test_cases_v2.json"

def calculate_percentile(data, percentile):
    if not data:
        return 0.0
    sorted_data = sorted(data)
    k = (len(sorted_data) - 1) * (percentile / 100.0)
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return float(sorted_data[int(k)])
    d0 = sorted_data[int(f)] * (c - k)
    d1 = sorted_data[int(c)] * (k - f)
    return float(d0 + d1)

def calculate_stats(latencies):
    if not latencies:
        return {
            "p50": 0.0, "p75": 0.0, "p90": 0.0, "p95": 0.0, "p99": 0.0,
            "mean": 0.0, "std": 0.0, "min": 0.0, "max": 0.0,
            "pct_under_3s": 0.0, "pct_under_5s": 0.0
        }
    
    n = len(latencies)
    mean_val = sum(latencies) / n
    variance = sum((x - mean_val) ** 2 for x in latencies) / n
    std_val = math.sqrt(variance)
    
    under_3s = sum(1 for x in latencies if x < 3000)
    under_5s = sum(1 for x in latencies if x < 5000)
    
    return {
        "p50": calculate_percentile(latencies, 50),
        "p75": calculate_percentile(latencies, 75),
        "p90": calculate_percentile(latencies, 90),
        "p95": calculate_percentile(latencies, 95),
        "p99": calculate_percentile(latencies, 99),
        "mean": float(mean_val),
        "std": float(std_val),
        "min": float(min(latencies)),
        "max": float(max(latencies)),
        "pct_under_3s": float((under_3s / n) * 100),
        "pct_under_5s": float((under_5s / n) * 100)
    }

def extract_breakdown(res_data, client_latency):
    breakdown = {
        "router_time_ms": None,
        "graph_query_time_ms": None,
        "llm_generation_time_ms": None,
        "total_time_ms": client_latency
    }
    
    if not res_data or not isinstance(res_data, dict):
        return breakdown
        
    metadata = res_data.get("metadata", {})
    
    # 1. Total processing time (server side)
    server_dur = res_data.get("latency_ms") or metadata.get("duration_ms")
    if server_dur:
        breakdown["total_time_ms"] = int(server_dur)
        
    # 2. Graph query time
    llm_ctx = metadata.get("llm_context", {})
    graph_data = llm_ctx.get("graph", {})
    graph_lat = graph_data.get("latency") or graph_data.get("elapsed_ms") or metadata.get("graph_latency_ms")
    if graph_lat:
        breakdown["graph_query_time_ms"] = int(graph_lat)
        
    # 3. Router time
    router_lat = metadata.get("router_latency_ms")
    if router_lat:
        breakdown["router_time_ms"] = int(router_lat)
        
    # 4. LLM Generation time
    llm_lat = metadata.get("llm_latency_ms")
    if llm_lat:
        breakdown["llm_generation_time_ms"] = int(llm_lat)
        
    return breakdown

async def fetch_async(session, url, payload):
    start = time.time()
    try:
        async with session.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=15) as response:
            latency = int((time.time() - start) * 1000)
            if response.status == 200:
                data = await response.json()
                return latency, data, None
            else:
                text = await response.text()
                return latency, None, f"HTTP {response.status}: {text[:100]}"
    except Exception as e:
        latency = int((time.time() - start) * 1000)
        return latency, None, str(e)

async def run_concurrent(url, payloads):
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_async(session, url, p) for p in payloads]
        results = await asyncio.gather(*tasks)
        return results

def main():
    import argparse
    parser = argparse.ArgumentParser(description="AiMed Latency Performance Evaluation")
    parser.add_argument("--url", default=None, help="API Endpoint URL")
    parser.add_argument("--endpoint", default=None, help="API Endpoint Base/URL (e.g. http://localhost:3000)")
    parser.add_argument("--test-cases", default=TEST_CASES_FILE, help="Test cases JSON file")
    parser.add_argument("--access-pass", default="kltn2026", help="Access pass")
    parser.add_argument("--output", default="latency", help="Output file prefix")
    parser.add_argument("--scenario", default="all", choices=["all", "warm", "cold", "concurrent"], help="Scenario to run")
    args = parser.parse_args()

    # Determine endpoint URL
    target_url = args.url or args.endpoint or DEFAULT_LOCAL_URL
    if not target_url.startswith("http"):
        target_url = "http://" + target_url
    if not target_url.endswith("/api/agent-chat"):
        target_url = target_url.rstrip("/") + "/api/agent-chat"

    # Output paths
    raw_file = f"{args.output}_results_raw.json"
    summary_file = f"{args.output}_summary.json"
    breakdown_file = f"{args.output}_breakdown.json"

    # Load test cases
    if not os.path.exists(args.test_cases):
        print(f"[ERROR] Test cases file '{args.test_cases}' not found.")
        sys.exit(1)
        
    with open(args.test_cases, "r", encoding="utf-8") as f:
        test_cases = json.load(f)

    # Filter safe cases to avoid blocking interference
    safe_cases = [tc for tc in test_cases if not tc.get("is_dangerous")]
    if not safe_cases:
        print("[ERROR] No safe test cases found.")
        sys.exit(1)

    print("======================================================================")
    print("                 AIMED LATENCY PERFORMANCE EVALUATION")
    print("======================================================================")
    print(f"Target URL   : {target_url}")
    print(f"Test cases   : {len(safe_cases)} safe cases loaded")
    print("======================================================================")

    results_raw = {}
    breakdowns = {}
    summaries = {}

    headers = {"Content-Type": "application/json"}

    # --- KỊCH BẢN B: Cold Start ---
    if args.scenario in ("all", "cold"):
        print("\n>>> [RUNNING] KỊCH BẢN B - Cold Start...")
        print("  [NOTE] Sẽ đo 5 request đầu tiên gửi tới server.")
        
        cold_latencies = []
        cold_breakdowns = []
        cold_samples = random.sample(safe_cases, 5)
        
        for idx, tc in enumerate(cold_samples):
            payload = {
                "message": tc["input"],
                "session_id": f"cold_eval_{idx}",
                "access_pass": args.access_pass
            }
            
            start_t = time.time()
            try:
                r = requests.post(target_url, json=payload, headers=headers, timeout=20)
                client_lat = int((time.time() - start_t) * 1000)
                
                if r.status_code == 200:
                    res_data = r.json()
                    cold_latencies.append(client_lat)
                    cold_breakdowns.append(extract_breakdown(res_data, client_lat))
                    print(f"    Request {idx+1}: {client_lat} ms")
                else:
                    print(f"    Request {idx+1} [HTTP {r.status_code}]: {client_lat} ms")
            except Exception as e:
                client_lat = int((time.time() - start_t) * 1000)
                print(f"    Request {idx+1} [FAIL]: {client_lat} ms (Error: {e})")
                cold_latencies.append(client_lat)
                
        results_raw["cold_start"] = cold_latencies
        breakdowns["cold_start"] = cold_breakdowns
        summaries["cold_start"] = calculate_stats(cold_latencies)

    # --- KỊCH BẢN A: Warm Start ---
    if args.scenario in ("all", "warm"):
        print("\n>>> [RUNNING] KỊCH BẢN A - Warm Start...")
        
        # 1. Warm-up (5 requests)
        print("  Warming up cache (5 requests)...")
        warmup_samples = random.sample(safe_cases, min(5, len(safe_cases)))
        for i, tc in enumerate(warmup_samples):
            payload = {
                "message": tc["input"],
                "session_id": f"warmup_{i}",
                "access_pass": args.access_pass
            }
            try:
                requests.post(target_url, json=payload, headers=headers, timeout=10)
            except Exception:
                pass
                
        # 2. Main test (30 requests)
        print("  Running warm start latency measurement (30 requests)...")
        warm_latencies = []
        warm_breakdowns = []
        test_samples = random.sample(safe_cases, min(30, len(safe_cases)))
        
        for idx, tc in enumerate(test_samples):
            payload = {
                "message": tc["input"],
                "session_id": f"warm_eval_{idx}",
                "access_pass": args.access_pass
            }
            
            start_t = time.time()
            try:
                r = requests.post(target_url, json=payload, headers=headers, timeout=15)
                client_lat = int((time.time() - start_t) * 1000)
                
                if r.status_code == 200:
                    res_data = r.json()
                    warm_latencies.append(client_lat)
                    # Extract breakdown
                    bd = extract_breakdown(res_data, client_lat)
                    warm_breakdowns.append(bd)
                else:
                    print(f"    [WARN] ID {tc['id']} returned HTTP {r.status_code}")
            except Exception as e:
                print(f"    [WARN] ID {tc['id']} failed: {e}")
                
            sys.stdout.write(f"\r  Progress: {idx+1}/30 done")
            sys.stdout.flush()
        print()
        
        results_raw["warm_start"] = warm_latencies
        breakdowns["warm_start"] = warm_breakdowns
        summaries["warm_start"] = calculate_stats(warm_latencies)

    # --- KỊCH BẢN C: Concurrent Load ---
    if args.scenario in ("all", "concurrent"):
        print("\n>>> [RUNNING] KỊCH BẢN C - Concurrent Load (10 simultaneous requests)...")
        concurrent_samples = random.sample(safe_cases, 10)
        
        payloads = [
            {
                "message": tc["input"],
                "session_id": f"concurrent_eval_{i}",
                "access_pass": args.access_pass
            } for i, tc in enumerate(concurrent_samples)
        ]
        
        wall_start = time.time()
        loop = asyncio.get_event_loop()
        async_results = loop.run_until_complete(run_concurrent(target_url, payloads))
        wall_time_ms = int((time.time() - wall_start) * 1000)
        
        concurrent_latencies = []
        concurrent_breakdowns = []
        
        for idx, (latency, res_data, err) in enumerate(async_results):
            if err:
                print(f"    Request {idx+1} [FAIL]: {latency} ms (Error: {err})")
            else:
                print(f"    Request {idx+1}: {latency} ms")
                concurrent_latencies.append(latency)
                concurrent_breakdowns.append(extract_breakdown(res_data, latency))
                
        print(f"  Wall time (Tổng thời gian xử lý đồng thời): {wall_time_ms} ms")
        
        results_raw["concurrent"] = {
            "latencies": concurrent_latencies,
            "wall_time_ms": wall_time_ms
        }
        breakdowns["concurrent"] = concurrent_breakdowns
        summaries["concurrent"] = calculate_stats(concurrent_latencies)
        summaries["concurrent"]["wall_time_ms"] = wall_time_ms

    # Write output JSON files
    with open(raw_file, "w", encoding="utf-8") as f:
        json.dump(results_raw, f, ensure_ascii=False, indent=2)
        
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(summaries, f, ensure_ascii=False, indent=2)
        
    with open(breakdown_file, "w", encoding="utf-8") as f:
        json.dump(breakdowns, f, ensure_ascii=False, indent=2)

    # Output Summary Table
    print("\n" + "=" * 70)
    print("=== LATENCY COMPARISON SUMMARY ===")
    print("=" * 70)
    
    def fmt_ms(val):
        return f"{val:.1f} ms" if val is not None and val > 0 else "N/A"
        
    def fmt_pct(val):
        return f"{val:.1f}%" if val is not None else "N/A"

    print(f"| Metric    | {'Warm Start':<12} | {'Cold Start':<12} | {'Concurrent':<12} |")
    print(f"|-----------|--------------|--------------|--------------|")
    
    w_stats = summaries.get("warm_start", {})
    c_stats = summaries.get("cold_start", {})
    cc_stats = summaries.get("concurrent", {})
    
    print(f"| p50 (ms)  | {fmt_ms(w_stats.get('p50')):<12} | {fmt_ms(c_stats.get('p50')):<12} | {fmt_ms(cc_stats.get('p50')):<12} |")
    print(f"| p95 (ms)  | {fmt_ms(w_stats.get('p95')):<12} | {fmt_ms(c_stats.get('p95')):<12} | {fmt_ms(cc_stats.get('p95')):<12} |")
    print(f"| p99 (ms)  | {fmt_ms(w_stats.get('p99')):<12} | {fmt_ms(c_stats.get('p99')):<12} | {fmt_ms(cc_stats.get('p99')):<12} |")
    print(f"| Mean (ms) | {fmt_ms(w_stats.get('mean')):<12} | {fmt_ms(c_stats.get('mean')):<12} | {fmt_ms(cc_stats.get('mean')):<12} |")
    print(f"| % < 3s    | {fmt_pct(w_stats.get('pct_under_3s')):<12} | {fmt_pct(c_stats.get('pct_under_3s')):<12} | {fmt_pct(cc_stats.get('pct_under_3s')):<12} |")
    print(f"| % < 5s    | {fmt_pct(w_stats.get('pct_under_5s')):<12} | {fmt_pct(c_stats.get('pct_under_5s')):<12} | {fmt_pct(cc_stats.get('pct_under_5s')):<12} |")
    print("=" * 70)

    # SLA Verification on Warm Start
    if "warm_start" in summaries:
        w_p95 = w_stats.get("p95", 0.0)
        print(f"\nWarm Start p95 Latency: {w_p95:.1f} ms")
        if w_p95 <= 3000:
            print("[PASS] SLA Mobile đạt yêu cầu tối ưu (p95 <= 3000ms).")
        elif w_p95 <= 5000:
            print("[PASS] SLA Mobile đạt yêu cầu tối thiểu (p95 <= 5000ms).")
            print("[WARNING] Cảnh báo: p95 > 3000ms. Hãy tối ưu hóa hiệu năng phản hồi.")
        else:
            print("[FAIL] SLA Mobile không đạt (p95 > 5000ms)!")

if __name__ == "__main__":
    main()
