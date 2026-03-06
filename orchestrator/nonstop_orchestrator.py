# Author: Victor.I
import argparse
import datetime as dt
import json
import os
import signal
import shutil
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Dict, List, Optional, Tuple


ROOT = Path(__file__).resolve().parents[1]
LOG_DIR = ROOT / "orchestrator" / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
REQUIRED_OLLAMA_MODELS = ["nomic-embed-text", "llama3.1:8b"]


def run_cmd(name: str, command: List[str], cwd: Optional[Path] = None, env=None) -> Tuple[int, str]:
    start = dt.datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    log_file = LOG_DIR / f"{start}-{name}.log"
    proc = subprocess.run(
        command,
        cwd=str(cwd or ROOT),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    output = proc.stdout or ""
    log_file.write_text(output)
    return proc.returncode, str(log_file)


def start_api() -> subprocess.Popen:
    env = os.environ.copy()
    backend_path = str(ROOT / "backend")
    env["PYTHONPATH"] = backend_path
    return subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=backend_path,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )


def start_api_with_env(extra_env: Dict[str, str]) -> subprocess.Popen:
    env = os.environ.copy()
    env.update(extra_env)
    backend_path = str(ROOT / "backend")
    env["PYTHONPATH"] = backend_path
    return subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(extra_env["REOS_API_PORT"]),
        ],
        cwd=backend_path,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )


def reserve_local_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        sock.listen(1)
        return int(sock.getsockname()[1])


def stop_process(proc: Optional[subprocess.Popen]):
    if not proc:
        return
    if proc.poll() is None:
        proc.send_signal(signal.SIGTERM)
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()


def _fetch_ollama_tags() -> dict:
    with urllib.request.urlopen(f"{OLLAMA_URL}/api/tags", timeout=10) as res:
        payload = res.read().decode("utf-8")
    return json.loads(payload)


def check_ai_prerequisites(cycle: int) -> Tuple[bool, List[str]]:
    problems = []

    if shutil.which("tesseract") is None:
        problems.append("tesseract binary not found in PATH")

    if shutil.which("ollama") is None:
        problems.append("ollama CLI not found in PATH")

    model_names: List[str] = []
    try:
        tags = _fetch_ollama_tags()
        for item in tags.get("models", []):
            name = item.get("name")
            if name:
                model_names.append(name)
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        problems.append(f"ollama daemon not reachable at {OLLAMA_URL}: {exc}")

    for required in REQUIRED_OLLAMA_MODELS:
        if not any(name == required or name.startswith(f"{required}:") for name in model_names):
            problems.append(f"required ollama model missing: {required}")

    if problems:
        print(f"[cycle {cycle}] Agent-Prereq: dependency check failed", flush=True)
        for item in problems:
            print(f"[cycle {cycle}] - {item}", flush=True)
    else:
        print(f"[cycle {cycle}] Agent-Prereq: OCR + Ollama dependencies OK", flush=True)
    return (len(problems) == 0, problems)


def cycle_once(cycle: int, run_ai_smoke: bool, strict_prereqs: bool) -> bool:
    healthy, problems = check_ai_prerequisites(cycle)
    if strict_prereqs and not healthy:
        print(f"[cycle {cycle}] strict prerequisite mode enabled; skipping fallback", flush=True)
        return False

    fallback_env: Dict[str, str] = {}
    ai_prereq_failed = any("ollama" in p.lower() or "model" in p.lower() for p in problems)
    ocr_prereq_failed = any("tesseract" in p.lower() for p in problems)

    if ai_prereq_failed:
        fallback_env["REOS_AI_MODE"] = "local_fallback"
        print(f"[cycle {cycle}] Agent-Fallback: using local AI fallback mode", flush=True)
    if ocr_prereq_failed:
        fallback_env["REOS_OCR_MODE"] = "basic"
        print(f"[cycle {cycle}] Agent-Fallback: using basic OCR mode", flush=True)
    fallback_env["REOS_API_PORT"] = str(reserve_local_port())

    print(f"[cycle {cycle}] Agent-Builder: backend unit smoke", flush=True)
    code, log = run_cmd(
        "backend-pytest",
        [sys.executable, "-m", "pytest", "backend/tests/test_smoke.py", "-q"],
        cwd=ROOT,
    )
    if code != 0:
        print(f"[cycle {cycle}] backend tests failed. log={log}")
        return False

    print(f"[cycle {cycle}] Agent-Builder: frontend production build", flush=True)
    code, log = run_cmd("frontend-build", ["npm", "run", "build"], cwd=ROOT / "frontend")
    if code != 0:
        print(f"[cycle {cycle}] frontend build failed. log={log}")
        return False

    print(f"[cycle {cycle}] Agent-Tester: API endpoint smoke", flush=True)
    api_proc = start_api_with_env(fallback_env)
    try:
        smoke_env = os.environ.copy()
        smoke_env["RUN_AI_SMOKE"] = "1" if run_ai_smoke else "0"
        smoke_env["API_BASE"] = f"http://127.0.0.1:{fallback_env['REOS_API_PORT']}"
        smoke_env.update(fallback_env)
        code, log = run_cmd(
            "api-smoke",
            [sys.executable, "scripts/smoke_test.py"],
            cwd=ROOT,
            env=smoke_env,
        )
        if code != 0:
            print(f"[cycle {cycle}] api smoke failed. log={log}")
            return False
    finally:
        stop_process(api_proc)
        if api_proc.stdout:
            api_log = LOG_DIR / f"{dt.datetime.utcnow().strftime('%Y%m%d-%H%M%S')}-api-runtime.log"
            remaining = api_proc.stdout.read() or ""
            api_log.write_text(remaining)

    print(f"[cycle {cycle}] completed successfully", flush=True)
    return True


def main():
    parser = argparse.ArgumentParser(description="Run continuous build/smoke cycles.")
    parser.add_argument("--hours", type=float, default=2.0, help="How long to run")
    parser.add_argument("--sleep-seconds", type=int, default=20, help="Delay between cycles")
    parser.add_argument(
        "--run-ai-smoke",
        type=int,
        choices=[0, 1],
        default=1,
        help="Run upload + AI query smoke checks (1=yes, 0=no)",
    )
    parser.add_argument(
        "--strict-prereq-check",
        type=int,
        choices=[0, 1],
        default=1,
        help="Fail cycle if Ollama/Tesseract prerequisites are missing (1=yes, 0=no)",
    )
    args = parser.parse_args()

    deadline = time.time() + (args.hours * 3600)
    cycle = 1
    failures = 0

    print(
        f"Starting non-stop orchestrator for {args.hours} hour(s). "
        f"run_ai_smoke={args.run_ai_smoke} strict_prereq_check={args.strict_prereq_check}",
        flush=True,
    )
    while time.time() < deadline:
        ok = cycle_once(cycle, run_ai_smoke=bool(args.run_ai_smoke), strict_prereqs=bool(args.strict_prereq_check))
        if not ok:
            failures += 1
            print(f"[cycle {cycle}] failed; continuing to next cycle.", flush=True)
        cycle += 1
        time.sleep(args.sleep_seconds)

    print(f"Orchestrator finished. cycles={cycle - 1}, failures={failures}")


if __name__ == "__main__":
    main()
