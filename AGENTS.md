# AGENTS.md — agent rules for this repository

## Release protocol (STRICT)

- **Never `git push` to any remote** — and never change repository visibility —
  without an explicit instruction in the current user message. A request to
  deploy ("push", "deploy") is **not** authorisation to push to
  GitHub; deploy and GitHub push are separate authorisations.
- **Never deploy to prod** without explicit confirmation. Default workflow:
  commit locally → user tests (local/LAN) → explicit instruction to push
  and/or deploy.
- **Deploys default to STAGING**: local `npm run pages:deploy` (any branch) or the
  CI `Deploy staging` workflow → `version-radio-staging` (staging D1 + staging
  chat worker).
- **Prod is PR-gated via CI**: merging a PR to `main` (branch-protected:
  `pr-checks` status required, `enforce_admins: true`) auto-deploys prod —
  app + D1 migrations + chat worker. Never run `pages:deploy:prod` locally
  as a substitute for the pipeline.
- **PRs require human approval + merge on GitHub.** Open the PR, confirm
  `pr-checks` passes, then STOP. Never approve or merge your own pull
  requests (`gh pr merge` is off-limits). The admin reviews and approves on
  GitHub, then merges. Merging to `main` is that human approval AND the
  explicit authorisation for the CI prod auto-deploy.
- Say "push staging" and we action exactly that target.
- When the user says "push", "deploy", or similar, action exactly
  that target and nothing more. If the target is ambiguous, ask one short
  question.
- **Precise action vocabulary — act to that point and no further**:
  `commit` (local only) → `push <branch>` (that branch, no PR) → `open PR`
  (push branch + PR, then stop) → `merge` (you approve + merge on GitHub).
  A broad word ("github", "deploy", "push it") never authorises a larger
  step.
- **The repository is PUBLIC.** History is permanent. Never commit secrets
  (keys, tokens, `.dev.vars`). Before pushing any change that adds or moves
  env vars/secrets, scan `git log -p` for leaked values and flag findings to
  the user.

## User instruction is the spec

- The user's explicit instruction is the specification. Do not re-derive,
  substitute, expand scope, or investigate past it.
- Reiterations and corrections are signals: stop, restate the corrected spec
  in one line, and continue only from there — do not defend the previous path.
