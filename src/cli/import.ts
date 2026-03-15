import { printBanner, printSuccess, printError, printInfo, printDivider, c } from './banner';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => rl.question(`  ${question}`, resolve));
}

export async function runImport(): Promise<void> {
  printBanner();
  console.log(`  ${c.bold}Import Memories${c.reset}\n`);

  const filePath = process.argv[3];
  if (!filePath) {
    console.log(`  Usage: ${c.cyan}npx cogxai import <file>${c.reset}\n`);
    console.log(`  Supported formats:`);
    console.log(`    ${c.dim}• JSON (cogxai export format)${c.reset}`);
    console.log(`    ${c.dim}• ChatGPT export (conversations.json)${c.reset}`);
    console.log(`    ${c.dim}• Markdown (.md files)${c.reset}\n`);
    return;
  }

  if (!fs.existsSync(filePath)) {
    printError(`File not found: ${filePath}`);
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const raw = fs.readFileSync(filePath, 'utf-8');
  let memories: Array<{ content: string; summary: string; type: string; tags: string[]; importance: number }> = [];

  try {
    if (ext === '.json') {
      const data = JSON.parse(raw);

      // CogxAI export format
      if (Array.isArray(data.memories)) {
        memories = data.memories.map((m: any) => ({
          content: m.content || '',
          summary: m.summary || m.content?.slice(0, 100) || '',
          type: m.memory_type || m.type || 'episodic',
          tags: m.tags || [],
          importance: m.importance || 0.5,
        }));
        printInfo(`Detected: CogxAI export (${memories.length} memories)`);
      }
      // ChatGPT export format
      else if (Array.isArray(data)) {
        for (const conv of data) {
          const title = conv.title || 'Untitled';
          const messages = Object.values(conv.mapping || {}) as any[];
          for (const node of messages) {
            const msg = node?.message;
            if (msg?.content?.parts?.[0] && msg.author?.role === 'assistant') {
              const text = msg.content.parts[0];
              if (typeof text === 'string' && text.length > 20) {
                memories.push({
                  content: text.slice(0, 2000),
                  summary: `${title}: ${text.slice(0, 100)}`,
                  type: 'episodic',
                  tags: ['imported', 'chatgpt'],
                  importance: 0.5,
                });
              }
            }
          }
        }
        printInfo(`Detected: ChatGPT export (${memories.length} messages)`);
      }
    } else if (ext === '.md' || ext === '.markdown') {
      // Split by headings
      const sections = raw.split(/^#{1,3}\s+/m).filter(s => s.trim().length > 20);
      memories = sections.map(s => {
        const lines = s.trim().split('\n');
        const title = lines[0]?.trim() || 'Untitled';
        return {
          content: s.trim().slice(0, 2000),
          summary: title.slice(0, 100),
          type: 'semantic' as const,
          tags: ['imported', 'markdown'],
          importance: 0.5,
        };
      });
      printInfo(`Detected: Markdown (${memories.length} sections)`);
    }
  } catch (err) {
    printError(`Failed to parse file: ${(err as Error).message}`);
    return;
  }

  if (memories.length === 0) {
    printError('No memories found in file');
    return;
  }

  console.log(`\n  Found ${c.bold}${memories.length}${c.reset} memories to import.\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const confirm = await ask(rl, `Import ${memories.length} memories? (y/N) `);
  rl.close();

  if (confirm.toLowerCase() !== 'y') {
    printInfo('Cancelled.');
    return;
  }

  // Check for API key
  const apiKey = process.env.CORTEX_API_KEY;
  if (!apiKey) {
    printError('CORTEX_API_KEY not set. Run npx cogxai register first.');
    return;
  }

  let imported = 0;
  let failed = 0;

  for (const mem of memories) {
    try {
      const res = await fetch('https://cogxai.org/api/cortex/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(mem),
      });
      if (res.ok) imported++;
      else failed++;
    } catch {
      failed++;
    }
  }

  console.log('');
  printSuccess(`Imported: ${imported} memories`);
  if (failed > 0) printError(`Failed: ${failed}`);
  printDivider();
  console.log('');
}
