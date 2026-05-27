---
name: temp-skill
description: TEMPORARY skill loader — fetches remote SKILL.md files without permanent installation. NEVER uses npx skills add or installs permanently. Use when user wants to load a skill temporarily from a GitHub repo URL, raw URL, or any HTTP link to a SKILL.md file, or says "load temp skill", "fetch skill from", "use this skill temporarily", or "temp skill".
argument-hint: "URL of the skill to load (GitHub repo or raw SKILL.md URL)"
---

# Temp Skill Loader

Load skills from the internet without installing them permanently. Skills are cached in a session-scoped temp directory and cleaned up on demand.

## CRITICAL: Temporary Only — Never Install

**This skill exists to PREVENT permanent installation.** You MUST:

- NEVER run `npx skills add`, `npx skills install`, or any install command
- NEVER copy files into `~/.config/kilo/skills/` or `~/.kilocode/skills/` (outside `.temp/`)
- NEVER modify `package.json`, `.skill-lock.json`, or any config to register a skill
- NEVER suggest the user permanently install a skill you fetched temporarily
- If the temp loading fails, report the error — do NOT fall back to permanent installation

**ALL skills — including those from the Default Skill Library below — are temporary.** They go into `.temp/`, they load into context for the current session, and they get cleaned up. Nothing persists permanently.

## Session Limit: Max 50 Skills

**A maximum of 50 temp skills can be loaded per session.** Before fetching a new skill:

1. Count existing skills in `.temp/` directory
2. If count >= 50, refuse and tell the user: "Session limit reached (50 temp skills). Say 'clear temp skills' to free up slots, then try again."
3. If count < 50, proceed with fetch

## Quick Start

```text
User: load temp skill from https://github.com/vercel-labs/agent-skills
Agent: Fetches, caches, and loads the skill for this session.
```

**Supported URL formats:**
- GitHub repo: `https://github.com/user/repo` → fetches `SKILL.md` from repo root
- GitHub subfolder: `https://github.com/user/repo/tree/main/path` → fetches `SKILL.md` from that path
- Raw URL: `https://example.com/SKILL.md` → fetches directly
- Raw GitHub: `https://raw.githubusercontent.com/...` → fetches directly

## URL Resolution

When the user provides a URL, resolve it to a raw SKILL.md URL using these rules:

1. **GitHub blob URL** (`github.com/user/repo` or `github.com/user/repo/tree/branch/path`):
   - Extract `user`, `repo`, `branch` (default: `main`), and `path` (default: root)
   - Convert to: `https://raw.githubusercontent.com/{user}/{repo}/{branch}/{path}/SKILL.md`
   - If the path already ends with `.md`, use it as-is (don't append `/SKILL.md`)

2. **Raw GitHub URL** (`raw.githubusercontent.com/...`):
   - Use as-is

3. **Any other HTTP(S) URL**:
   - Use as-is (must point to SKILL.md content)

### Resolution Examples

| Input | Resolved URL |
|---|---|
| `https://github.com/vercel-labs/agent-skills` | `https://raw.githubusercontent.com/vercel-labs/agent-skills/main/SKILL.md` |
| `https://github.com/user/repo/tree/dev/skills/my-skill` | `https://raw.githubusercontent.com/user/repo/dev/skills/my-skill/SKILL.md` |
| `https://raw.githubusercontent.com/user/repo/main/SKILL.md` | `https://raw.githubusercontent.com/user/repo/main/SKILL.md` |
| `https://example.com/my-skill.md` | `https://example.com/my-skill.md` |

## Fetching & Caching

### Step 0: Check Session Limit

Before fetching, count existing temp skills:

```bash
# On Windows (PowerShell)
$count = (Get-ChildItem "$HOME\.config\kilo\skills\.temp" -Directory -ErrorAction SilentlyContinue).Count
if ($count -ge 50) { Write-Host "LIMIT REACHED: $count/50 temp skills loaded. Run 'clear temp skills' to free slots." }

# On macOS/Linux
count=$(ls -d ~/.config/kilo/skills/.temp/*/ 2>/dev/null | wc -l)
if [ "$count" -ge 50 ]; then echo "LIMIT REACHED: $count/50 temp skills loaded. Run 'clear temp skills' to free slots."; fi
```

If limit reached, STOP and inform the user. Do NOT fetch.

### Step 1: Check Cache First

Before fetching, check if the `.temp` directory exists and create it if needed:

```bash
# On Windows (PowerShell)
New-Item -ItemType Directory -Path "$HOME\.config\kilo\skills\.temp" -Force

# On macOS/Linux
mkdir -p ~/.config/kilo/skills/.temp
```

Use the appropriate command for the current platform. The `bash` tool abstracts this — just run the command.

### Step 2: Fetch the SKILL.md Content

Use the `webfetch` tool with the resolved URL:

```
webfetch(url=resolved_url, format="text")
```

### Step 3: Validate the Content

The fetched content MUST contain valid SKILL.md frontmatter. Check for:
- Starts with `---`
- Contains `name:` field
- Contains `description:` field
- Ends the frontmatter block with `---`

If validation fails, report the error to the user and stop.

### Step 4: Extract Skill Name

Parse the `name:` field from the frontmatter. This becomes the cache directory name.

### Step 5: Save to Cache

```bash
# On Windows (PowerShell)
$skillDir = "$HOME\.config\kilo\skills\.temp\{skill-name}"
New-Item -ItemType Directory -Path $skillDir -Force
Set-Content -Path "$skillDir\SKILL.md" -Value $fetchedContent

# On macOS/Linux
mkdir -p ~/.config/kilo/skills/.temp/{skill-name}
echo "$fetchedContent" > ~/.config/kilo/skills/.temp/{skill-name}/SKILL.md
```

Replace `{skill-name}` with the actual name extracted from frontmatter. Use the `Write` tool if available, otherwise use platform-appropriate shell command.

## Loading into Context

After saving the skill to cache, load it into the conversation context.

### Method 1: Skill Tool (Preferred)

Try loading via the `Skill` tool using the full path:

```
Skill(name="$HOME\.config\kilo\skills\.temp\{skill-name}\SKILL.md")
```

If this works, the skill is now available in context.

### Method 2: Direct Read (Fallback)

If the `Skill` tool cannot resolve the temp path, read the file directly:

```
Read(filePath="$HOME\.config\kilo\skills\.temp\{skill-name}\SKILL.md")
```

Then inject the content as context in your response. The skill instructions will be available for the current conversation.

### Confirmation

After loading, confirm to the user:
"Loaded temp skill '{skill-name}' from {url}. It's now available for this session."

## Cleanup

When the user says "clear temp skills", "cleanup temp skills", or "remove temp skills":

### Step 1: List Cached Skills

```bash
# On Windows (PowerShell)
Get-ChildItem "$HOME\.config\kilo\skills\.temp" -Directory -ErrorAction SilentlyContinue | Select-Object Name

# On macOS/Linux
ls -la ~/.config/kilo/skills/.temp/ 2>/dev/null
```

If the `.temp` directory doesn't exist or is empty, inform the user: "No temp skills to clean up."

### Step 2: Delete the Temp Directory

```bash
# On Windows (PowerShell)
Remove-Item "$HOME\.config\kilo\skills\.temp" -Recurse -Force -ErrorAction SilentlyContinue

# On macOS/Linux
rm -rf ~/.config/kilo/skills/.temp
```

### Step 3: Confirm Cleanup

"Cleared all temp skills from cache."

## Error Handling

| Error | Response |
|---|---|
| Invalid URL format | "The URL doesn't appear to be valid. Please provide a GitHub repo URL or a direct link to a SKILL.md file." |
| Fetch fails (404) | "Could not find a skill at that URL. Please check the URL and try again." |
| Fetch fails (network) | "Network error while fetching the skill. Please check your connection and try again." |
| No frontmatter in response | "The content at that URL doesn't appear to be a valid SKILL.md file (missing frontmatter)." |
| Missing `name:` field | Use the last path segment of the URL as the skill name. Inform the user: "No skill name found in frontmatter, using '{segment}' as the name." |
| Skill name conflicts with installed skill | Warn the user: "A skill named '{name}' is already installed. The temp version will be loaded instead for this session." |

## Default Skill Library

100 coding & development skills from the open agent skills ecosystem. **All loaded TEMPORARILY — never installed permanently.** Max 50 per session.

Source: [skills.sh](https://skills.sh/) — 2026-05-27.

### React & Frontend

| # | Skill | Source | Installs | URL |
|---|---|---|---|---|
| 1 | vercel-react-best-practices | vercel-labs/agent-skills | 389K | `https://github.com/vercel-labs/agent-skills/tree/main/vercel-react-best-practices` |
| 2 | vercel-composition-patterns | vercel-labs/agent-skills | 172K | `https://github.com/vercel-labs/agent-skills/tree/main/vercel-composition-patterns` |
| 3 | shadcn | shadcn/ui | 147K | `https://github.com/shadcn/ui` |
| 4 | frontend-design | anthropics/skills | 421K | `https://github.com/anthropics/skills/tree/main/frontend-design` |
| 5 | web-design-guidelines | vercel-labs/agent-skills | 317K | `https://github.com/vercel-labs/agent-skills/tree/main/web-design-guidelines` |
| 6 | remotion-best-practices | remotion-dev/skills | 299K | `https://github.com/remotion-dev/skills` |
| 7 | vercel-react-native-skills | vercel-labs/agent-skills | 115K | `https://github.com/vercel-labs/agent-skills/tree/main/vercel-react-native-skills` |
| 8 | ui-ux-pro-max | nextlevelbuilder/ui-ux-pro-max-skill | 158K | `https://github.com/nextlevelbuilder/ui-ux-pro-max-skill` |
| 9 | design-taste-frontend | leonxlnx/taste-skill | 62K | `https://github.com/leonxlnx/taste-skill` |
| 10 | canvas-design | anthropics/skills | 55K | `https://github.com/anthropics/skills/tree/main/canvas-design` |
| 11 | web-artifacts-builder | anthropics/skills | 45K | `https://github.com/anthropics/skills/tree/main/web-artifacts-builder` |
| 12 | emil-design-eng | emilkowalski/skill | 54K | `https://github.com/emilkowalski/skill` |

### Next.js & Deployment

| # | Skill | Source | Installs | URL |
|---|---|---|---|---|
| 13 | next-best-practices | vercel-labs/next-skills | 87K | `https://github.com/vercel-labs/next-skills` |
| 14 | next-cache-components | vercel-labs/next-skills | — | `https://github.com/vercel-labs/next-skills` |
| 15 | deploy-to-vercel | vercel-labs/agent-skills | 52K | `https://github.com/vercel-labs/agent-skills/tree/main/deploy-to-vercel` |
| 16 | vercel-optimize | vercel-labs/agent-skills | 172K | `https://github.com/vercel-labs/agent-skills/tree/main/vercel-optimize` |
| 17 | ai-sdk | vercel/ai | — | `https://github.com/vercel/ai` |
| 18 | turborepo | vercel/turborepo | — | `https://github.com/vercel/turborepo` |

### Testing & QA

| # | Skill | Source | Installs | URL |
|---|---|---|---|---|
| 19 | test-driven-development | obra/superpowers | 82K | `https://github.com/obra/superpowers` |
| 20 | webapp-testing | anthropics/skills | 68K | `https://github.com/anthropics/skills/tree/main/webapp-testing` |
| 21 | verification-before-completion | obra/superpowers | 70K | `https://github.com/obra/superpowers` |
| 22 | playwright-best-practices | currents-dev/playwright-best-practices-skill | — | `https://github.com/currents-dev/playwright-best-practices-skill` |
| 23 | playwright-cli | microsoft/playwright-cli | — | `https://github.com/microsoft/playwright-cli` |
| 24 | tdd | mattpocock/skills | 120K | `https://github.com/mattpocock/skills` |
| 25 | systematic-debugging | obra/superpowers | 93K | `https://github.com/obra/superpowers` |
| 26 | diagnose | mattpocock/skills | 97K | `https://github.com/mattpocock/skills` |

### Databases

| # | Skill | Source | Installs | URL |
|---|---|---|---|---|
| 27 | supabase-postgres-best-practices | supabase/agent-skills | 171K | `https://github.com/supabase/agent-skills/tree/main/supabase-postgres-best-practices` |
| 28 | supabase | supabase/agent-skills | 74K | `https://github.com/supabase/agent-skills/tree/main/supabase` |
| 29 | firebase-basics | firebase/agent-skills | 56K | `https://github.com/firebase/agent-skills/tree/main/firebase-basics` |
| 30 | firebase-auth-basics | firebase/agent-skills | 55K | `https://github.com/firebase/agent-skills/tree/main/firebase-auth-basics` |
| 31 | firebase-firestore-enterprise-native-mode | firebase/agent-skills | — | `https://github.com/firebase/agent-skills` |
| 32 | convex-quickstart | get-convex/agent-skills | 47K | `https://github.com/get-convex/agent-skills/tree/main/convex-quickstart` |
| 33 | convex-setup-auth | get-convex/agent-skills | 47K | `https://github.com/get-convex/agent-skills/tree/main/convex-setup-auth` |
| 34 | neon-postgres | neondatabase/agent-skills | — | `https://github.com/neondatabase/agent-skills` |
| 35 | drizzle-orm | bobmatnyc/claude-mpm-skills | — | `https://github.com/bobmatnyc/claude-mpm-skills` |
| 36 | turso-db | turso database/agent-skills | — | `https://github.com/tursodatabase/agent-skills` |
| 37 | duckdb-query | duckdb/duckdb-skills | — | `https://github.com/duckdb/duckdb-skills` |
| 38 | better-auth-best-practices | better-auth/skills | 51K | `https://github.com/better-auth/skills` |

### Code Quality & Review

| # | Skill | Source | Installs | URL |
|---|---|---|---|---|
| 39 | impeccable | pbakaus/impeccable | 103K | `https://github.com/pbakaus/impeccable` |
| 40 | caveman | juliusbrussee/caveman | 154K | `https://github.com/juliusbrussee/caveman` |
| 41 | caveman-review | juliusbrussee/caveman | 86K | `https://github.com/juliusbrussee/caveman` |
| 42 | caveman-commit | juliusbrussee/caveman | 87K | `https://github.com/juliusbrussee/caveman` |
| 43 | requesting-code-review | obra/superpowers | 85K | `https://github.com/obra/superpowers` |
| 44 | receiving-code-review | obra/superpowers | 69K | `https://github.com/obra/superpowers` |
| 45 | improve-codebase-architecture | mattpocock/skills | 132K | `https://github.com/mattpocock/skills` |
| 46 | zoom-out | mattpocock/skills | 101K | `https://github.com/mattpocock/skills` |
| 47 | code-review | coderabbitai/skills | — | `https://github.com/coderabbitai/skills` |

### TypeScript & JavaScript

| # | Skill | Source | Installs | URL |
|---|---|---|---|---|
| 48 | typescript-advanced-types | wshobson/agents | — | `https://github.com/wshobson/agents` |
| 49 | tailwind-design-system | wshobson/agents | — | `https://github.com/wshobson/agents` |
| 50 | python-executor | skills-shell/skills | 2.7K | `https://github.com/skills-shell/skills` |
| 51 | javascript-pro | jeffallan/claude-skills | — | `https://github.com/jeffallan/claude-skills` |
| 52 | typescript-pro | jeffallan/claude-skills | — | `https://github.com/jeffallan/claude-skills` |

### Backend & API

| # | Skill | Source | Installs | URL |
|---|---|---|---|---|
| 52 | fastapi-expert | jeffallan/claude-skills | — | `https://github.com/jeffallan/claude-skills` |
| 53 | django-expert | jeffallan/claude-skills | — | `https://github.com/jeffallan/claude-skills` |
| 54 | rails-expert | jeffallan/claude-skills | — | `https://github.com/jeffallan/claude-skills` |
| 55 | nodejs-best-practices | sickn33/antigravity-awesome-skills | — | `https://github.com/sickn33/antigravity-awesome-skills` |
| 56 | hono-api-scaffolder | jezweb/claude-skills | — | `https://github.com/jezweb/claude-skills` |
| 57 | api-designer | jeffallan/claude-skills | — | `https://github.com/jeffallan/claude-skills` |
| 58 | graphql-architect | jeffallan/claude-skills | — | `https://github.com/jeffallan/claude-skills` |
| 59 | websocket-engineer | jeffallan/claude-skills | — | `https://github.com/jeffallan/claude-skills` |

### DevOps & CI/CD

| # | Skill | Source | Installs | URL |
|---|---|---|---|---|
| 60 | github-actions-docs | xixu-me/skills | 147K | `https://github.com/xixu-me/skills` |
| 61 | openclaw-secure-linux-cloud | xixu-me/skills | 149K | `https://github.com/xixu-me/skills` |
| 62 | opensource-guide-coach | xixu-me/skills | 149K | `https://github.com/xixu-me/skills` |
| 63 | develop-userscripts | xixu-me/skills | 96K | `https://github.com/xixu-me/skills` |
| 64 | sentry-cli | sentry/dev | 48K | `https://github.com/sentry/dev` |
| 65 | devops-engineer | jeffallan/claude-skills | — | `https://github.com/jeffallan/claude-skills` |
| 66 | sre-engineer | jeffallan/claude-skills | — | `https://github.com/jeffallan/claude-skills` |
| 67 | d1-migration | jezweb/claude-skills | — | `https://github.com/jezweb/claude-skills` |

### Browser & Scraping

| # | Skill | Source | Installs | URL |
|---|---|---|---|---|
| 68 | agent-browser | vercel-labs/agent-browser | 281K | `https://github.com/vercel-labs/agent-browser` |
| 69 | browser-use | browser-use/browser-use | 73K | `https://github.com/browser-use/browser-use` |
| 70 | firecrawl | firecrawl/cli | 55K | `https://github.com/firecrawl/cli` |
| 71 | just-scrape | scrapegraphai/just-scrape | 73K | `https://github.com/scrapegraphai/just-scrape` |

### Agent Workflows

| # | Skill | Source | Installs | URL |
|---|---|---|---|---|
| 72 | find-skills | vercel-labs/skills | 1.5M | `https://github.com/vercel-labs/skills` |
| 73 | brainstorming | obra/superpowers | 164K | `https://github.com/obra/superpowers` |
| 74 | writing-plans | obra/superpowers | 95K | `https://github.com/obra/superpowers` |
| 75 | executing-plans | obra/superpowers | 82K | `https://github.com/obra/superpowers` |
| 76 | subagent-driven-development | obra/superpowers | 71K | `https://github.com/obra/superpowers` |
| 78 | dispatching-parallel-agents | obra/superpowers | 64K | `https://github.com/obra/superpowers` |
| 79 | using-git-worktrees | obra/superpowers | 62K | `https://github.com/obra/superpowers` |
| 80 | finishing-a-development-branch | obra/superpowers | 63K | `https://github.com/obra/superpowers` |
| 81 | skill-creator | anthropics/skills | 198K | `https://github.com/anthropics/skills/tree/main/skill-creator` |
| 82 | mcp-builder | anthropics/skills | 56K | `https://github.com/anthropics/skills/tree/main/mcp-builder` |

### Planning & Architecture

| # | Skill | Source | Installs | URL |
|---|---|---|---|---|
| 83 | grill-me | mattpocock/skills | 171K | `https://github.com/mattpocock/skills` |
| 84 | grill-with-docs | mattpocock/skills | 118K | `https://github.com/mattpocock/skills` |
| 85 | to-prd | mattpocock/skills | 111K | `https://github.com/mattpocock/skills` |
| 86 | to-issues | mattpocock/skills | 103K | `https://github.com/mattpocock/skills` |
| 87 | prototype | mattpocock/skills | 62K | `https://github.com/mattpocock/skills` |
| 88 | handoff | mattpocock/skills | 49K | `https://github.com/mattpocock/skills` |
| 89 | write-a-skill | mattpocock/skills | 102K | `https://github.com/mattpocock/skills` |
| 90 | database-optimizer | jeffallan/claude-skills | — | `https://github.com/jeffallan/claude-skills` |
| 91 | architecture-designer | jeffallan/claude-skills | — | `https://github.com/jeffallan/claude-skills` |
| 92 | microservices-architect | jeffallan/claude-skills | — | `https://github.com/jeffallan/claude-skills` |

### Mobile Development

| # | Skill | Source | Installs | URL |
|---|---|---|---|---|
| 93 | react-native-expert | jeffallan/claude-skills | — | `https://github.com/jeffallan/claude-skills` |
| 94 | swift-expert | jeffallan/claude-skills | — | `https://github.com/jeffallan/claude-skills` |
| 95 | angular-new-app | angular/skills | — | `https://github.com/angular/skills` |
| 96 | capacitor-apple-review-preflight | cap-go/capgo-skills | — | `https://github.com/cap-go/capgo-skills` |

### AI & ML Development

| # | Skill | Source | Installs | URL |
|---|---|---|---|---|
| 97 | huggingface-best | huggingface/skills | — | `https://github.com/huggingface/skills` |
| 98 | rag-architect | jeffallan/claude-skills | — | `https://github.com/jeffallan/claude-skills` |
| 99 | fine-tuning-expert | jeffallan/claude-skills | — | `https://github.com/jeffallan/claude-skills` |
| 100 | solana-dev | solana-foundation/solana-dev-skill | — | `https://github.com/solana-foundation/solana-dev-skill` |

### Quick Load Examples

```text
# React performance rules
load temp skill from https://github.com/vercel-labs/agent-skills/tree/main/vercel-react-best-practices

# TDD workflow
load temp skill from https://github.com/obra/superpowers

# Supabase + Postgres patterns
load temp skill from https://github.com/supabase/agent-skills

# Playwright testing
load temp skill from https://github.com/currents-dev/playwright-best-practices-skill

# Code review & quality
load temp skill from https://github.com/pbakaus/impeccable

# Browser automation
load temp skill from https://github.com/vercel-labs/agent-browser

# Database optimization
load temp skill from https://github.com/jeffallan/claude-skills

# TypeScript patterns
load temp skill from https://github.com/wshobson/agents
```

Browse more at [skills.sh](https://skills.sh/) — the open agent skills ecosystem.

## Important Notes

- **TEMPORARY ONLY** — this skill never permanently installs anything
- This skill only fetches SKILL.md files — no scripts, no executables
- Each fetch is user-initiated — no automatic background fetching
- All loaded skills go into `~/.config/kilo/skills/.temp/` — never into the main skills directories
- Cached skills persist until manually cleaned up ("clear temp skills")
- Re-fetching the same URL overwrites the cached version
- NEVER run `npx skills add` or any install command — use this skill instead
