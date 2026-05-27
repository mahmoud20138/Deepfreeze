#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const SKILLS_DIR = path.join(require('os').homedir(), '.config', 'kilo', 'skills', '.temp');
const MAX_SKILLS = 50;

function resolveUrl(input) {
  input = input.trim();
  
  // GitHub blob URL
  const githubMatch = input.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+)\/(.+))?/);
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

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'temp-skill-loader/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
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
  
  if (!command || command === '--help' || command === '-h') {
    console.log(`
temp-skill — Load agent skills temporarily without permanent installation

Usage:
  temp-skill load <url>        Load a skill from URL (GitHub or raw)
  temp-skill list              List loaded temp skills
  temp-skill clear             Remove all temp skills
  temp-skill help              Show this help

Examples:
  temp-skill load https://github.com/vercel-labs/agent-skills
  temp-skill load https://github.com/anthropics/skills/tree/main/pdf
  temp-skill load https://raw.githubusercontent.com/user/repo/main/SKILL.md

Max ${MAX_SKILLS} skills per session. All skills stored in:
  ${SKILLS_DIR}
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
    if (fs.existsSync(SKILLS_DIR)) {
      fs.rmSync(SKILLS_DIR, { recursive: true, force: true });
      console.log('All temp skills cleared.');
    } else {
      console.log('No temp skills to clear.');
    }
    return;
  }
  
  if (command === 'load') {
    const url = args[1];
    if (!url) {
      console.error('Error: provide a URL. Example: temp-skill load https://github.com/user/repo');
      process.exit(1);
    }
    
    // Check limit
    if (fs.existsSync(SKILLS_DIR)) {
      const count = fs.readdirSync(SKILLS_DIR, { withFileTypes: true }).filter(d => d.isDirectory()).length;
      if (count >= MAX_SKILLS) {
        console.error(`Error: session limit reached (${count}/${MAX_SKILLS}). Run 'temp-skill clear' to free slots.`);
        process.exit(1);
      }
    }
    
    const resolved = resolveUrl(url);
    console.log(`Fetching: ${resolved}`);
    
    try {
      const content = await fetchUrl(resolved);
      const meta = parseFrontmatter(content);
      
      if (!meta || !meta.name) {
        console.error('Error: not a valid SKILL.md (missing frontmatter or name field).');
        process.exit(1);
      }
      
      const skillDir = path.join(SKILLS_DIR, meta.name);
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content);
      
      console.log(`Loaded temp skill '${meta.name}' from ${url}`);
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
  
  console.error(`Unknown command: ${command}. Run 'temp-skill help' for usage.`);
  process.exit(1);
}

main();
