"""
app/api/v1/problems.py
─────────────────────
DSA problem endpoints with a real Python code execution judge.

GET  /problems/{problem_id}                          — fetch problem definition
POST /problems/{problem_id}/run                      — run code against visible test cases (5s timeout)
POST /problems/{problem_id}/submit                   — run code against all test cases and return verdict

── Instructor test-case generator endpoints ──────────────────────────────────
POST /problems/{problem_id}/testcase-generator/ai    — ask AI to write a generator for this problem
POST /problems/{problem_id}/testcase-generator/manual — instructor uploads their own generator code
POST /problems/{problem_id}/testcase-generator/run   — execute saved generator to populate test cases
GET  /problems/{problem_id}/testcase-generator       — retrieve currently saved generator code
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import textwrap
import time

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Any
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.rate_limit import rate_limit
from app.models.student import User
from app.services.problem_bank import get_problem as _get_problem_or_404
from app.services.testcase_generator_service import testcase_generator_service

router = APIRouter(prefix="/problems", tags=["Problems"])


# ── Python code judge ─────────────────────────────────────────────────────────

_JUDGE_TEMPLATE_REVERSE_LIST = textwrap.dedent("""\
    import json, sys

    class ListNode:
        def __init__(self, val=0, next=None):
            self.val = val
            self.next = next

    def list_to_linked(lst):
        dummy = ListNode()
        cur = dummy
        for v in lst:
            cur.next = ListNode(v)
            cur = cur.next
        return dummy.next

    def linked_to_list(node):
        result = []
        while node:
            result.append(node.val)
            node = node.next
        return result

    # ── Student code ──
    {student_code}

    # ── Test runner ──
    sol = Solution()
    test_cases = {test_cases_json}
    results = []
    for inp, expected in test_cases:
        head = list_to_linked(inp)
        out = sol.reverseList(head)
        actual = linked_to_list(out)
        results.append({{"passed": actual == expected, "expected": str(expected), "actual": str(actual)}})
    print(json.dumps(results))
""")

_JUDGE_TEMPLATE_TWO_SUM = textwrap.dedent("""\
    import json, sys

    # ── Student code ──
    {student_code}

    # ── Test runner ──
    sol = Solution()
    test_cases = {test_cases_json}
    results = []
    for (nums, target), expected in test_cases:
        actual = sol.twoSum(nums, target)
        results.append({{"passed": sorted(actual) == sorted(expected), "expected": str(expected), "actual": str(actual)}})
    print(json.dumps(results))
""")

_JUDGE_TEMPLATE_GENERIC = textwrap.dedent("""\
    import json
    # ── Student code ──
    {student_code}
    print(json.dumps([]))
""")

_JUDGE_TEMPLATES: dict[str, str] = {
    "reverse-linked-list": _JUDGE_TEMPLATE_REVERSE_LIST,
    "two-sum": _JUDGE_TEMPLATE_TWO_SUM,
}


# The judge subprocess must never inherit the backend's own environment —
# DATABASE_URL, SECRET_KEY, ANTHROPIC_API_KEY, AWS_*, SES_* are all real
# process-env vars the backend reads (see app/core/config.py), and without
# this, a submission as simple as `import os; print(os.environ)` would leak
# every one of them to whoever submitted it. Keep only what a bare python
# invocation needs to actually start.
_SANDBOX_ENV_KEYS = ("PATH", "SYSTEMROOT", "TEMP", "TMP")


def _sandbox_env() -> dict[str, str]:
    return {k: v for k, v in os.environ.items() if k in _SANDBOX_ENV_KEYS}


def _limit_resources() -> None:
    """
    `preexec_fn` for subprocess.run — runs in the forked child, after fork()
    but before exec(), so these rlimits apply only to the judge process (and
    anything it spawns), never to the backend itself. Backstops the
    wall-clock `timeout=` below against memory bombs, fork bombs, and fd
    exhaustion from student code. POSIX-only (see the `os.name` guard at the
    call site) — Windows has no rlimit equivalent, so dev-on-Windows relies
    on the timeout alone; production (Linux/Docker) gets both.

    Tuned for Python and compiled-native (C++) processes — verified against
    a real container build that both run fine under these limits.
    """
    import resource
    resource.setrlimit(resource.RLIMIT_CPU, (5, 5))                   # 5s CPU time
    resource.setrlimit(resource.RLIMIT_AS, (256 * 1024 * 1024,) * 2)  # 256MB address space
    resource.setrlimit(resource.RLIMIT_NOFILE, (64, 64))              # fd exhaustion guard
    resource.setrlimit(resource.RLIMIT_NPROC, (5, 5))                 # fork-bomb guard
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))                  # no core dumps


def _limit_resources_generous() -> None:
    """
    Same purpose as _limit_resources() above, but for Java and Node — both
    have a much heavier baseline footprint than a short Python/C++ process
    before a single line of student code even runs: verified directly
    against a real container build that a plain "hello world" Main.java
    fails to even start the JVM under 256MB/5-proc (it reserves memory for
    JIT code cache, heap, metaspace, and several background threads — GC,
    compiler, reference handler, ... — before touching the student's main()),
    and Node's V8 hits the same class of failure (a "Fatal process OOM
    reserving virtual memory for CodeRange", not an actual out-of-memory
    condition on the host). 640MB/32-proc was the smallest combination that
    reliably started a trivial Java program in that same testing; this adds
    headroom above that measured minimum. CPU time stays the same 5s — the
    fight being bounded is wall-clock runaway, not runtime weight.
    """
    import resource
    resource.setrlimit(resource.RLIMIT_CPU, (5, 5))
    resource.setrlimit(resource.RLIMIT_AS, (768 * 1024 * 1024,) * 2)
    resource.setrlimit(resource.RLIMIT_NOFILE, (128, 128))
    resource.setrlimit(resource.RLIMIT_NPROC, (32, 32))
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))


def _run_python_judge(
    problem_id: str,
    student_code: str,
    test_cases: list,
    timeout_seconds: int = 5,
) -> tuple[list[dict], str | None]:
    """
    Execute student Python code against test_cases using a subprocess sandbox.
    Returns (test_results, error_message).

    NOTE: this is process isolation with a stripped environment and (on
    POSIX) resource limits — it is NOT a full sandbox. The subprocess still
    shares the host's filesystem and network namespace with the backend, so
    it can still read/write files the OS user can access and make outbound
    network calls. True isolation needs a separate container/VM per
    execution with `--network none`; that's an infra change, not something
    this function alone can provide.
    """
    template = _JUDGE_TEMPLATES.get(problem_id, _JUDGE_TEMPLATE_GENERIC)
    judge_script = template.format(
        student_code=student_code,
        test_cases_json=json.dumps(test_cases),
    )

    # cwd=tmpdir matters here, not just for tidiness: without it the child
    # inherits the *backend's own* working directory, so student code as
    # simple as `open('.env').read()` (or the equivalent read of any other
    # relative-path file in the backend's tree) reads the real .env —
    # SECRET_KEY, ANTHROPIC_API_KEY, AWS/Polly creds, DATABASE_URL — and can
    # trivially exfiltrate it back through the judge's own stdout/"actual"
    # field. The Java/C++/JS judges already run with cwd=tmpdir (see
    # _run_compiled_judge); this was the one path that didn't.
    tmpdir = tempfile.mkdtemp(prefix="aquire_judge_")
    try:
        result = subprocess.run(
            [sys.executable, "-c", judge_script],
            cwd=tmpdir,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            env=_sandbox_env(),
            preexec_fn=_limit_resources if os.name == "posix" else None,
        )
        if result.returncode != 0:
            err = (result.stderr or "Runtime error").strip()
            return [], err

        raw = result.stdout.strip()
        parsed = json.loads(raw) if raw else []

        test_results = []
        for i, item in enumerate(parsed):
            test_results.append({
                "passed": item.get("passed", False),
                "expected": item.get("expected", ""),
                "actual": item.get("actual", ""),
                "execution_time_ms": 0,
                "memory_kb": 0,
            })
        return test_results, None

    except subprocess.TimeoutExpired:
        return [], "Time Limit Exceeded (5s)"
    except json.JSONDecodeError as e:
        return [], f"Judge output parse error: {e}"
    except Exception as e:
        return [], str(e)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


# ── Java / C++ / JavaScript judge ───────────────────────────────────────────────
#
# Live execution used to be Python-only — Run/Submit returned
# LANGUAGE_NOT_SUPPORTED for anything else, even though the editor happily
# let a student pick Java/C++/JavaScript and write code in it. This section
# adds real compile-and-run (Java/C++) or run (JavaScript) support for the
# two problems that have real test cases (two-sum, reverse-linked-list),
# using the same host toolchain approach as the Python judge above (a
# subprocess with a stripped environment, not a container — see
# _run_python_judge's own docstring for the same caveat: this is process
# isolation, not a full sandbox, and depends on javac/java/g++/node being
# installed on whatever host runs this backend).
#
# Templates use __TOKEN__ placeholders + str.replace() rather than
# str.format() — Java/C++ source is dense with literal `{`/`}` (far more
# than the Python templates above), which would need extensive `{{`/`}}`
# escaping under .format(). replace() sidesteps that entirely while still
# safely handling student code that itself contains braces (replace()
# doesn't recurse into the replacement text).

_COMPILE_TIMEOUT_SECONDS = 10


def _int_array_literal(nums: list) -> str:
    """Renders a Python int list as a Java/C++ array/vector initializer,
    e.g. [2, 7, 11] -> "{2, 7, 11}". Same brace syntax works for both a
    Java `int[]` initializer and a C++ `vector<int>`/array initializer."""
    return "{" + ", ".join(str(n) for n in nums) + "}"


# ── Two Sum: Java / C++ / JavaScript templates ──────────────────────────────

_JUDGE_TEMPLATE_TWO_SUM_JAVA = textwrap.dedent("""\
    import java.util.*;

    __STUDENT_CODE__

    public class Main {
        static String toJsonArr(int[] a) {
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < a.length; i++) {
                if (i > 0) sb.append(",");
                sb.append(a[i]);
            }
            sb.append("]");
            return sb.toString();
        }

        public static void main(String[] args) {
            Solution sol = new Solution();
            int[][] numsCases = { __NUMS_CASES__ };
            int[] targets = { __TARGETS__ };
            int[][] expected = { __EXPECTED_CASES__ };

            StringBuilder out = new StringBuilder("[");
            for (int i = 0; i < numsCases.length; i++) {
                int[] actual = sol.twoSum(numsCases[i], targets[i]);
                int[] actualSorted = actual.clone();
                int[] expectedSorted = expected[i].clone();
                Arrays.sort(actualSorted);
                Arrays.sort(expectedSorted);
                boolean passed = Arrays.equals(actualSorted, expectedSorted);
                if (i > 0) out.append(",");
                out.append("{\\"passed\\":").append(passed)
                   .append(",\\"expected\\":\\"").append(toJsonArr(expected[i])).append("\\"")
                   .append(",\\"actual\\":\\"").append(toJsonArr(actual)).append("\\"}");
            }
            out.append("]");
            System.out.println(out.toString());
        }
    }
""")

_JUDGE_TEMPLATE_TWO_SUM_CPP = textwrap.dedent("""\
    #include <bits/stdc++.h>
    using namespace std;

    __STUDENT_CODE__

    static string toJsonArr(vector<int>& a) {
        string s = "[";
        for (size_t i = 0; i < a.size(); i++) {
            if (i > 0) s += ",";
            s += to_string(a[i]);
        }
        s += "]";
        return s;
    }

    int main() {
        Solution sol;
        vector<vector<int>> numsCases = { __NUMS_CASES__ };
        vector<int> targets = { __TARGETS__ };
        vector<vector<int>> expected = { __EXPECTED_CASES__ };

        string out = "[";
        for (size_t i = 0; i < numsCases.size(); i++) {
            vector<int> actual = sol.twoSum(numsCases[i], targets[i]);
            vector<int> actualSorted = actual, expectedSorted = expected[i];
            sort(actualSorted.begin(), actualSorted.end());
            sort(expectedSorted.begin(), expectedSorted.end());
            bool passed = (actualSorted == expectedSorted);
            if (i > 0) out += ",";
            out += "{\\"passed\\":" + string(passed ? "true" : "false") +
                   ",\\"expected\\":\\"" + toJsonArr(expected[i]) + "\\"" +
                   ",\\"actual\\":\\"" + toJsonArr(actual) + "\\"}";
        }
        out += "]";
        cout << out << endl;
        return 0;
    }
""")

_JUDGE_TEMPLATE_TWO_SUM_JS = textwrap.dedent("""\
    __STUDENT_CODE__

    const __testCases = __TEST_CASES_JSON__;
    const __results = __testCases.map(([nums, target, expected]) => {
        // An unfinished stub (e.g. the starter code's empty body) returns
        // undefined, not an array — spreading that directly throws inside
        // the harness itself ("actual is not iterable"), which surfaced as
        // a scary uncaught "Runtime error" instead of a normal wrong-answer
        // result. Treat anything that isn't actually an array as an empty
        // answer instead of letting the harness crash on it.
        const rawActual = twoSum(nums, target);
        const actual = Array.isArray(rawActual) ? rawActual : [];
        const sortedActual = [...actual].sort((a, b) => a - b);
        const sortedExpected = [...expected].sort((a, b) => a - b);
        const passed = JSON.stringify(sortedActual) === JSON.stringify(sortedExpected);
        return { passed, expected: JSON.stringify(expected), actual: JSON.stringify(actual) };
    });
    console.log(JSON.stringify(__results));
""")


def _render_two_sum(template: str, student_code: str, test_cases: list) -> str:
    if "__TEST_CASES_JSON__" in template:
        cases_json = json.dumps([[nums, target, expected] for (nums, target), expected in test_cases])
        return template.replace("__STUDENT_CODE__", student_code).replace("__TEST_CASES_JSON__", cases_json)
    nums_cases = ", ".join(_int_array_literal(nums) for (nums, target), expected in test_cases)
    targets = ", ".join(str(target) for (nums, target), expected in test_cases)
    expected_cases = ", ".join(_int_array_literal(expected) for (nums, target), expected in test_cases)
    return (
        template.replace("__STUDENT_CODE__", student_code)
        .replace("__NUMS_CASES__", nums_cases)
        .replace("__TARGETS__", targets)
        .replace("__EXPECTED_CASES__", expected_cases)
    )


# ── Reverse Linked List: Java / C++ / JavaScript templates ─────────────────────

_JUDGE_TEMPLATE_REVERSE_LIST_JAVA = textwrap.dedent("""\
    import java.util.*;

    class ListNode {
        int val;
        ListNode next;
        ListNode(int val) { this.val = val; }
    }

    __STUDENT_CODE__

    public class Main {
        static ListNode listToLinked(int[] arr) {
            ListNode dummy = new ListNode(0);
            ListNode cur = dummy;
            for (int v : arr) {
                cur.next = new ListNode(v);
                cur = cur.next;
            }
            return dummy.next;
        }

        static String arrToJson(int[] a) {
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < a.length; i++) {
                if (i > 0) sb.append(",");
                sb.append(a[i]);
            }
            sb.append("]");
            return sb.toString();
        }

        static String listToJson(ListNode node) {
            StringBuilder sb = new StringBuilder("[");
            boolean first = true;
            while (node != null) {
                if (!first) sb.append(",");
                sb.append(node.val);
                first = false;
                node = node.next;
            }
            sb.append("]");
            return sb.toString();
        }

        static boolean listEquals(ListNode node, int[] expected) {
            for (int v : expected) {
                if (node == null || node.val != v) return false;
                node = node.next;
            }
            return node == null;
        }

        public static void main(String[] args) {
            Solution sol = new Solution();
            int[][] inputs = { __INPUTS__ };
            int[][] expected = { __EXPECTED__ };

            StringBuilder out = new StringBuilder("[");
            for (int i = 0; i < inputs.length; i++) {
                ListNode head = listToLinked(inputs[i]);
                ListNode result = sol.reverseList(head);
                boolean passed = listEquals(result, expected[i]);
                if (i > 0) out.append(",");
                out.append("{\\"passed\\":").append(passed)
                   .append(",\\"expected\\":\\"").append(arrToJson(expected[i])).append("\\"")
                   .append(",\\"actual\\":\\"").append(listToJson(result)).append("\\"}");
            }
            out.append("]");
            System.out.println(out.toString());
        }
    }
""")

_JUDGE_TEMPLATE_REVERSE_LIST_CPP = textwrap.dedent("""\
    #include <bits/stdc++.h>
    using namespace std;

    struct ListNode {
        int val;
        ListNode *next;
        ListNode(int x) : val(x), next(nullptr) {}
    };

    __STUDENT_CODE__

    static ListNode* listToLinked(vector<int>& arr) {
        ListNode dummy(0);
        ListNode* cur = &dummy;
        for (int v : arr) {
            cur->next = new ListNode(v);
            cur = cur->next;
        }
        return dummy.next;
    }

    static string listToJson(ListNode* node) {
        string s = "[";
        bool first = true;
        while (node) {
            if (!first) s += ",";
            s += to_string(node->val);
            first = false;
            node = node->next;
        }
        s += "]";
        return s;
    }

    static string vecToJson(vector<int>& a) {
        string s = "[";
        for (size_t i = 0; i < a.size(); i++) {
            if (i > 0) s += ",";
            s += to_string(a[i]);
        }
        s += "]";
        return s;
    }

    static bool listEquals(ListNode* node, vector<int>& expected) {
        for (int v : expected) {
            if (!node || node->val != v) return false;
            node = node->next;
        }
        return node == nullptr;
    }

    int main() {
        Solution sol;
        vector<vector<int>> inputs = { __INPUTS__ };
        vector<vector<int>> expected = { __EXPECTED__ };

        string out = "[";
        for (size_t i = 0; i < inputs.size(); i++) {
            ListNode* head = listToLinked(inputs[i]);
            ListNode* result = sol.reverseList(head);
            bool passed = listEquals(result, expected[i]);
            if (i > 0) out += ",";
            out += "{\\"passed\\":" + string(passed ? "true" : "false") +
                   ",\\"expected\\":\\"" + vecToJson(expected[i]) + "\\"" +
                   ",\\"actual\\":\\"" + listToJson(result) + "\\"}";
        }
        out += "]";
        cout << out << endl;
        return 0;
    }
""")

_JUDGE_TEMPLATE_REVERSE_LIST_JS = textwrap.dedent("""\
    __STUDENT_CODE__

    function __listToLinked(arr) {
        let dummy = { val: 0, next: null };
        let cur = dummy;
        for (const v of arr) {
            cur.next = { val: v, next: null };
            cur = cur.next;
        }
        return dummy.next;
    }
    function __linkedToList(node) {
        const result = [];
        while (node) { result.push(node.val); node = node.next; }
        return result;
    }

    const __testCases = __TEST_CASES_JSON__;
    const __results = __testCases.map(([inp, expected]) => {
        const head = __listToLinked(inp);
        const outNode = reverseList(head);
        const actual = __linkedToList(outNode);
        const passed = JSON.stringify(actual) === JSON.stringify(expected);
        return { passed, expected: JSON.stringify(expected), actual: JSON.stringify(actual) };
    });
    console.log(JSON.stringify(__results));
""")


def _render_reverse_list(template: str, student_code: str, test_cases: list) -> str:
    if "__TEST_CASES_JSON__" in template:
        cases_json = json.dumps(test_cases)
        return template.replace("__STUDENT_CODE__", student_code).replace("__TEST_CASES_JSON__", cases_json)
    inputs = ", ".join(_int_array_literal(inp) for inp, expected in test_cases)
    expected = ", ".join(_int_array_literal(exp) for inp, exp in test_cases)
    return (
        template.replace("__STUDENT_CODE__", student_code)
        .replace("__INPUTS__", inputs)
        .replace("__EXPECTED__", expected)
    )


# ── Generic (no real test cases) templates — compile/run only, so a
# lesson-authored problem outside the bank at least gives the student a
# syntax/compile sanity check instead of erroring outright. ────────────────

_JUDGE_TEMPLATE_GENERIC_JAVA = "__STUDENT_CODE__\n\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println(\"[]\");\n    }\n}\n"
_JUDGE_TEMPLATE_GENERIC_CPP = "#include <bits/stdc++.h>\nusing namespace std;\n\n__STUDENT_CODE__\n\nint main() {\n    cout << \"[]\" << endl;\n    return 0;\n}\n"
_JUDGE_TEMPLATE_GENERIC_JS = "__STUDENT_CODE__\n\nconsole.log(JSON.stringify([]));\n"

_JAVA_TEMPLATES: dict[str, str] = {
    "two-sum": _JUDGE_TEMPLATE_TWO_SUM_JAVA,
    "reverse-linked-list": _JUDGE_TEMPLATE_REVERSE_LIST_JAVA,
}
_CPP_TEMPLATES: dict[str, str] = {
    "two-sum": _JUDGE_TEMPLATE_TWO_SUM_CPP,
    "reverse-linked-list": _JUDGE_TEMPLATE_REVERSE_LIST_CPP,
}
_JS_TEMPLATES: dict[str, str] = {
    "two-sum": _JUDGE_TEMPLATE_TWO_SUM_JS,
    "reverse-linked-list": _JUDGE_TEMPLATE_REVERSE_LIST_JS,
}


def _render_java_source(problem_id: str, student_code: str, test_cases: list) -> str:
    template = _JAVA_TEMPLATES.get(problem_id)
    if not template:
        return _JUDGE_TEMPLATE_GENERIC_JAVA.replace("__STUDENT_CODE__", student_code)
    renderer = _render_two_sum if problem_id == "two-sum" else _render_reverse_list
    return renderer(template, student_code, test_cases)


def _render_cpp_source(problem_id: str, student_code: str, test_cases: list) -> str:
    template = _CPP_TEMPLATES.get(problem_id)
    if not template:
        return _JUDGE_TEMPLATE_GENERIC_CPP.replace("__STUDENT_CODE__", student_code)
    renderer = _render_two_sum if problem_id == "two-sum" else _render_reverse_list
    return renderer(template, student_code, test_cases)


def _render_js_source(problem_id: str, student_code: str, test_cases: list) -> str:
    template = _JS_TEMPLATES.get(problem_id)
    if not template:
        return _JUDGE_TEMPLATE_GENERIC_JS.replace("__STUDENT_CODE__", student_code)
    renderer = _render_two_sum if problem_id == "two-sum" else _render_reverse_list
    return renderer(template, student_code, test_cases)


# Explicit JVM memory flags — without these, the JVM sizes its heap/code
# cache/thread stacks off the *host's* total physical memory, not the
# rlimit it's about to hit, and dies before main() runs (see
# _limit_resources_generous()'s docstring). -XX:+UseSerialGC skips G1's
# larger reservation-up-front behavior, appropriate for a program that
# runs for a few seconds and exits rather than a long-lived server.
_JAVA_MEMORY_FLAGS = [
    "-Xmx128m", "-Xss512k", "-XX:+UseSerialGC",
    "-XX:MaxMetaspaceSize=64m", "-XX:ReservedCodeCacheSize=48m",
]


def _run_java_judge(problem_id: str, student_code: str, test_cases: list, timeout_seconds: int = 5) -> tuple[list[dict], str | None]:
    source = _render_java_source(problem_id, student_code, test_cases)
    return _run_compiled_judge(
        "Main.java", source,
        lambda tmpdir: ["javac", "Main.java"],
        lambda tmpdir: ["java", *_JAVA_MEMORY_FLAGS, "-cp", tmpdir, "Main"],
        timeout_seconds,
        resource_limiter=_limit_resources_generous,
    )


def _run_cpp_judge(problem_id: str, student_code: str, test_cases: list, timeout_seconds: int = 5) -> tuple[list[dict], str | None]:
    source = _render_cpp_source(problem_id, student_code, test_cases)
    exe_name = "main.exe"
    return _run_compiled_judge(
        "main.cpp", source,
        lambda tmpdir: ["g++", "-O2", "-std=c++17", "-static-libgcc", "-static-libstdc++", "-o", os.path.join(tmpdir, exe_name), "main.cpp"],
        lambda tmpdir: [os.path.join(tmpdir, exe_name)],
        timeout_seconds,
        # Default (tight) resource_limiter — a compiled native binary has
        # none of the JVM/V8 baseline overhead; verified it runs fine
        # under the same limits Python uses.
    )


def _run_javascript_judge(problem_id: str, student_code: str, test_cases: list, timeout_seconds: int = 5) -> tuple[list[dict], str | None]:
    source = _render_js_source(problem_id, student_code, test_cases)
    return _run_compiled_judge(
        "script.js", source,
        lambda tmpdir: None,
        lambda tmpdir: ["node", os.path.join(tmpdir, "script.js")],
        timeout_seconds,
        resource_limiter=_limit_resources_generous,
    )


def _run_compiled_judge(
    source_filename: str,
    source_code: str,
    compile_cmd_fn,
    run_cmd_fn,
    timeout_seconds: int,
    resource_limiter=_limit_resources,
) -> tuple[list[dict], str | None]:
    """
    Shared compile(optional)+run+parse+cleanup flow for Java/C++/JavaScript.
    `compile_cmd_fn`/`run_cmd_fn` receive the real tmpdir path this function
    creates (needed for javac's `-cp <dir>` and to locate the compiled
    binary) and return a command list, or None from compile_cmd_fn to skip
    compilation (JavaScript). `resource_limiter` lets callers pick the rlimit
    profile that actually fits their runtime's baseline footprint — see
    _limit_resources() vs _limit_resources_generous().
    """
    tmpdir = tempfile.mkdtemp(prefix="aquire_judge_")
    try:
        with open(os.path.join(tmpdir, source_filename), "w", encoding="utf-8") as f:
            f.write(source_code)

        compile_cmd = compile_cmd_fn(tmpdir)
        if compile_cmd:
            try:
                cr = subprocess.run(
                    compile_cmd, cwd=tmpdir, capture_output=True, text=True,
                    timeout=_COMPILE_TIMEOUT_SECONDS, env=_sandbox_env(),
                )
            except subprocess.TimeoutExpired:
                return [], "Compilation timed out"
            if cr.returncode != 0:
                return [], (cr.stderr or "Compilation failed").strip()

        run_cmd = run_cmd_fn(tmpdir)
        try:
            rr = subprocess.run(
                run_cmd, cwd=tmpdir, capture_output=True, text=True,
                timeout=timeout_seconds, env=_sandbox_env(),
                preexec_fn=resource_limiter if os.name == "posix" else None,
            )
        except subprocess.TimeoutExpired:
            return [], f"Time Limit Exceeded ({timeout_seconds}s)"

        if rr.returncode != 0:
            return [], (rr.stderr or "Runtime error").strip()

        raw = rr.stdout.strip()
        parsed = json.loads(raw) if raw else []
        return [
            {
                "passed": item.get("passed", False),
                "expected": item.get("expected", ""),
                "actual": item.get("actual", ""),
                "execution_time_ms": 0,
                "memory_kb": 0,
            }
            for item in parsed
        ], None

    except json.JSONDecodeError as e:
        return [], f"Judge output parse error: {e}"
    except FileNotFoundError as e:
        return [], f"Language toolchain not available on the server: {e}"
    except Exception as e:
        return [], str(e)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


_SUPPORTED_LANGUAGES = ("python", "java", "cpp", "javascript")


def _run_judge(problem_id: str, language: str, student_code: str, test_cases: list, timeout_seconds: int = 5) -> tuple[list[dict], str | None]:
    lang = language.lower()
    if lang == "python":
        return _run_python_judge(problem_id, student_code, test_cases, timeout_seconds)
    if lang == "java":
        return _run_java_judge(problem_id, student_code, test_cases, timeout_seconds)
    if lang == "cpp":
        return _run_cpp_judge(problem_id, student_code, test_cases, timeout_seconds)
    if lang == "javascript":
        return _run_javascript_judge(problem_id, student_code, test_cases, timeout_seconds)
    return [], f"Language '{language}' is not supported. Supported languages: {', '.join(_SUPPORTED_LANGUAGES)}."


# ── Request / Response schemas ────────────────────────────────────────────────

class RunRequest(BaseModel):
    code: str
    language: str


class SubmitRequest(BaseModel):
    code: str
    language: str


class ExecuteRequest(BaseModel):
    code: str
    language: str
    stdin: str = ""


# ── Raw execution helpers (Run Code mode) ───────────────────────────────────
#
# Run Code is NOT a judge: it executes the student's code verbatim with the
# provided stdin and returns raw stdout so they can debug with print statements.
# No test-case comparison happens here. Submit (below) is the judge.

import re as _re


def _execute_raw_python(code: str, stdin: str, timeout: int = 5) -> tuple[str, str]:
    """Run Python code with stdin, return (stdout, stderr)."""
    tmpdir = tempfile.mkdtemp(prefix="aquire_exec_")
    try:
        script = os.path.join(tmpdir, "solution.py")
        with open(script, "w", encoding="utf-8") as f:
            f.write(code)
        result = subprocess.run(
            [sys.executable, script],
            input=stdin, cwd=tmpdir,
            capture_output=True, text=True,
            timeout=timeout, env=_sandbox_env(),
            preexec_fn=_limit_resources if os.name == "posix" else None,
        )
        return result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return "", f"Time Limit Exceeded ({timeout}s)"
    except Exception as e:
        return "", str(e)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def _execute_raw_java(code: str, stdin: str, timeout: int = 5) -> tuple[str, str]:
    """Compile + run Java code with stdin, return (stdout, stderr)."""
    tmpdir = tempfile.mkdtemp(prefix="aquire_exec_")
    try:
        m = _re.search(r'public\s+class\s+(\w+)', code)
        class_name = m.group(1) if m else "Solution"
        src = os.path.join(tmpdir, f"{class_name}.java")
        with open(src, "w", encoding="utf-8") as f:
            f.write(code)
        javac = shutil.which("javac") or shutil.which("javac.exe")
        java_bin = shutil.which("java") or shutil.which("java.exe")
        if not javac or not java_bin:
            return "", "Java toolchain (javac/java) not found on the server."
        cr = subprocess.run(
            [javac, src], cwd=tmpdir,
            capture_output=True, text=True,
            timeout=_COMPILE_TIMEOUT_SECONDS, env=_sandbox_env(),
        )
        if cr.returncode != 0:
            return "", (cr.stderr or "Compilation failed").strip()
        rr = subprocess.run(
            [java_bin, "-cp", tmpdir, class_name],
            input=stdin, cwd=tmpdir,
            capture_output=True, text=True,
            timeout=timeout, env=_sandbox_env(),
            preexec_fn=_limit_resources_generous if os.name == "posix" else None,
        )
        return rr.stdout, rr.stderr if rr.returncode != 0 else ""
    except subprocess.TimeoutExpired:
        return "", f"Time Limit Exceeded ({timeout}s)"
    except Exception as e:
        return "", str(e)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def _execute_raw_cpp(code: str, stdin: str, timeout: int = 5) -> tuple[str, str]:
    """Compile + run C++ code with stdin, return (stdout, stderr)."""
    tmpdir = tempfile.mkdtemp(prefix="aquire_exec_")
    try:
        src = os.path.join(tmpdir, "solution.cpp")
        exe = os.path.join(tmpdir, "solution" + (".exe" if os.name == "nt" else ""))
        with open(src, "w", encoding="utf-8") as f:
            f.write(code)
        gpp = shutil.which("g++") or shutil.which("g++.exe")
        if not gpp:
            return "", "C++ compiler (g++) not found on the server."
        cr = subprocess.run(
            [gpp, "-O2", "-std=c++17", "-o", exe, src],
            capture_output=True, text=True,
            timeout=_COMPILE_TIMEOUT_SECONDS, env=_sandbox_env(),
        )
        if cr.returncode != 0:
            return "", (cr.stderr or "Compilation failed").strip()
        rr = subprocess.run(
            [exe], input=stdin, cwd=tmpdir,
            capture_output=True, text=True,
            timeout=timeout, env=_sandbox_env(),
            preexec_fn=_limit_resources if os.name == "posix" else None,
        )
        return rr.stdout, rr.stderr if rr.returncode != 0 else ""
    except subprocess.TimeoutExpired:
        return "", f"Time Limit Exceeded ({timeout}s)"
    except Exception as e:
        return "", str(e)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def _execute_raw_javascript(code: str, stdin: str, timeout: int = 5) -> tuple[str, str]:
    """Run JavaScript code with stdin via Node.js, return (stdout, stderr)."""
    tmpdir = tempfile.mkdtemp(prefix="aquire_exec_")
    try:
        script = os.path.join(tmpdir, "solution.js")
        with open(script, "w", encoding="utf-8") as f:
            f.write(code)
        node = shutil.which("node") or shutil.which("node.exe")
        if not node:
            return "", "Node.js not found on the server."
        result = subprocess.run(
            [node, script],
            input=stdin, cwd=tmpdir,
            capture_output=True, text=True,
            timeout=timeout, env=_sandbox_env(),
            preexec_fn=_limit_resources_generous if os.name == "posix" else None,
        )
        return result.stdout, result.stderr if result.returncode != 0 else ""
    except subprocess.TimeoutExpired:
        return "", f"Time Limit Exceeded ({timeout}s)"
    except Exception as e:
        return "", str(e)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def _execute_raw(language: str, code: str, stdin: str, timeout: int = 5) -> tuple[str, str]:
    lang = language.lower()
    if lang == "python":
        return _execute_raw_python(code, stdin, timeout)
    if lang == "java":
        return _execute_raw_java(code, stdin, timeout)
    if lang == "cpp":
        return _execute_raw_cpp(code, stdin, timeout)
    if lang == "javascript":
        return _execute_raw_javascript(code, stdin, timeout)
    return "", f"Language '{language}' is not supported."


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/{problem_id}")
async def get_problem(problem_id: str) -> dict:
    p = _get_problem_or_404(problem_id)
    # Strip internal-only keys before returning
    return {k: v for k, v in p.items() if not k.startswith("_")}


@router.post("/{problem_id}/run")
async def run_code(
    problem_id: str,
    payload: RunRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(20, 60),  # 20 runs / minute per IP
) -> dict:
    """
    Judge code against the first 3 visible sample test cases and return
    actual output for each. This is the "Run Code" mode (like LeetCode) —
    it only runs the visible cases so the student can see actual vs expected.
    Submit (/submit) runs all hidden test cases and returns a formal verdict.
    """
    p = _get_problem_or_404(problem_id)
    test_cases = p.get("_test_cases", [])
    # Lesson-authored problems (not in static bank): load test cases from DB
    if not test_cases:
        from sqlalchemy import select
        from app.models.lesson import Lesson as _Lesson
        _q = await db.execute(select(_Lesson).where(_Lesson.problem_id == problem_id))
        _db_lesson = _q.scalars().first()
        if _db_lesson and _db_lesson.test_cases:
            test_cases = [
                (tc.get("input", ""), tc.get("expected_output", ""))
                for tc in _db_lesson.test_cases
            ]


    if payload.language.lower() not in _SUPPORTED_LANGUAGES:
        return {
            "status": "LANGUAGE_NOT_SUPPORTED",
            "output": f"'{payload.language}' isn't supported. Supported: {', '.join(_SUPPORTED_LANGUAGES)}.",
            "test_results": [],
        }

    visible = test_cases[:3]  # first 3 visible cases, same as sample examples shown
    if not visible:
        return {
            "status": "NO_TEST_CASES",
            "output": "No runnable test cases for this problem.",
            "test_results": [],
        }

    t_start = time.perf_counter()
    results, error = _run_judge(problem_id, payload.language, payload.code, visible)
    elapsed_ms = int((time.perf_counter() - t_start) * 1000)

    if error:
        return {
            "status": "ERROR",
            "output": error,
            "test_results": [],
        }

    for r in results:
        r["execution_time_ms"] = elapsed_ms // max(len(results), 1)

    passed = sum(r["passed"] for r in results)
    all_passed = passed == len(results)
    return {
        "status": "SUCCESS" if all_passed else "WRONG_ANSWER",
        "output": f"{passed}/{len(results)} sample test cases passed.",
        "test_results": results,
    }


@router.post("/{problem_id}/submit")
async def submit_code(
    problem_id: str,
    payload: SubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(10, 60),  # 10 submissions / minute per IP
) -> dict:
    p = _get_problem_or_404(problem_id)
    test_cases = p.get("_test_cases", [])

    # Lesson-authored problems: load test cases from DB
    if not test_cases:
        from sqlalchemy import select
        from app.models.lesson import Lesson as _Lesson
        _q = await db.execute(select(_Lesson).where(_Lesson.problem_id == problem_id))
        _db_lesson = _q.scalars().first()
        if _db_lesson and _db_lesson.test_cases:
            test_cases = [
                (tc.get("input", ""), tc.get("expected_output", ""))
                for tc in _db_lesson.test_cases
            ]

    if payload.language.lower() not in _SUPPORTED_LANGUAGES:
        return {
            "verdict": "LANGUAGE_NOT_SUPPORTED",
            "message": f"'{payload.language}' isn't supported. Supported languages: {', '.join(_SUPPORTED_LANGUAGES)}.",
            "test_results": [],
        }

    if not test_cases:
        return {
            "verdict": "ACCEPTED",
            "message": "No test cases defined for this problem — submission accepted.",
            "test_results": [],
        }

    t_start = time.perf_counter()
    results, error = _run_judge(problem_id, payload.language, payload.code, test_cases)
    elapsed_ms = int((time.perf_counter() - t_start) * 1000)

    if error:
        verdict = "TIME_LIMIT_EXCEEDED" if "Time Limit" in error else "RUNTIME_ERROR"
        return {
            "verdict": verdict,
            "message": error,
            "test_results": [],
        }

    for r in results:
        r["execution_time_ms"] = elapsed_ms // max(len(results), 1)

    passed = sum(1 for r in results if r["passed"])
    total = len(results)

    if passed == total:
        verdict = "ACCEPTED"
        message = f"All {total} test cases passed!"
    else:
        first_fail = next((i + 1 for i, r in enumerate(results) if not r["passed"]), None)
        verdict = "WRONG_ANSWER"
        message = f"Failed on test case {first_fail} ({passed}/{total} passed)"

    return {
        "verdict": verdict,
        "message": message,
        "test_results": results,
    }


@router.post("/execute")
async def execute_code(
    payload: ExecuteRequest,
    current_user: User = Depends(get_current_user),
    _rl: None = rate_limit(20, 60),  # 20 runs / minute per IP
) -> dict:
    """
    Free-run endpoint: execute student code verbatim with provided stdin and
    return raw stdout/stderr. No test-case comparison — used by lesson-authored
    DSA problems that have no structured test cases but still need a REPL-like
    \"Run Code\" experience.
    """
    if payload.language.lower() not in _SUPPORTED_LANGUAGES:
        return {
            "status": "LANGUAGE_NOT_SUPPORTED",
            "stdout": "",
            "stderr": f"'{payload.language}' isn't supported. Supported: {', '.join(_SUPPORTED_LANGUAGES)}.",
        }

    stdout, stderr = _execute_raw(payload.language, payload.code, payload.stdin)
    return {
        "status": "ERROR" if stderr else "SUCCESS",
        "stdout": stdout,
        "stderr": stderr,
    }


# ── Instructor: test-case generator endpoints ─────────────────────────────────
# These are instructor-only. Students have no route that reaches these.

class ManualGeneratorRequest(BaseModel):
    code: str


class RunGeneratorRequest(BaseModel):
    count: int = 50


def _require_instructor(current_user: User) -> None:
    """Raise 403 if the authenticated user is not an instructor or admin."""
    if current_user.role not in ("instructor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors can manage test case generators.",
        )


@router.post("/{problem_id}/testcase-generator/ai")
async def ai_generate_testcase_generator(
    problem_id: str,
    current_user: User = Depends(get_current_user),
    _rl: None = rate_limit(5, 60),  # 5 AI calls / minute per IP (expensive)
) -> dict:
    """
    Ask AI (Claude) to write a Python test case generator for the problem.

    The AI reads the problem title, description, constraints, and examples
    and produces a `generate_test_case() -> [input, expected]` function.
    The code is saved to problems/testcases/generators/{problem_id}.py.

    Call /testcase-generator/run afterwards to execute it.
    """
    _require_instructor(current_user)
    problem = _get_problem_or_404(problem_id)
    result = await testcase_generator_service.ai_generate_generator(problem_id, problem)
    if not result["ok"]:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=result["error"])
    return {
        "message": "Generator code created by AI and saved successfully.",
        "description": result.get("description", ""),
        "code": result["code"],
    }


@router.post("/{problem_id}/testcase-generator/manual")
async def manual_upload_testcase_generator(
    problem_id: str,
    payload: ManualGeneratorRequest,
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Instructor uploads their own Python generator code.

    The code must define:
        def generate_test_case() -> list:
            # returns [input_value, expected_output]

    The code is validated (syntax check + function presence) then saved.
    Call /testcase-generator/run afterwards to execute it.
    """
    _require_instructor(current_user)
    result = testcase_generator_service.save_manual_generator(problem_id, payload.code)
    if not result["ok"]:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=result["error"])
    return {"message": "Generator code saved successfully. Run /testcase-generator/run to generate test cases."}


@router.post("/{problem_id}/testcase-generator/run")
async def run_testcase_generator(
    problem_id: str,
    payload: RunGeneratorRequest,
    current_user: User = Depends(get_current_user),
    _rl: None = rate_limit(10, 60),
) -> dict:
    """
    Execute the saved generator for this problem `count` times (default 50).

    Results are written to problems/testcases/{problem_id}.json under
    the "generated" key, replacing any previous generated cases.
    Hand-crafted cases are preserved.
    """
    _require_instructor(current_user)
    count = max(1, min(payload.count, 1000))  # cap at 1000
    result = await testcase_generator_service.run_generator(problem_id, count=count)
    if not result["ok"]:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=result["error"])
    return {
        "message": f"Generated {result['generated']} test cases ({result.get('errors', 0)} errors).",
        "generated": result["generated"],
        "errors": result.get("errors", 0),
        "total_test_cases": result["total"],
    }


@router.get("/{problem_id}/testcase-generator")
async def get_testcase_generator(
    problem_id: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Return the currently saved generator code for this problem (if any).
    """
    _require_instructor(current_user)
    code = testcase_generator_service.get_generator_code(problem_id)
    if code is None:
        return {"exists": False, "code": None}
    return {"exists": True, "code": code}


# ── Community Contribution Flow ──────────────────────────────────────────────

class TestCaseContribution(BaseModel):
    input_value: Any
    expected_output: Any
    description: str

@router.post("/{problem_id}/testcases/contribute")
async def contribute_testcase(
    problem_id: str,
    payload: TestCaseContribution,
    current_user: User = Depends(get_current_user),
    _rl: None = rate_limit(5, 60),
) -> dict:
    """
    Student submits a new test case for a problem.
    Saved to problems/testcases/{problem_id}.json under 'contributed' with 'pending' status.
    """
    import os
    import json
    tc_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "problems", "testcases", f"{problem_id}.json"))
    
    os.makedirs(os.path.dirname(tc_path), exist_ok=True)
    
    data = {"hand_crafted": [], "generated": [], "contributed": []}
    if os.path.exists(tc_path):
        with open(tc_path, "r", encoding="utf-8") as f:
            try:
                data.update(json.load(f))
            except json.JSONDecodeError:
                pass
                
    if "contributed" not in data:
        data["contributed"] = []
        
    contribution = {
        "user_id": current_user.id,
        "input": payload.input_value,
        "expected": payload.expected_output,
        "description": payload.description,
        "status": "pending",
    }
    
    data["contributed"].append(contribution)
    
    with open(tc_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        
    return {"message": "Test case contribution submitted for review."}

@router.get("/{problem_id}/testcases/contributions")
async def list_contributions(
    problem_id: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    List pending contributions. Instructor only.
    """
    _require_instructor(current_user)
    
    import os
    import json
    tc_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "problems", "testcases", f"{problem_id}.json"))
    if not os.path.exists(tc_path):
        return {"contributions": []}
        
    with open(tc_path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
            return {"contributions": data.get("contributed", [])}
        except json.JSONDecodeError:
            return {"contributions": []}

@router.post("/{problem_id}/testcases/contributions/{index}/approve")
async def approve_contribution(
    problem_id: str,
    index: int,
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Approve a pending contribution and move it to hand_crafted.
    """
    _require_instructor(current_user)
    
    import os
    import json
    tc_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "problems", "testcases", f"{problem_id}.json"))
    if not os.path.exists(tc_path):
        raise HTTPException(status_code=404, detail="Test cases file not found.")
        
    with open(tc_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    contributed = data.get("contributed", [])
    if index < 0 or index >= len(contributed):
        raise HTTPException(status_code=404, detail="Contribution index out of bounds.")
        
    item = contributed[index]
    if item.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Contribution is not pending.")
        
    item["status"] = "approved"
    
    # Add to hand_crafted
    tc = [item["input"], item["expected"]]
    if "hand_crafted" not in data:
        data["hand_crafted"] = []
    data["hand_crafted"].append(tc)
    
    with open(tc_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        
    return {"message": "Contribution approved."}

@router.post("/{problem_id}/testcases/contributions/{index}/reject")
async def reject_contribution(
    problem_id: str,
    index: int,
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Reject a pending contribution.
    """
    _require_instructor(current_user)
    
    import os
    import json
    tc_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "problems", "testcases", f"{problem_id}.json"))
    if not os.path.exists(tc_path):
        raise HTTPException(status_code=404, detail="Test cases file not found.")
        
    with open(tc_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    contributed = data.get("contributed", [])
    if index < 0 or index >= len(contributed):
        raise HTTPException(status_code=404, detail="Contribution index out of bounds.")
        
    item = contributed[index]
    if item.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Contribution is not pending.")
        
    item["status"] = "rejected"
    
    with open(tc_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        
    return {"message": "Contribution rejected."}
