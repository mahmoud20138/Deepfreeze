# Design: temp-skill — Load Skills from the Internet Without Installing

## Overview

A Kilo skill that fetches remote SKILL.md files from GitHub repos or raw URLs, caches them in a session-scoped temp directory, and makes them available via the Skill tool — all without permanent installation.

**Motivation:** Currently, using a skill requires installing it via `npx skills add` or manually placing files in the skills directory. This creates friction when you want to try a skill once or use someone else's skill temporarily. `temp-skill` eliminates this by fetching skills on-demand and caching them only for the session.

## Trigger & URL Resolution

### Natural Language Triggers

The skill activates when the user says something like:
- "load temp skill from https://github.com/user/repo"
- "fetch skill from https://example.com/SKILL.md"
- "use this skill temporarily: <url>"
- "temp skill <url>"

### URL Resolution Logic

| Input Format | Resolved To |
|---|---|
| `github.com/user/repo` | `raw.githubusercontent.com/user/repo/main/SKILL.md` |
| `github.com/user/repo/tree/branch/path` | `raw.githubusercontent.com/user/repo/branch/path/SKILL.md` |
| `raw.githubusercontent.com/...` | Used as-is |
| Any other HTTP(S) URL | Used as-is (must point to SKILL.md content) |

The skill instructs the agent to detect the URL type and convert GitHub blob URLs to raw URLs before fetching.

## Fetching & Caching

### Fetch Flow

1. Agent calls `webfetch` with the resolved raw URL (format: `text`)
2. Response content is validated — must contain frontmatter with `name:` and `description:` fields
3. Content is saved to `~/.config/kilo/skills/.temp/<skill-name>/SKILL.md`
4. The `<skill-name>` is extracted from the frontmatter `name:` field

### Cache Location

```
~/.config/kilo/skills/.temp/
├── <skill-name-1>/
│   └── SKILL.md
├── <skill-name-2>/
│   └── SKILL.md
└── ...
```

- Each skill gets its own subdirectory named after the skill's `name:` field
- The `.temp/` directory should be gitignored
- If a skill with the same name already exists in cache, it is overwritten (allows re-fetching updated versions)

## Loading into Context

After saving to the temp dir, the agent uses the `Skill` tool to load the skill by constructing the path:

```
~/.config/kilo/skills/.temp/<skill-name>/SKILL.md
```

This makes the skill content available in the conversation context, just like any installed skill.

**Fallback:** If the `Skill` tool cannot resolve the `.temp/` path (Kilo may not scan subdirectories), the agent reads the SKILL.md file directly with the `Read` tool and injects its content into the conversation context manually. This ensures the skill works regardless of Kilo's skill discovery behavior.

## Session Lifecycle

| Phase | Behavior |
|---|---|
| On load | Skill is fetched, cached, and loaded into context |
| During session | Can be re-invoked without re-fetching (cache hit check) |
| On session end | Temp dir persists for potential reuse in future sessions |
| Manual cleanup | User says "clear temp skills" → agent deletes `.temp/` directory |

### Cache Hit Detection

Before fetching, the agent checks if `~/.config/kilo/skills/.temp/<skill-name>/SKILL.md` already exists. If it does, the agent loads from cache instead of re-fetching. This avoids unnecessary network calls within a session.

### Cleanup Command

When the user says "clear temp skills" or "cleanup temp skills", the agent:
1. Lists contents of `~/.config/kilo/skills/.temp/`
2. Deletes the entire `.temp/` directory
3. Confirms cleanup to the user

## Skill File Structure

```
temp-skill/
└── SKILL.md
```

No scripts needed — the skill instructs the agent to use built-in tools:
- `webfetch` for fetching remote content
- `bash` for file operations (creating dirs, writing files, cleanup)
- `Skill` tool for loading the fetched skill into context

## Error Handling

| Error | Handling |
|---|---|
| Invalid URL | Agent reports URL format error, asks user to provide a valid URL |
| Fetch failure (404, network) | Agent reports fetch error with status code, suggests checking the URL |
| No frontmatter in response | Agent warns that the content doesn't appear to be a valid SKILL.md |
| Missing `name:` field | Agent uses the last URL path segment as the skill name |
| Skill name conflict | Overwrites existing cache entry (same name = same skill) |

## Security Considerations

- Only fetches from user-provided URLs (no automatic fetching)
- Content is saved to a local temp directory (no execution of remote code)
- The skill only loads SKILL.md content — no scripts or executables are fetched
- User must explicitly request each fetch (no background fetching)

## Example Usage

```
User: load temp skill from https://github.com/vercel-labs/agent-skills
Agent: 
1. Resolves URL → raw.githubusercontent.com/vercel-labs/agent-skills/main/SKILL.md
2. Fetches content via webfetch
3. Extracts name from frontmatter (e.g., "react-best-practices")
4. Saves to ~/.config/kilo/skills/.temp/react-best-practices/SKILL.md
5. Loads skill via Skill tool
6. "Loaded temp skill 'react-best-practices' from vercel-labs/agent-skills. It's now available for this session."

User: clear temp skills
Agent:
1. Deletes ~/.config/kilo/skills/.temp/
2. "Cleared all temp skills from cache."
```
