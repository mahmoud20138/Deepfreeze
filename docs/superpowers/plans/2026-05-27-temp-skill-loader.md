# temp-skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a Kilo skill that fetches remote SKILL.md files from GitHub repos or raw URLs, caches them in a session-scoped temp directory, and makes them available via the Skill tool — without permanent installation.

**Architecture:** Single SKILL.md file that instructs the agent to use built-in tools (`webfetch`, `bash`, `Skill`) to fetch, cache, and load remote skills. No scripts or external dependencies.

**Tech Stack:** Markdown (SKILL.md format), PowerShell (file operations on Windows), webfetch (HTTP fetching)

---

## File Structure

```
temp-skill/
└── SKILL.md           # Main skill instructions
```

Only one file to create. The SKILL.md will contain all the logic the agent needs to fetch, cache, load, and cleanup temp skills.

---

### Task 1: Create skill directory and SKILL.md frontmatter

**Files:**
- Create: `temp-skill/SKILL.md`

- [ ] **Step 1: Create the temp-skill directory**

```bash
# On Windows (PowerShell)
New-Item -ItemType Directory -Path "temp-skill" -Force

# On macOS/Linux
mkdir -p temp-skill
```

- [ ] **Step 2: Write SKILL.md with frontmatter and description**

Create `temp-skill/SKILL.md` with the following frontmatter:

```markdown
---
name: temp-skill
description: Load and use skills from the internet temporarily without permanent installation. Use when user wants to fetch a skill from a GitHub repo URL, raw URL, or any HTTP link to a SKILL.md file, or says "load temp skill", "fetch skill from", "use this skill temporarily", or "temp skill".
argument-hint: "URL of the skill to load (GitHub repo or raw SKILL.md URL)"
---
```

- [ ] **Step 3: Verify frontmatter is valid**

Read back the file and confirm `name:` and `description:` fields are present and the description includes trigger phrases.

---

### Task 2: Write the Quick Start section

**Files:**
- Modify: `temp-skill/SKILL.md`

- [ ] **Step 1: Add Quick Start section**

Append to `temp-skill/SKILL.md`:

```markdown
# Temp Skill Loader

Load skills from the internet without installing them permanently. Skills are cached in a session-scoped temp directory and cleaned up on demand.

## Quick Start

```
User: load temp skill from https://github.com/vercel-labs/agent-skills
Agent: Fetches, caches, and loads the skill for this session.
```

**Supported URL formats:**
- GitHub repo: `https://github.com/user/repo` → fetches `SKILL.md` from repo root
- GitHub subfolder: `https://github.com/user/repo/tree/main/path` → fetches `SKILL.md` from that path
- Raw URL: `https://example.com/SKILL.md` → fetches directly
- Raw GitHub: `https://raw.githubusercontent.com/...` → fetches directly
```

- [ ] **Step 2: Verify Quick Start renders correctly**

Read back the file and confirm the markdown formatting is correct.

---

### Task 3: Write the URL Resolution workflow

**Files:**
- Modify: `temp-skill/SKILL.md`

- [ ] **Step 1: Add URL Resolution section**

Append to `temp-skill/SKILL.md`:

```markdown
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
```

- [ ] **Step 2: Verify URL resolution table is complete**

Read back the file and confirm all URL patterns are covered.

---

### Task 4: Write the Fetch & Cache workflow

**Files:**
- Modify: `temp-skill/SKILL.md`

- [ ] **Step 1: Add Fetch & Cache section**

Append to `temp-skill/SKILL.md`:

```markdown
## Fetching & Caching

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
```

- [ ] **Step 2: Verify fetch workflow is complete**

Read back the file and confirm all 5 steps are present and clear.

---

### Task 5: Write the Loading into Context workflow

**Files:**
- Modify: `temp-skill/SKILL.md`

- [ ] **Step 1: Add Loading section**

Append to `temp-skill/SKILL.md`:

```markdown
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
```

- [ ] **Step 2: Verify loading section covers both methods**

Read back the file and confirm both Skill tool and Read fallback are documented.

---

### Task 6: Write the Cleanup workflow

**Files:**
- Modify: `temp-skill/SKILL.md`

- [ ] **Step 1: Add Cleanup section**

Append to `temp-skill/SKILL.md`:

```markdown
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
```

- [ ] **Step 2: Verify cleanup workflow is complete**

Read back the file and confirm cleanup steps are clear.

---

### Task 7: Write the Error Handling section

**Files:**
- Modify: `temp-skill/SKILL.md`

- [ ] **Step 1: Add Error Handling section**

Append to `temp-skill/SKILL.md`:

```markdown
## Error Handling

| Error | Response |
|---|---|
| Invalid URL format | "The URL doesn't appear to be valid. Please provide a GitHub repo URL or a direct link to a SKILL.md file." |
| Fetch fails (404) | "Could not find a skill at that URL. Please check the URL and try again." |
| Fetch fails (network) | "Network error while fetching the skill. Please check your connection and try again." |
| No frontmatter in response | "The content at that URL doesn't appear to be a valid SKILL.md file (missing frontmatter)." |
| Missing `name:` field | Use the last path segment of the URL as the skill name. Inform the user: "No skill name found in frontmatter, using '{segment}' as the name." |
| Skill name conflicts with installed skill | Warn the user: "A skill named '{name}' is already installed. The temp version will be loaded instead for this session." |

## Important Notes

- This skill only fetches SKILL.md files — no scripts, no executables
- Each fetch is user-initiated — no automatic background fetching
- Cached skills persist until manually cleaned up ("clear temp skills")
- Re-fetching the same URL overwrites the cached version
```

- [ ] **Step 2: Verify error handling covers all cases from spec**

Read back the file and cross-reference with the spec's Error Handling table.

---

### Task 8: Final verification

**Files:**
- Read: `temp-skill/SKILL.md`

- [ ] **Step 1: Read the complete SKILL.md file**

Read the entire file and verify:
- Frontmatter is valid (has `name:`, `description:`, `argument-hint:`)
- All sections are present: Quick Start, URL Resolution, Fetching & Caching, Loading into Context, Cleanup, Error Handling
- No placeholders (TBD, TODO, etc.)
- Markdown formatting is correct
- PowerShell commands are Windows-compatible
- Total file is under 150 lines

- [ ] **Step 2: Verify file structure**

```bash
# On Windows (PowerShell)
Get-ChildItem "temp-skill" -Recurse

# On macOS/Linux
find temp-skill -type f
```

Expected: Single file `SKILL.md` in `temp-skill/` directory.

- [ ] **Step 3: Commit the skill**

```bash
git init
git add temp-skill/
git commit -m "feat: add temp-skill loader skill"
```
