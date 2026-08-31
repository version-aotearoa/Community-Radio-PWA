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
- **Prod is PR-gated via CI**: merging a reviewed PR to `main` (branch-protected:
  PR + 1 review required, `pr-checks` status required, `enforce_admins: true`)
  auto-deploys prod — app + D1 migrations + chat worker. Never run
  `pages:deploy:prod` locally as a substitute for the pipeline.
- Say "push staging" and we action exactly that target.
- When the user says "push", "deploy", or similar, action exactly
  that target and nothing more. If the target is ambiguous, ask one short
  question.
- **The repository is PUBLIC.** History is permanent. Never commit secrets
  (keys, tokens, `.dev.vars`). Before pushing any change that adds or moves
  env vars/secrets, scan `git log -p` for leaked values and flag findings to
  the user.

## User instruction is the spec

- The user's explicit instruction is the specification. Do not re-derive,
  substitute, expand scope, or investigate past it.
- Reiterations and corrections are signals: stop, restate the corrected spec
  in one line, and continue only from there — do not defend the previous path.
