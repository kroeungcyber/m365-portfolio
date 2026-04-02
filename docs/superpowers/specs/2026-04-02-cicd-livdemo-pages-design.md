# Design: CI/CD Pipeline + Docker Live Demo + GitHub Pages

**Date:** 2026-04-02
**Status:** Approved
**Author:** M365 Portfolio — brainstorming session

---

## Context

The M365 portfolio (`/Users/kroeung/Desktop/m365-portfolio`) is a 7-module showcase targeting
both hiring managers and SME clients. Two gaps were identified as highest priority:

1. **No CI/CD** — the repo looks like a static document dump with no automated validation
2. **No live demo path** — visitors cannot experience anything without a full tenant setup

The portfolio owner wants to be positioned as a **full-stack M365 generalist**. The live demo
path chosen is: GitHub Pages for the visual story + `npm start` / `docker compose up` for the
working API demo.

---

## Approved Design

### Section 1: GitHub Actions CI

**File:** `.github/workflows/security-lab-ci.yml`
**Trigger:** Push or PR to `main` affecting `03-security-lab/**`

Steps:
1. Checkout code
2. Setup Node 20
3. `npm ci` — clean install from lockfile
4. `node --check` across all JS source files — syntax validation
5. `npm audit --audit-level=moderate` — dependency vulnerability scan

---

**File:** `.github/workflows/provisioner-ci.yml`
**Trigger:** Push or PR to `main` affecting `07-m365-provisioning/**`

Steps:
1. Checkout code
2. Validate `workspace-config.json` is parseable JSON (`python -m json.tool`)
3. PowerShell syntax check: `pwsh -Command "$null = [System.Management.Automation.Language.Parser]::ParseFile('./07-m365-provisioning/Provision-M365Workplace.ps1', [ref]$null, [ref]$null); Write-Host 'Syntax OK'"`
4. Print "Dry-run validation passed" — no real tenant credentials required

Both workflows add status checks to PRs. No secrets required.

---

### Section 2: Docker + Live Demo

**File:** `03-security-lab/Dockerfile`
- Base: `node:20-alpine`
- `WORKDIR /app`
- `COPY package* ./` → `npm ci --only=production`
- `COPY . .`
- `EXPOSE 3000`
- `CMD ["node", "app.js"]`

**File:** `03-security-lab/.dockerignore`
- Excludes `node_modules`, `.env`, `*.log`

**File:** `03-security-lab/docker-compose.yml`
- Single `security-lab` service
- `env_file: .env` (user copies `.env.example → .env`)
- Port `3000:3000`
- Healthcheck: `GET /health` every 30s, 3 retries
- Restart policy: `unless-stopped`

**File:** `demo/run-demo.sh`
- Executable bash script (requires server already running via `npm start` or `docker compose up`)
- Hits `/health` → prints coloured "UP" result
- Hits `/api/profile` without auth → shows 401 (demonstrates auth enforcement)
- Hits `/api/documents` without auth → shows 401
- Prints a colour-coded summary table of all results
- Requires only `curl` and `bash` — no other dependencies

---

### Section 3: GitHub Pages

**File:** `index.html` (repo root)
- Self-contained — no build framework, no npm dependencies
- Microsoft Fluent-inspired design: `#0078D4` blue, Inter font (Google Fonts CDN)
- Sections:
  1. **Hero** — name/title, one-line pitch, "View on GitHub" CTA button
  2. **Module Grid** — 7 responsive cards, each with: number, title, tech badges,
     2-sentence description, folder link. `03-security-lab` has a "Live Demo" badge
     with `docker compose up` snippet
  3. **SME Transformation Roadmap** — condensed 6-phase roadmap from `SME-TRANSFORMATION.md`
  4. **Footer** — LinkedIn + GitHub links
- Fully accessible: semantic HTML, sufficient colour contrast

**File:** `.github/workflows/pages.yml`
- Trigger: push to `main`
- Required permissions: `pages: write`, `id-token: write`, `contents: read`
- No build step — uploads `index.html` via `actions/upload-pages-artifact`, deploys via `actions/deploy-pages`
- Result: `https://kroeungcyber.github.io/m365-portfolio` always mirrors `main`
- **Prerequisite (one-time):** In repo Settings → Pages → Source, set to "GitHub Actions"

---

## Files to Create

| File | Purpose |
|---|---|
| `.github/workflows/security-lab-ci.yml` | Node.js CI for security lab |
| `.github/workflows/provisioner-ci.yml` | PowerShell + JSON CI for provisioner |
| `.github/workflows/pages.yml` | Auto-deploy GitHub Pages on push to main |
| `03-security-lab/Dockerfile` | Container image for security lab |
| `03-security-lab/.dockerignore` | Exclude node_modules, .env from image |
| `03-security-lab/docker-compose.yml` | One-command local run |
| `demo/run-demo.sh` | Curl-based demo script |
| `index.html` | GitHub Pages portfolio front door |

---

## Out of Scope

- M365 Copilot declarative agent manifest (Option C — deferred)
- Mermaid flow diagrams (Option C — deferred)
- Real tenant integration testing
- Frontend build pipeline (intentionally avoided to keep Pages simple)

---

## Success Criteria

- `security-lab-ci` passes on every push with zero manual steps
- `provisioner-ci` validates JSON and PS syntax with no tenant credentials
- `docker compose up` in `03-security-lab/` starts the server on port 3000
- `demo/run-demo.sh` runs to completion with coloured output
- `https://kroeungcyber.github.io/m365-portfolio` loads and shows all 7 modules
- Pages workflow auto-deploys within 2 minutes of a push to `main`
