import { printBanner, printSuccess, printError, printInfo, printDivider, c } from './banner';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export async function runStatus(): Promise<void> {
  printBanner();
  console.log(`  ${c.bold}CogxAI Status${c.reset}\n`);

  const home = os.homedir();
  let found = false;

  // Check project-level .mcp.json
  const projectMcp = path.resolve(process.cwd(), '.mcp.json');
  if (fs.existsSync(projectMcp)) {
    try {
      const data = JSON.parse(fs.readFileSync(projectMcp, 'utf-8'));
      if (data.mcpServers?.['cogxai-memory']) {
        printSuccess('MCP configured (project): .mcp.json');
        const env = data.mcpServers['cogxai-memory'].env || {};
        if (env.COGXAI_LOCAL === 'true' || data.mcpServers['cogxai-memory'].args?.includes('--local')) {
          printInfo('  Mode: local (offline, SQLite)');
        } else if (env.CORTEX_API_KEY) {
          printInfo('  Mode: hosted (cogxai.org)');
          printInfo(`  Agent: ${env.COGXAI_AGENT_NAME || 'unnamed'}`);
        } else {
          printInfo('  Mode: self-hosted');
        }
        found = true;
      }
    } catch {}
  }

  // Check global ~/.claude.json
  const globalClaude = path.join(home, '.claude.json');
  if (fs.existsSync(globalClaude)) {
    try {
      const data = JSON.parse(fs.readFileSync(globalClaude, 'utf-8'));
      if (data.mcpServers?.['cogxai-memory']) {
        printSuccess('MCP configured (global): ~/.claude.json');
        const env = data.mcpServers['cogxai-memory'].env || {};
        if (env.COGXAI_LOCAL === 'true' || data.mcpServers['cogxai-memory'].args?.includes('--local')) {
          printInfo('  Mode: local (offline, SQLite)');
        } else if (env.CORTEX_API_KEY) {
          printInfo('  Mode: hosted (cogxai.org)');
        } else {
          printInfo('  Mode: self-hosted');
        }
        found = true;
      }
    } catch {}
  }

  // Check Claude Desktop config
  let desktopPath = '';
  if (process.platform === 'darwin') {
    desktopPath = path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  } else if (process.platform === 'win32') {
    desktopPath = path.join(home, 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json');
  } else {
    desktopPath = path.join(home, '.config', 'Claude', 'claude_desktop_config.json');
  }
  if (fs.existsSync(desktopPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(desktopPath, 'utf-8'));
      if (data.mcpServers?.['cogxai-memory']) {
        printSuccess('MCP configured: Claude Desktop');
        found = true;
      }
    } catch {}
  }

  // Check Cursor
  const cursorPath = path.join(home, '.cursor', 'mcp.json');
  if (fs.existsSync(cursorPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(cursorPath, 'utf-8'));
      if (data.mcpServers?.['cogxai-memory']) {
        printSuccess('MCP configured: Cursor');
        found = true;
      }
    } catch {}
  }

  if (!found) {
    printError('CogxAI is not installed in any IDE');
    console.log(`\n  Run ${c.cyan}npx cogxai mcp-install${c.reset} to get started.\n`);
    return;
  }

  // Try to get memory stats if hosted
  console.log('');
  try {
    const apiKey = process.env.CORTEX_API_KEY;
    if (apiKey) {
      const res = await fetch('https://cogxai.org/api/cortex/stats', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (res.ok) {
        const stats = await res.json() as any;
        printInfo(`  Memories: ${stats.total || 0}`);
        printInfo(`  Dream sessions: ${stats.totalDreamSessions || 0}`);
      }
    }
  } catch {}

  printDivider();
  console.log('');
}
