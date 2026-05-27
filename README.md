# temp-skill-loader

[![npm version](https://img.shields.io/npm/v/temp-skill-loader.svg)](https://www.npmjs.com/package/temp-skill-loader)
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
npm install -g temp-skill-loader
```

Then use the `temp-skill` command:

```bash
temp-skill load https://github.com/vercel-labs/agent-skills
temp-skill list
temp-skill clear
```

### npx (no install)

```bash
npx temp-skill-loader load https://github.com/vercel-labs/agent-skills
```

### Kilo / Claude Code / Cursor / Copilot

Copy the `temp-skill/` directory to your agent's skills folder:

```bash
# Kilo
cp -r temp-skill/ ~/.config/kilo/skills/temp-skill/

# Claude Code
cp -r temp-skill/ ~/.claude/skills/temp-skill/

# Cursor
cp -r temp-skill/ ~/.cursor/skills/temp-skill/

# Copilot
cp -r temp-skill/ ~/.copilot/skills/temp-skill/
```

Then say: `load temp skill from https://github.com/user/repo`

## CLI Usage

```bash
temp-skill load <url>     # Load a skill from URL
temp-skill list           # List loaded temp skills
temp-skill clear          # Remove all temp skills
temp-skill help           # Show help
```

### Examples

```bash
# Load from GitHub repo (auto-resolves SKILL.md)
temp-skill load https://github.com/vercel-labs/agent-skills

# Load from GitHub subfolder
temp-skill load https://github.com/anthropics/skills/tree/main/pdf

# Load from raw URL
temp-skill load https://raw.githubusercontent.com/user/repo/main/SKILL.md

# List loaded skills
temp-skill list

# Clear all
temp-skill clear
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
5. **Cleanup** — User says "clear temp skills" or runs `temp-skill clear`

## Safety

- **Temporary only** — never modifies permanent skill directories
- **No scripts** — only fetches SKILL.md files, no executables
- **Max 50 skills** — prevents context bloat
- **User-initiated** — no automatic background fetching

## Compatibility

| Tool | Install Method |
|---|---|
| Kilo | `cp temp-skill/ ~/.config/kilo/skills/` |
| Claude Code | `cp temp-skill/ ~/.claude/skills/` |
| Cursor | `cp temp-skill/ ~/.cursor/skills/` |
| GitHub Copilot | `cp temp-skill/ ~/.copilot/skills/` |
| Windsurf | `cp temp-skill/ ~/.windsurf/skills/` |
| Gemini CLI | `cp temp-skill/ ~/.gemini/skills/` |
| Cline | `cp temp-skill/ ~/.cline/skills/` |
| Any agent | Copy `temp-skill/` to the agent's skills directory |

## Changelog

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
