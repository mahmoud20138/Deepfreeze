# deepfreeze

[![npm version](https://img.shields.io/npm/v/deepfreeze-cli.svg)](https://www.npmjs.com/package/deepfreeze-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Load agent skills from the internet **temporarily** without permanent installation. Works with Kilo, Claude Code, Cursor, Copilot, Windsurf, Gemini, and any agent that supports skills.

## Why?

- **Try before you install** — test any skill for the current session
- **No clutter** — skills are cached in a temp directory, cleaned up on demand
- **No npm install** — fetches SKILL.md files directly from GitHub or any URL
- **50 skill limit** — prevents context bloat per session
- **100 curated skills** — built-in library of top coding & development skills

## Install

### npm (global CLI)

```bash
npm install -g deepfreeze-cli
```

Then use the `deepfreeze` command:

```bash
deepfreeze load https://github.com/vercel-labs/agent-skills
deepfreeze list
deepfreeze clear
```

### npx (no install)

```bash
npx deepfreeze-cli load https://github.com/vercel-labs/agent-skills
```

### Kilo / Claude Code / Cursor / Copilot

Copy the `deepfreeze/` directory to your agent's skills folder:

```bash
# Kilo
cp -r deepfreeze/ ~/.config/kilo/skills/deepfreeze/

# Claude Code
cp -r deepfreeze/ ~/.claude/skills/deepfreeze/

# Cursor
cp -r deepfreeze/ ~/.cursor/skills/deepfreeze/

# Copilot
cp -r deepfreeze/ ~/.copilot/skills/deepfreeze/
```

Then say: `load temp skill from https://github.com/user/repo`

## CLI Usage

```bash
deepfreeze load <url>     # Load a skill from URL
deepfreeze list           # List loaded temp skills
deepfreeze freeze <name>  # Pin a temp skill (persists across sessions)
deepfreeze unfreeze <name> # Unpin a frozen skill
deepfreeze frozen         # List frozen (pinned) skills
deepfreeze session        # Show session info and skill count
deepfreeze clear          # Remove all temp skills (frozen untouched)
deepfreeze clear --all    # Remove all temp + frozen skills
deepfreeze help           # Show help
```

**Two modes:** Temp (auto-cleanup on restart) vs Frozen (persists, protected). Set `OPENCLAUDE_SESSION_ID` env var for explicit session boundaries.

### Examples

```bash
# Load from GitHub repo (auto-resolves SKILL.md)
deepfreeze load https://github.com/vercel-labs/agent-skills

# Load from GitHub subfolder
deepfreeze load https://github.com/anthropics/skills/tree/main/pdf

# Load from raw URL
deepfreeze load https://raw.githubusercontent.com/user/repo/main/SKILL.md

# List loaded skills
deepfreeze list

# Clear all
deepfreeze clear
```

## 100 Curated Coding Skills

The skill file includes 100 top coding & development skills organized by category:

| Category | Count | Examples |
|---|---|---|
| React & Frontend | 12 | vercel-react-best-practices, shadcn, frontend-design |
| Next.js & Deployment | 6 | next-best-practices, ai-sdk, turborepo |
| Testing & QA | 8 | TDD, playwright, webapp-testing, systematic-debugging |
| Databases | 12 | supabase, firebase, convex, neon, drizzle, duckdb |
| Code Quality & Review | 10 | impeccable, caveman, code-review |
| TypeScript & JavaScript | 5 | typescript-advanced-types, tailwind-design-system |
| Backend & API | 8 | fastapi, django, rails, nodejs, hono, graphql |
| DevOps & CI/CD | 8 | github-actions, linux-cloud, sentry-cli |
| Browser & Scraping | 4 | agent-browser, browser-use, firecrawl |
| Agent Workflows | 10 | find-skills, brainstorming, writing-plans |
| Planning & Architecture | 10 | grill-me, to-prd, to-issues, database-optimizer |
| Mobile Development | 4 | react-native, swift, angular, capacitor |
| AI & ML Development | 4 | huggingface, rag-architect, fine-tuning |

Browse all skills at [skills.sh](https://skills.sh/).

## How It Works

1. **Fetch** — Downloads SKILL.md from GitHub or raw URL via HTTP
2. **Validate** — Checks for valid frontmatter (`name:` and `description:` fields)
3. **Cache** — Saves to `~/.config/kilo/skills/.temp/<skill-name>/SKILL.md`
4. **Load** — Agent reads the cached file and injects into context
5. **Cleanup** — User says "clear temp skills" or runs `deepfreeze clear`

## Safety

- **Temporary only** — never modifies permanent skill directories
- **No scripts** — only fetches SKILL.md files, no executables
- **Max 50 skills** — prevents context bloat
- **User-initiated** — no automatic background fetching

## Compatibility

| Tool | Install Method |
|---|---|
| Kilo | `cp deepfreeze/ ~/.config/kilo/skills/` |
| Claude Code | `cp deepfreeze/ ~/.claude/skills/` |
| Cursor | `cp deepfreeze/ ~/.cursor/skills/` |
| GitHub Copilot | `cp deepfreeze/ ~/.copilot/skills/` |
| Windsurf | `cp deepfreeze/ ~/.windsurf/skills/` |
| Gemini CLI | `cp deepfreeze/ ~/.gemini/skills/` |
| Cline | `cp deepfreeze/ ~/.cline/skills/` |
| Any agent | Copy `deepfreeze/` to the agent's skills directory |

## Changelog

### 2.1.1

- **Rebrand**: Package renamed from `temp-skill-loader` to `deepfreeze-cli`
- **Feature**: All v1.0.3 features (session cleanup, freeze/unfreeze) now under new name
- Old `temp-skill-loader` package deprecated — use `deepfreeze-cli` instead

### 1.0.3

- **Feature**: Auto-cleanup on session restart — temp skills are automatically removed when a new agent session starts
- **Feature**: Deep freeze mode — `freeze`/`unfreeze`/`frozen` commands to pin skills across sessions
- **Feature**: `deepfreeze session` command shows session info and loaded skill count
- **Feature**: `deepfreeze clear --all` to clear both temp and frozen skills
- **Feature**: Session tracking via `OPENCLAUDE_SESSION_ID`, `CLAUDE_SESSION_ID`, or `KILO_SESSION_ID` env vars
- **Fix**: `deepfreeze help` command now works (was rejected as unknown command)
- **Fix**: `sanitizeName` no longer produces bare `-` from names containing only special characters

### 1.0.2

- **Security**: Sanitize skill names to prevent path traversal via crafted frontmatter
- **Security**: Add max 10 redirect limit to prevent infinite redirect loops
- **Security**: Add 15s request timeout to prevent hung connections
- **Security**: Add 1MB response size limit to prevent OOM
- **Security**: Enforce HTTPS-only for all fetched URLs
- **Security**: Default bare domain URLs to `https://` scheme
- **Fix**: Anchor GitHub regex to prevent false positive domain matches
- **Fix**: Correct duplicate/missing skill numbering in catalog (1-100 sequential)

### 1.0.1

- Initial stable release

## License

MIT
