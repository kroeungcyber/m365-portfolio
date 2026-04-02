# CI/CD + Docker + GitHub Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GitHub Actions CI, Docker live demo, and GitHub Pages front door to the M365 portfolio.

**Architecture:** Three independent concerns — CI validates code on every push, Docker enables zero-setup local demo, GitHub Pages auto-deploys a polished portfolio site. All 8 files are new; nothing existing is modified except `.github/` directory creation.

**Tech Stack:** GitHub Actions, Node 20, Docker / docker-compose, Bash, vanilla HTML/CSS

---

## File Map

| File | Create / Modify | Responsibility |
|---|---|---|
| `.github/workflows/security-lab-ci.yml` | Create | Node CI: install, syntax check, audit |
| `.github/workflows/provisioner-ci.yml` | Create | PS + JSON validation, no tenant needed |
| `.github/workflows/pages.yml` | Create | Auto-deploy index.html to GitHub Pages |
| `03-security-lab/Dockerfile` | Create | Production container image |
| `03-security-lab/.dockerignore` | Create | Exclude node_modules, .env from image |
| `03-security-lab/docker-compose.yml` | Create | One-command local run |
| `demo/run-demo.sh` | Create | curl-based endpoint demo script |
| `index.html` | Create | GitHub Pages portfolio front door |

---

### Task 1: Security Lab CI workflow

**Files:**
- Create: `.github/workflows/security-lab-ci.yml`

- [ ] **Step 1: Create the workflow file**

```yaml
name: Security Lab CI

on:
  push:
    branches: [main]
    paths:
      - '03-security-lab/**'
      - '.github/workflows/security-lab-ci.yml'
  pull_request:
    branches: [main]
    paths:
      - '03-security-lab/**'
      - '.github/workflows/security-lab-ci.yml'

jobs:
  ci:
    name: Node.js Syntax & Audit
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: 03-security-lab

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: 03-security-lab/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Syntax check all JS files
        run: node --check app.js authMiddleware.js aiAgentDefense.js promptInjectionDefense.js geoThrottle.js logger.js

      - name: Dependency vulnerability audit
        run: npm audit --audit-level=moderate
```

- [ ] **Step 2: Verify YAML is valid**

```bash
python3 -c "import yaml, sys; yaml.safe_load(open('.github/workflows/security-lab-ci.yml'))" && echo "YAML valid"
```

Expected: `YAML valid`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/security-lab-ci.yml
git commit -m "ci: add Node.js security lab CI workflow"
```

---

### Task 2: Provisioner CI workflow

**Files:**
- Create: `.github/workflows/provisioner-ci.yml`

- [ ] **Step 1: Create the workflow file**

```yaml
name: Provisioner CI

on:
  push:
    branches: [main]
    paths:
      - '07-m365-provisioning/**'
      - '.github/workflows/provisioner-ci.yml'
  pull_request:
    branches: [main]
    paths:
      - '07-m365-provisioning/**'
      - '.github/workflows/provisioner-ci.yml'

jobs:
  validate:
    name: JSON + PowerShell Validation
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Validate workspace-config.json
        run: |
          python3 -m json.tool 07-m365-provisioning/workspace-config.json > /dev/null
          echo "workspace-config.json is valid JSON"

      - name: PowerShell syntax check
        shell: pwsh
        run: |
          $errors = $null
          $null = [System.Management.Automation.Language.Parser]::ParseFile(
            "${{ github.workspace }}/07-m365-provisioning/Provision-M365Workplace.ps1",
            [ref]$null,
            [ref]$errors
          )
          if ($errors.Count -gt 0) {
            $errors | ForEach-Object { Write-Error $_.Message }
            exit 1
          }
          Write-Host "Provision-M365Workplace.ps1 syntax OK"

      - name: Summary
        run: echo "All provisioner checks passed — no tenant credentials required"
```

- [ ] **Step 2: Verify YAML is valid**

```bash
python3 -c "import yaml, sys; yaml.safe_load(open('.github/workflows/provisioner-ci.yml'))" && echo "YAML valid"
```

Expected: `YAML valid`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/provisioner-ci.yml
git commit -m "ci: add provisioner JSON + PowerShell validation workflow"
```

---

### Task 3: GitHub Pages deploy workflow

**Files:**
- Create: `.github/workflows/pages.yml`

- [ ] **Step 1: Create the workflow file**

```yaml
name: Deploy GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    name: Deploy to GitHub Pages
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: '.'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Verify YAML is valid**

```bash
python3 -c "import yaml, sys; yaml.safe_load(open('.github/workflows/pages.yml'))" && echo "YAML valid"
```

Expected: `YAML valid`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/pages.yml
git commit -m "ci: add GitHub Pages auto-deploy workflow"
```

---

### Task 4: Dockerfile + .dockerignore

**Files:**
- Create: `03-security-lab/Dockerfile`
- Create: `03-security-lab/.dockerignore`

- [ ] **Step 1: Create Dockerfile**

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install production deps first (layer cache)
COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "app.js"]
```

- [ ] **Step 2: Create .dockerignore**

```
node_modules
.env
*.log
.git
.gitignore
```

- [ ] **Step 3: Verify Dockerfile syntax (no Docker required)**

```bash
# Check file exists and has expected FROM line
head -1 03-security-lab/Dockerfile | grep "FROM node:20-alpine" && echo "Dockerfile OK"
```

Expected: `Dockerfile OK`

- [ ] **Step 4: Commit**

```bash
git add 03-security-lab/Dockerfile 03-security-lab/.dockerignore
git commit -m "feat(security-lab): add Dockerfile and .dockerignore for containerised demo"
```

---

### Task 5: docker-compose.yml

**Files:**
- Create: `03-security-lab/docker-compose.yml`

- [ ] **Step 1: Create docker-compose.yml**

```yaml
services:
  security-lab:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```

- [ ] **Step 2: Verify YAML is valid**

```bash
python3 -c "import yaml; yaml.safe_load(open('03-security-lab/docker-compose.yml'))" && echo "YAML valid"
```

Expected: `YAML valid`

- [ ] **Step 3: Commit**

```bash
git add 03-security-lab/docker-compose.yml
git commit -m "feat(security-lab): add docker-compose for one-command local demo"
```

---

### Task 6: demo/run-demo.sh

**Files:**
- Create: `demo/run-demo.sh`

- [ ] **Step 1: Create the script**

```bash
#!/usr/bin/env bash
# M365 Security Lab — Live Demo Script
# Requires the server already running at http://localhost:3000
# Start with: npm start  OR  docker compose up -d

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
GREEN="\033[0;32m"
RED="\033[0;31m"
BLUE="\033[0;34m"
RESET="\033[0m"
PASS="${GREEN}✓ PASS${RESET}"
FAIL="${RED}✗ FAIL${RESET}"
INFO="${BLUE}→${RESET}"

pass_count=0
fail_count=0

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   M365 Security Lab — Zero Trust Demo        ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo -e "$INFO Target: $BASE_URL"
echo ""

run_check() {
  local label="$1"
  local expected_status="$2"
  local url="$3"

  actual_status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

  if [ "$actual_status" = "$expected_status" ]; then
    echo -e "  $PASS  $label (HTTP $actual_status)"
    ((pass_count++)) || true
  else
    echo -e "  $FAIL  $label (expected HTTP $expected_status, got $actual_status)"
    ((fail_count++)) || true
  fi
}

echo "── Health Check ──────────────────────────────"
run_check "/health returns 200"                     "200" "$BASE_URL/health"

echo ""
echo "── Authentication Enforcement (Zero Trust) ───"
run_check "/api/profile without token → 401"        "401" "$BASE_URL/api/profile"
run_check "/api/documents without token → 401"      "401" "$BASE_URL/api/documents"
run_check "/api/admin/settings without token → 401" "401" "$BASE_URL/api/admin/settings"

echo ""
echo "── 404 Handling ──────────────────────────────"
run_check "Unknown route → 404"                     "404" "$BASE_URL/unknown-route"

echo ""
echo "══════════════════════════════════════════════"
echo -e "  Results: ${GREEN}${pass_count} passed${RESET}  ${RED}${fail_count} failed${RESET}"
echo ""

if [ "$fail_count" -gt 0 ]; then
  echo -e "  ${RED}Some checks failed.${RESET} Is the server running?"
  echo "  Start with:  cd 03-security-lab && npm start"
  echo "           OR  cd 03-security-lab && docker compose up -d"
  echo ""
  exit 1
fi

echo -e "  ${GREEN}All checks passed.${RESET} Zero Trust is enforced."
echo ""
```

- [ ] **Step 2: Verify shell syntax and make executable**

```bash
bash -n demo/run-demo.sh && echo "Shell syntax OK"
chmod +x demo/run-demo.sh
```

Expected: `Shell syntax OK`

- [ ] **Step 3: Commit**

```bash
git add demo/run-demo.sh
git commit -m "feat: add curl-based live demo script"
```

---

### Task 7: index.html — GitHub Pages portfolio

**Files:**
- Create: `index.html`

- [ ] **Step 1: Create index.html** (full file — see content below)

Write the complete self-contained HTML file. Key constraints:
- No external JS frameworks
- Inter font via Google Fonts CDN only
- Inline `<style>` block
- `#0078D4` primary, `#106EBE` hover, `#F3F2F1` background

Structure:
```
<html>
  <head> — meta, title, Google Fonts, inline CSS </head>
  <body>
    <header> — hero: name, title, pitch, GitHub button </header>
    <main>
      <section id="modules"> — 7 cards grid </section>
      <section id="roadmap"> — 6-phase SME roadmap </section>
    </main>
    <footer> — LinkedIn + GitHub links </footer>
  </body>
</html>
```

Module cards data (use exactly these values):
| # | Title | Badges | Description |
|---|---|---|---|
| 01 | Ministry Intranet Portal | SharePoint · Teams · Power Automate | Hub-and-spoke SharePoint architecture with automated governance, metadata, and cross-platform announcements. |
| 02 | Leave Request Automation | Power Apps · Power Automate · SharePoint | End-to-end leave request workflow with multi-stage approvals, Teams Adaptive Cards, and calendar integration. |
| 03 | Security & Compliance Lab | Node.js · Entra ID · Zero Trust | Production-ready 11-layer Zero Trust API with RBAC, AI agent defence, geo-throttling, and prompt injection detection. **[LIVE DEMO]** |
| 04 | Custom Teams App | Teams Dev Portal · Power Apps · Graph API | Internal event planning app embedded as a Teams tab with SharePoint list integration and Adaptive Card notifications. |
| 05 | Training & Support Portal | SharePoint · Forms · Power BI | Self-service training hub with interactive quizzes, smart support routing, and usage analytics. |
| 06 | Documentation Library | SharePoint · Power Automate · Purview | Governed document repository with 2-stage approval workflow, sensitivity labels, and automated retention. |
| 07 | M365 Workplace Provisioner | PowerShell · Graph API · PnP | Declarative provisioner that reads a single JSON config and provisions SharePoint, Teams, Entra groups, DLP, and CA policies. |

- [ ] **Step 2: Verify HTML has expected sections**

```bash
grep -c "<section" index.html | grep -E "^[2-9]" && echo "Sections present"
grep "0078D4" index.html && echo "Brand colour present"
grep "kroeungcyber" index.html && echo "GitHub link present"
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add GitHub Pages portfolio front door (index.html)"
```

---

### Task 8: Final verification + update README badge

**Files:**
- Modify: `README.md` — add CI status badges

- [ ] **Step 1: Add CI badges to README.md top**

Add these lines immediately after the existing badges on line 3 of README.md:

```markdown
[![Security Lab CI](https://github.com/kroeungcyber/m365-portfolio/actions/workflows/security-lab-ci.yml/badge.svg)](https://github.com/kroeungcyber/m365-portfolio/actions/workflows/security-lab-ci.yml)
[![Provisioner CI](https://github.com/kroeungcyber/m365-portfolio/actions/workflows/provisioner-ci.yml/badge.svg)](https://github.com/kroeungcyber/m365-portfolio/actions/workflows/provisioner-ci.yml)
[![GitHub Pages](https://github.com/kroeungcyber/m365-portfolio/actions/workflows/pages.yml/badge.svg)](https://kroeungcyber.github.io/m365-portfolio)
```

- [ ] **Step 2: Verify all 8 files exist**

```bash
files=(
  ".github/workflows/security-lab-ci.yml"
  ".github/workflows/provisioner-ci.yml"
  ".github/workflows/pages.yml"
  "03-security-lab/Dockerfile"
  "03-security-lab/.dockerignore"
  "03-security-lab/docker-compose.yml"
  "demo/run-demo.sh"
  "index.html"
)
for f in "${files[@]}"; do
  [ -f "$f" ] && echo "✓ $f" || echo "✗ MISSING: $f"
done
```

Expected: 8 lines each starting with `✓`

- [ ] **Step 3: Final commit**

```bash
git add README.md
git commit -m "docs: add CI status badges to README"
```
