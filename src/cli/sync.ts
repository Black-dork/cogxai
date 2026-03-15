import { printBanner, printSuccess, printError, printInfo, printDivider, c } from './banner';
import * as fs from 'fs';
import * as path from 'path';

export async function runSync(): Promise<void> {
  printBanner();
  console.log(`  ${c.bold}Sync Memory Context${c.reset}\n`);

  const apiKey = process.env.CORTEX_API_KEY;
  const isLocal = process.argv.includes('--local') || process.env.COGXAI_LOCAL === 'true';

  if (!apiKey && !isLocal) {
    printError('CORTEX_API_KEY not set. Run npx cogxai register first.');
    printInfo('Or use --local for offline mode.');
    return;
  }

  const outputFile = process.argv[3] || 'COGXAI_CONTEXT.md';

  try {
    let memories: any[] = [];

    if (isLocal) {
      // Local mode — read from SQLite
      try {
        const { localRecall } = require('../mcp/local-store');
        memories = localRecall({ limit: 50 });
      } catch {
        printError('Local store not available. Store some memories first.');
        return;
      }
    } else {
      // Hosted mode — fetch from API
      const res = await fetch('https://cogxai.org/api/cortex/recent?hours=168&limit=50', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        printError(`API error: ${res.status}`);
        return;
      }
      const data = await res.json() as any;
      memories = data.memories || [];
    }

    if (memories.length === 0) {
      printInfo('No memories found. Store some memories first.');
      return;
    }

    // Generate markdown context file
    const lines = [
      '# CogxAI Memory Context',
      '',
      `> Auto-generated on ${new Date().toISOString().slice(0, 10)}`,
      `> ${memories.length} memories`,
      '',
      '---',
      '',
    ];

    for (const mem of memories) {
      const type = mem.memory_type || mem.type || 'unknown';
      const summary = mem.summary || '';
      const content = mem.content || '';
      const tags = (mem.tags || []).join(', ');
      const importance = mem.importance || 0;

      lines.push(`## [${type}] ${summary}`);
      lines.push('');
      lines.push(content);
      lines.push('');
      if (tags) lines.push(`Tags: ${tags}`);
      lines.push(`Importance: ${importance.toFixed(2)}`);
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    fs.writeFileSync(outputFile, lines.join('\n'), 'utf-8');
    printSuccess(`Context written to ${outputFile}`);
    printInfo(`${memories.length} memories exported as markdown`);
    printInfo('Add this file to your project so AI assistants can read it.');
  } catch (err) {
    printError(`Sync failed: ${(err as Error).message}`);
  }

  printDivider();
  console.log('');
}
