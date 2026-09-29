When adding a new DSA problem to the `problems/` tree, include the following metadata at the top of the file (exact strings preferred):

- `- **Topic:** <Category>`
- `- **Difficulty:** <Easy|Medium|Hard>`
- `- **LeetCode Link:** <url>`
- `- **YouTube Video:** <url> (optional)
- `- **Article Link:** <url> (optional)

Required checks enforced by `scripts/validate_problem_format.py`:
- `Topic`, `Difficulty`, and `LeetCode Link` must be present.

Use `problems/TEMPLATE.md` as the canonical example when creating new problem files.

If you'd like, we can add a git pre-commit hook or CI check to run the validator.
