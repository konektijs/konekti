#!/usr/bin/env node

const { runCreateKonekti } = await import('../dist/index.js');

await runCreateKonekti(process.argv.slice(2));
