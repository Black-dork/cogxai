#!/usr/bin/env node

const command = process.argv[2];

if (command === 'setup') {
  const { runSetup } = require('./setup');
  runSetup().catch((err: Error) => {
    console.error('Setup failed:', err.message);
    process.exit(1);
  });
} else if (command === 'init') {
  const { runInit } = require('./init');
  runInit().catch((err: Error) => {
    console.error('Init failed:', err.message);
    process.exit(1);
  });
} else if (command === 'register') {
  const { runRegister } = require('./register');
  runRegister().catch((err: Error) => {
    console.error('Registration failed:', err.message);
    process.exit(1);
  });
} else if (command === 'mcp-install') {
  const { runMcpInstall } = require('./setup');
  runMcpInstall().catch((err: Error) => {
    console.error('MCP install failed:', err.message);
    process.exit(1);
  });
} else if (command === 'ship') {
  const message = process.argv.slice(3).join(' ');
  const { runShip } = require('./ship');
  runShip(message).catch((err: Error) => {
    console.error('Ship failed:', err.message);
    process.exit(1);
  });
} else if (command === 'export') {
  const { runExport } = require('./export');
  runExport().catch((err: Error) => {
    console.error('Export failed:', err.message);
    process.exit(1);
  });
} else if (command === 'mcp-serve') {
  // Start the MCP server (used by IDE integrations)
  require('../mcp/server');
} else if (command === 'start' || command === 'bot') {
  // Start the full CogxAI bot (requires env config)
  require('../index');
} else if (command === 'version' || command === '--version' || command === '-v') {
  const pkg = require('../../package.json');
  console.log(pkg.version);
} else {
  // Default: show banner + help (including bare `npx cogxai`)
  const { printBanner, c } = require('./banner');
  printBanner();
  console.log(`  ${c.bold}Quick start:${c.reset}\n`);
  console.log(`    ${c.cyan}npx cogxai setup${c.reset}         ${c.dim}← start here${c.reset}`);
  console.log(`    ${c.dim}Register + create .env + install MCP in ~30 seconds${c.reset}\n`);
  console.log(`  ${c.bold}Commands:${c.reset}\n`);
  console.log(`    ${c.cyan}npx cogxai setup${c.reset}         Guided setup (register + config + MCP)`);
  console.log(`    ${c.cyan}npx cogxai init${c.reset}          Advanced setup (self-hosted options)`);
  console.log(`    ${c.cyan}npx cogxai register${c.reset}      Get an API key only`);
  console.log(`    ${c.cyan}npx cogxai mcp-install${c.reset}   Install MCP server for your IDE`);
  console.log(`    ${c.cyan}npx cogxai export${c.reset}        Export memories to file`);
  console.log(`    ${c.cyan}npx cogxai ship "msg"${c.reset}    Broadcast to Telegram channel`);
  console.log(`    ${c.cyan}npx cogxai start${c.reset}         Start the CogxAI bot\n`);
  console.log(`  ${c.bold}As a library:${c.reset}\n`);
  console.log(`    ${c.dim}const { Cortex } = require('cogxai');${c.reset}`);
  console.log(`    ${c.dim}const brain = new Cortex({ hosted: { apiKey } });${c.reset}`);
  console.log(`    ${c.dim}await brain.init();${c.reset}\n`);
  console.log(`  ${c.dim}Docs: https://cogxai.org/docs${c.reset}\n`);
}
