#!/usr/bin/env node

import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

const target = process.argv[2] ?? 'dist';

rmSync(resolve(process.cwd(), target), { force: true, recursive: true });
