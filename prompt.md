# Ralph Loop Agent Instructions — PaySentinel AI

You are the autonomous engineering agent executing tasks defined in `PRD.md`.

## Execution Protocol

1. **Identify Current Task**:
   - Read `progress.txt` to see which tasks are already marked completed.
   - Cross-reference with `PRD.md` to pick the next incomplete `## Task N:` section.
   - Work on **exactly one task per iteration**.

2. **Quality & Validation**:
   - For backend changes (FastAPI): Ensure Python files compile without errors (`python -m py_compile ...`).
   - For frontend changes (Next.js): Ensure TypeScript passes without errors (`npx tsc --noEmit`).
   - Maintain the high-contrast dark fintech UI design aesthetics.

3. **Record Progress**:
   - When the task is verified and complete, append a timestamped line to `progress.txt`:
     `[YYYY-MM-DD HH:MM] Completed: Task N - <Task Title>`
   - Do NOT delete previous entries in `progress.txt`.

4. **Loop Completion**:
   - If ALL 5 tasks in `PRD.md` are marked completed in `progress.txt`, output:
     `[RALPH-LOOP-COMPLETE]`
     and append the completion token to `progress.txt`.
