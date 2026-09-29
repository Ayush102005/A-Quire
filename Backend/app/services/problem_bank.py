"""
app/services/problem_bank.py
─────────────────────────────
DSA problem definitions, shared between app/api/v1/problems.py (the judge
endpoints) and app/services/mentor_service.py (AI hint context) so both use
the same source of truth instead of duplicating problem data.

In a full implementation this would be a DB table — for V1 it's a typed
dict, keyed by string slug (not an integer id).
"""
from __future__ import annotations

import textwrap
from typing import Any

PROBLEMS: dict[str, dict[str, Any]] = {
    "reverse-linked-list": {
        "id": "reverse-linked-list",
        "title": "Reverse Linked List",
        "description": (
            "Given the `head` of a singly linked list, reverse the list, "
            "and return the reversed list."
        ),
        "difficulty": "Easy",
        "tags": ["Linked List", "Recursion"],
        "examples": [
            {"input": "head = [1,2,3,4,5]", "output": "[5,4,3,2,1]"},
            {"input": "head = [1,2]",        "output": "[2,1]"},
            {"input": "head = []",            "output": "[]"},
        ],
        "constraints": [
            "The number of nodes in the list is in the range [0, 5000].",
            "-5000 <= Node.val <= 5000",
        ],
        "starter_code_by_language": {
            "python": textwrap.dedent("""\
                class ListNode:
                    def __init__(self, val=0, next=None):
                        self.val = val
                        self.next = next

                class Solution:
                    def reverseList(self, head):
                        pass  # write your solution here
                """),
            # Both java/cpp stubs previously had no return statement at all
            # — `pass`-equivalent in Python compiles fine and just fails at
            # runtime, but Java/C++ require a value from a non-void method,
            # so the raw starter code didn't even compile before a student
            # touched it. `return head;`/`return head;` is a harmless no-op
            # placeholder (echoes the input back unreversed) that compiles
            # and runs, same spirit as Python's `pass`.
            "java": (
                "class Solution {\n"
                "    public ListNode reverseList(ListNode head) {\n"
                "        return head;  // write your solution here\n"
                "    }\n"
                "}"
            ),
            "cpp": (
                "class Solution {\npublic:\n"
                "    ListNode* reverseList(ListNode* head) {\n"
                "        return head;  // write your solution here\n"
                "    }\n"
                "};"
            ),
            "javascript": (
                "var reverseList = function(head) {\n"
                "    \n"
                "};"
            ),
        },
        # Test cases: (input_as_list, expected_as_list)
        "_test_cases": [
            ([1, 2, 3, 4, 5], [5, 4, 3, 2, 1]),
            ([1, 2],          [2, 1]),
            ([],              []),
            ([1],             [1]),
            ([5, 4, 3, 2, 1], [1, 2, 3, 4, 5]),
        ],
    },
    "two-sum": {
        "id": "two-sum",
        "title": "Two Sum",
        "description": (
            "Given an array of integers `nums` and an integer `target`, "
            "return indices of the two numbers such that they add up to `target`."
        ),
        "difficulty": "Easy",
        "tags": ["Array", "Hash Table"],
        "examples": [
            {"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]"},
            {"input": "nums = [3,2,4], target = 6",     "output": "[1,2]"},
        ],
        "constraints": [
            "2 <= nums.length <= 10^4",
            "-10^9 <= nums[i] <= 10^9",
            "Only one valid answer exists.",
        ],
        "starter_code_by_language": {
            "python": (
                "class Solution:\n"
                "    def twoSum(self, nums, target):\n"
                "        pass  # write your solution here\n"
            ),
            "java": (
                "class Solution {\n"
                "    public int[] twoSum(int[] nums, int target) {\n"
                "        return new int[]{};  // write your solution here\n"
                "    }\n"
                "}"
            ),
            "cpp": (
                "class Solution {\npublic:\n"
                "    vector<int> twoSum(vector<int>& nums, int target) {\n"
                "        return {};  // write your solution here\n"
                "    }\n"
                "};"
            ),
            "javascript": (
                "var twoSum = function(nums, target) {\n"
                "    \n"
                "};"
            ),
        },
        "_test_cases": [
            (([2, 7, 11, 15], 9), [0, 1]),
            (([3, 2, 4], 6),      [1, 2]),
            (([3, 3], 6),         [0, 1]),
        ],
    },
}


def get_problem(problem_id: str) -> dict:
    """
    Look up a problem by slug. Unknown slugs get a generic fallback (title
    derived from the slug) so callers never have to special-case a 404 —
    matches the original behavior in app/api/v1/problems.py.
    """
    import os
    import json
    
    if problem_id in PROBLEMS:
        prob = PROBLEMS[problem_id].copy()
    else:
        prob = {
            "id": problem_id,
            "title": problem_id.replace("-", " ").title(),
            "description": "Solve the problem as described.",
            "difficulty": "Medium",
            "tags": [],
            "examples": [],
            "constraints": [],
            "starter_code_by_language": {
                "python": "class Solution:\n    def solve(self):\n        pass\n",
                "java": "class Solution {\n    public void solve() {\n        \n    }\n}",
                "cpp": "class Solution {\npublic:\n    void solve() {\n        \n    }\n};",
                "javascript": "var solve = function() {\n    \n};",
            },
            "_test_cases": [],
        }

    # Dynamically load test cases from JSON if available
    # Path: Backend/app/services/ -> Backend/app/ -> Backend/ -> A-Quire/ -> problems/testcases
    tc_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "problems", "testcases", f"{problem_id}.json"))
    if os.path.exists(tc_path):
        try:
            with open(tc_path, "r", encoding="utf-8") as f:
                tc_data = json.load(f)
                prob["_test_cases"] = tc_data.get("hand_crafted", []) + tc_data.get("generated", [])
        except Exception as e:
            print(f"Error loading testcases for {problem_id}: {e}")

    return prob
