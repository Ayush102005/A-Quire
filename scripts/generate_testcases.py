"""
scripts/generate_testcases.py
──────────────────────────────
CLI wrapper around the AI test case generator service.

Usage:
    # List problems that have a saved generator
    python scripts/generate_testcases.py --list

    # Use AI to generate a generator for a problem (requires ANTHROPIC_API_KEY in .env)
    python scripts/generate_testcases.py --ai two-sum

    # Run an existing generator to produce N test cases
    python scripts/generate_testcases.py two-sum --count 100

    # Run generator for all problems that have one saved
    python scripts/generate_testcases.py --all --count 100
"""
import argparse
import json
import os
import sys

# ── Auto-relaunch under Backend venv if pydantic is not importable ────────────
# The CLI imports FastAPI services that depend on pydantic, SQLAlchemy, etc.
# Those are only installed in Backend/venv, not in the system Python.
_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_venv_python = os.path.join(_root, "Backend", "venv", "Scripts", "python.exe")
if not os.path.exists(_venv_python):
    # Fallback for Linux/macOS
    _venv_python = os.path.join(_root, "Backend", "venv", "bin", "python")

try:
    import pydantic  # noqa: F401
except ImportError:
    if os.path.exists(_venv_python) and sys.executable != _venv_python:
        import subprocess
        result = subprocess.run([_venv_python] + sys.argv)
        sys.exit(result.returncode)
    else:
        print("Error: pydantic not found. Activate the Backend venv first:")
        print("  .\\Backend\\venv\\Scripts\\activate  (Windows)")
        print("  source Backend/venv/bin/activate  (Linux/macOS)")
        sys.exit(1)
# ─────────────────────────────────────────────────────────────────────────────


# Load .env for ANTHROPIC_API_KEY
_backend = os.path.join(_root, "Backend")
if _backend not in sys.path:
    sys.path.insert(0, _backend)

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(_backend, ".env"))
except ImportError:
    pass  # dotenv not installed — env vars must be set manually

_TESTCASES_DIR = os.path.join(_root, "problems", "testcases")
_GENERATORS_DIR = os.path.join(_TESTCASES_DIR, "generators")


def list_generators():
    if not os.path.isdir(_GENERATORS_DIR):
        print("No generators directory found.")
        return
    files = [f for f in os.listdir(_GENERATORS_DIR) if f.endswith(".py")]
    if not files:
        print("No saved generators found in problems/testcases/generators/")
        return
    print(f"{'Problem Slug':<35} {'JSON Exists':>12} {'Generated Cases':>16}")
    print("-" * 65)
    for f in sorted(files):
        slug = f[:-3]
        json_path = os.path.join(_TESTCASES_DIR, f"{slug}.json")
        has_json = os.path.exists(json_path)
        gen_count = 0
        if has_json:
            try:
                with open(json_path) as jf:
                    data = json.load(jf)
                    gen_count = len(data.get("generated", []))
            except Exception:
                pass
        print(f"{slug:<35} {'Yes' if has_json else 'No':>12} {gen_count:>16}")


def ai_generate(slug: str):
    """Use the AI service to write a generator for the given slug."""
    import asyncio
    # We need the Django-style setup for app.core.config to load
    os.environ.setdefault("PYTHONPATH", _backend)
    try:
        from app.services.testcase_generator_service import testcase_generator_service
        from app.services.problem_bank import get_problem
    except ImportError as e:
        print(f"Error: cannot import backend services — make sure you're running from the A-Quire root: {e}")
        sys.exit(1)

    problem = get_problem(slug)
    print(f"Asking AI to write a generator for '{problem['title']}'...")
    result = asyncio.run(testcase_generator_service.ai_generate_generator(slug, problem))
    if not result["ok"]:
        print(f"Error: {result['error']}")
        sys.exit(1)
    print(f"[OK] Generator created: {result.get('description', '')[:120]}")
    print(f"     Saved to: problems/testcases/generators/{slug}.py")


def run_generator(slug: str, count: int, mode: str = "normal"):
    """Execute the saved generator and write test cases to JSON."""
    import asyncio
    os.environ.setdefault("PYTHONPATH", _backend)
    try:
        from app.services.testcase_generator_service import testcase_generator_service
    except ImportError as e:
        print(f"Error: cannot import backend services — make sure you're running from the A-Quire root: {e}")
        sys.exit(1)

    print(f"Running generator for '{slug}' ({count} cases, mode: {mode})...")
    result = asyncio.run(testcase_generator_service.run_generator(slug, count=count, mode=mode))
    if not result["ok"]:
        print(f"Error: {result['error']}")
        sys.exit(1)
    print(f"[OK] Generated {result['generated']} cases ({result.get('errors', 0)} errors).")
    print(f"     Total test cases for '{slug}': {result['total']}")

def main():
    # Force UTF-8 output on Windows so progress messages don't crash on
    # terminals using legacy cp1252 encoding.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(
        description="A-Quire DSA test case generator CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("problem", nargs="?", help="Problem slug (e.g., two-sum)")
    parser.add_argument("--count", type=int, default=50, help="Number of test cases to generate (default: 50)")
    parser.add_argument("--mode", type=str, choices=["normal", "stress"], default="normal", help="Generator mode (normal or stress)")
    parser.add_argument("--ai", metavar="PROBLEM", help="Use AI to write a generator for PROBLEM")
    parser.add_argument("--list", action="store_true", help="List all problems with saved generators")
    parser.add_argument("--all", action="store_true", help="Run all saved generators")

    args = parser.parse_args()

    if args.list:
        list_generators()
        return

    if args.ai:
        ai_generate(args.ai)
        # After generating, run it automatically
        run_generator(args.ai, args.count, args.mode)
        return

    if args.all:
        if not os.path.isdir(_GENERATORS_DIR):
            print("No generators found.")
            return
        slugs = [f[:-3] for f in os.listdir(_GENERATORS_DIR) if f.endswith(".py")]
        if not slugs:
            print("No saved generators found.")
            return
        for slug in sorted(slugs):
            run_generator(slug, args.count, args.mode)
        return

    if not args.problem:
        parser.print_help()
        return

    run_generator(args.problem, args.count, args.mode)


if __name__ == "__main__":
    main()
