#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const SKILLS_DIR = path.join(require('os').homedir(), '.config', 'kilo', 'skills', '.temp');
const FROZEN_DIR = path.join(require('os').homedir(), '.config', 'kilo', 'skills', '.frozen');
const SESSION_FILE = path.join(SKILLS_DIR, '.session');
const MAX_SKILLS = 50;
const MAX_REDIRECTS = 10;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_RESPONSE_BYTES = 1024 * 1024;
const SESSION_MAX_AGE_MS = 4 * 60 * 60 * 1000; // 4 hours

function getSessionId() {
  return process.env.OPENCLAUDE_SESSION_ID
    || process.env.CLAUDE_SESSION_ID
    || process.env.KILO_SESSION_ID
    || `pid-${process.ppid}-${Math.floor(Date.now() / SESSION_MAX_AGE_MS)}`;
}

function readSession() {
  try {
    if (!fs.existsSync(SESSION_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    return data;
  } catch { return null; }
}

function writeSession(id) {
  fs.mkdirSync(SKILLS_DIR, { recursive: true });
  fs.writeFileSync(SESSION_FILE, JSON.stringify({ id, started: Date.now() }));
}

function hasExplicitSession() {
  return !!(process.env.OPENCLAUDE_SESSION_ID || process.env.CLAUDE_SESSION_ID || process.env.KILO_SESSION_ID);
}

function checkSession() {
  if (!hasExplicitSession()) {
    // No explicit session ID — just update the marker, no auto-cleanup
    writeSession(getSessionId());
    return;
  }
  const currentId = getSessionId();
  const existing = readSession();
  if (existing && existing.id !== currentId) {
    // Session changed — auto-clear old skills
    const dirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory());
    for (const d of dirs) {
      fs.rmSync(path.join(SKILLS_DIR, d.name), { recursive: true, force: true });
    }
    console.log(`Session changed (was: ${existing.id.substring(0, 20)}…). Cleared ${dirs.length} old temp skill(s).`);
  }
  writeSession(currentId);
}

function sanitizeName(name) {
  const result = name
    .replace(/[\x00-\x1f]/g, '')
    .replace(/[\/\\:*?"<>|]/g, '-')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .replace(/^-+|-+$/g, '')
    .trim() || 'unnamed';
  return result;
}

function resolveUrl(input) {
  input = input.trim();
  
  if (input.match(/^[a-zA-Z0-9]/) && !input.includes('://')) {
    input = 'https://' + input;
  }
  
  const githubMatch = input.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+)\/(.+))?/);
  if (githubMatch) {
    const [, user, repo, branch, skillPath] = githubMatch;
    const b = branch || 'main';
    const p = skillPath || '';
    if (p && p.endsWith('.md')) {
      return `https://raw.githubusercontent.com/${user}/${repo}/${b}/${p}`;
    }
    return `https://raw.githubusercontent.com/${user}/${repo}/${b}/${p ? p + '/' : ''}SKILL.md`;
  }
  
  // Raw GitHub URL
  if (input.includes('raw.githubusercontent.com')) {
    return input;
  }
  
  // Other URL
  return input;
}

function fetchUrl(url, redirectCount) {
  if (redirectCount === undefined) redirectCount = 0;
  return new Promise((resolve, reject) => {
    if (redirectCount > MAX_REDIRECTS) {
      return reject(new Error(`Too many redirects (max ${MAX_REDIRECTS})`));
    }
    
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const req = client.get(url, { headers: { 'User-Agent': 'deepfreeze/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return fetchUrl(res.headers.location, redirectCount + 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let bytes = 0;
      let data = '';
      res.on('data', chunk => {
        bytes += chunk.length;
        if (bytes > MAX_RESPONSE_BYTES) {
          res.destroy();
          return reject(new Error(`Response exceeds ${MAX_RESPONSE_BYTES} bytes limit`));
        }
        data += chunk;
      });
      res.on('end', () => resolve(data));
    });
    
    req.on('error', reject);
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy();
      reject(new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`));
    });
  });
}

function parseFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return null;
  const nameMatch = match[1].match(/^name:\s*(.+)$/m);
  const descMatch = match[1].match(/^description:\s*(.+)$/m);
  return {
    name: nameMatch ? nameMatch[1].trim() : null,
    description: descMatch ? descMatch[1].trim() : null
  };
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // Auto-clear stale session skills on any command
  if (command && command !== 'help' && command !== '--help' && command !== '-h') {
    checkSession();
  }

  if (!command || command === '--help' || command === '-h' || command === 'help') {
    console.log(`
deepfreeze — Load agent skills temporarily without permanent installation

Usage:
  deepfreeze load <url>        Load a skill from URL (GitHub or raw)
  deepfreeze list              List loaded temp skills
  deepfreeze freeze <name>     Pin a temp skill (persists across sessions)
  deepfreeze unfreeze <name>   Unpin a frozen skill (returns to temp)
  deepfreeze frozen            List frozen (pinned) skills
  deepfreeze session           Show session info and loaded skill count
  deepfreeze clear             Remove all temp skills (frozen skills untouched)
  deepfreeze help              Show this help

Modes:
  Temp    — auto-cleanup on session restart, mutable
  Frozen  — persists across sessions, protected from auto-cleanup

Auto-cleanup: temp skills are removed when a new session starts.
Set OPENCLAUDE_SESSION_ID or CLAUDE_SESSION_ID env var for explicit sessions.

Examples:
  deepfreeze load https://github.com/vercel-labs/agent-skills
  deepfreeze freeze pdf        Pin 'pdf' skill so it survives restarts
  deepfreeze unfreeze pdf      Return 'pdf' to temp (auto-cleanup again)
  deepfreeze frozen            Show pinned skills

Max ${MAX_SKILLS} skills per session. Temp: ${SKILLS_DIR}
Frozen: ${FROZEN_DIR}
`);
    return;
  }
  
  if (command === 'list') {
    if (!fs.existsSync(SKILLS_DIR)) {
      console.log('No temp skills loaded.');
      return;
    }
    const dirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true }).filter(d => d.isDirectory());
    if (dirs.length === 0) {
      console.log('No temp skills loaded.');
      return;
    }
    console.log(`Temp skills (${dirs.length}/${MAX_SKILLS}):`);
    dirs.forEach((d, i) => {
      const skillFile = path.join(SKILLS_DIR, d.name, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        const meta = parseFrontmatter(fs.readFileSync(skillFile, 'utf8'));
        console.log(`  ${i + 1}. ${d.name}${meta && meta.description ? ' — ' + meta.description.substring(0, 80) : ''}`);
      }
    });
    return;
  }
  
  if (command === 'clear') {
    const clearAll = args[1] === '--all';
    let cleared = 0;
    if (fs.existsSync(SKILLS_DIR)) {
      const dirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true }).filter(d => d.isDirectory());
      fs.rmSync(SKILLS_DIR, { recursive: true, force: true });
      cleared += dirs.length;
      console.log(`Cleared ${dirs.length} temp skill(s).`);
    } else {
      console.log('No temp skills to clear.');
    }
    if (clearAll && fs.existsSync(FROZEN_DIR)) {
      const dirs = fs.readdirSync(FROZEN_DIR, { withFileTypes: true }).filter(d => d.isDirectory());
      fs.rmSync(FROZEN_DIR, { recursive: true, force: true });
      cleared += dirs.length;
      console.log(`Cleared ${dirs.length} frozen skill(s).`);
    }
    return;
  }

  if (command === 'session') {
    const session = readSession();
    const dirs = fs.existsSync(SKILLS_DIR)
      ? fs.readdirSync(SKILLS_DIR, { withFileTypes: true }).filter(d => d.isDirectory())
      : [];
    const frozen = fs.existsSync(FROZEN_DIR)
      ? fs.readdirSync(FROZEN_DIR, { withFileTypes: true }).filter(d => d.isDirectory())
      : [];
    const envSession = process.env.OPENCLAUDE_SESSION_ID || process.env.CLAUDE_SESSION_ID || process.env.KILO_SESSION_ID;
    console.log(`Session ID: ${session ? session.id.substring(0, 40) : 'none'}`);
    if (envSession) console.log(`Source: environment variable`);
    else console.log(`Source: auto-generated (pid-based)`);
    if (session) console.log(`Started: ${new Date(session.started).toISOString()}`);
    console.log(`Temp skills: ${dirs.length}/${MAX_SKILLS}`);
    console.log(`Frozen skills: ${frozen.length}`);
    return;
  }

  if (command === 'freeze') {
    const name = args[1];
    if (!name) {
      console.error('Error: provide a skill name. Example: deepfreeze freeze pdf');
      process.exit(1);
    }
    const safeName = sanitizeName(name);
    const srcDir = path.join(SKILLS_DIR, safeName);
    if (!fs.existsSync(srcDir)) {
      console.error(`Error: temp skill '${safeName}' not found. Run 'deepfreeze list' to see loaded skills.`);
      process.exit(1);
    }
    fs.mkdirSync(FROZEN_DIR, { recursive: true });
    const destDir = path.join(FROZEN_DIR, safeName);
    if (fs.existsSync(destDir)) {
      console.error(`Error: skill '${safeName}' is already frozen.`);
      process.exit(1);
    }
    fs.renameSync(srcDir, destDir);
    console.log(`Frozen '${safeName}' — will persist across sessions.`);
    return;
  }

  if (command === 'unfreeze') {
    const name = args[1];
    if (!name) {
      console.error('Error: provide a skill name. Example: deepfreeze unfreeze pdf');
      process.exit(1);
    }
    const safeName = sanitizeName(name);
    const srcDir = path.join(FROZEN_DIR, safeName);
    if (!fs.existsSync(srcDir)) {
      console.error(`Error: frozen skill '${safeName}' not found. Run 'deepfreeze frozen' to see frozen skills.`);
      process.exit(1);
    }
    fs.mkdirSync(SKILLS_DIR, { recursive: true });
    const destDir = path.join(SKILLS_DIR, safeName);
    if (fs.existsSync(destDir)) {
      console.error(`Error: temp skill '${safeName}' already exists. Clear it first.`);
      process.exit(1);
    }
    fs.renameSync(srcDir, destDir);
    console.log(`Unfrozen '${safeName}' — returned to temp (auto-cleanup on restart).`);
    return;
  }

  if (command === 'frozen') {
    if (!fs.existsSync(FROZEN_DIR)) {
      console.log('No frozen skills.');
      return;
    }
    const dirs = fs.readdirSync(FROZEN_DIR, { withFileTypes: true }).filter(d => d.isDirectory());
    if (dirs.length === 0) {
      console.log('No frozen skills.');
      return;
    }
    console.log(`Frozen skills (${dirs.length}):`);
    dirs.forEach((d, i) => {
      const skillFile = path.join(FROZEN_DIR, d.name, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        const meta = parseFrontmatter(fs.readFileSync(skillFile, 'utf8'));
        console.log(`  ${i + 1}. ${d.name}${meta && meta.description ? ' — ' + meta.description.substring(0, 80) : ''}`);
      }
    });
    return;
  }
  
  if (command === 'load') {
    const url = args[1];
    if (!url) {
      console.error('Error: provide a URL. Example: deepfreeze load https://github.com/user/repo');
      process.exit(1);
    }
    
    // Check limit
    if (fs.existsSync(SKILLS_DIR)) {
      const count = fs.readdirSync(SKILLS_DIR, { withFileTypes: true }).filter(d => d.isDirectory()).length;
      if (count >= MAX_SKILLS) {
        console.error(`Error: session limit reached (${count}/${MAX_SKILLS}). Run 'deepfreeze clear' to free slots.`);
        process.exit(1);
      }
    }
    
    const resolved = resolveUrl(url);
    
    if (!resolved.startsWith('https://')) {
      console.error('Error: only HTTPS URLs are allowed for security. Use an https:// URL.');
      process.exit(1);
    }
    
    console.log(`Fetching: ${resolved}`);
    
    try {
      const content = await fetchUrl(resolved);
      const meta = parseFrontmatter(content);
      
      if (!meta || !meta.name) {
        console.error('Error: not a valid SKILL.md (missing frontmatter or name field).');
        process.exit(1);
      }
      
      const safeName = sanitizeName(meta.name);
      const skillDir = path.join(SKILLS_DIR, safeName);
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content);
      
      console.log(`Loaded temp skill '${safeName}' from ${url}`);
      console.log(`Saved to: ${skillDir}`);
      if (meta.description) {
        console.log(`Description: ${meta.description.substring(0, 120)}`);
      }
    } catch (err) {
      console.error(`Error fetching skill: ${err.message}`);
      process.exit(1);
    }
    return;
  }
  
  console.error(`Unknown command: ${command}. Run 'deepfreeze help' for usage.`);
  process.exit(1);
}

main();
