import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import type { BootstrapAnswers, BootstrapPrompt, DatabaseFamily, OrmFamily, PackageManager, SupportTier } from './types.js';

const PROMPTS: BootstrapPrompt[] = [
  { key: 'projectName', label: 'Project name' },
  { key: 'orm', label: 'ORM' },
  { key: 'database', label: 'Database' },
  { key: 'packageManager', label: 'Package manager' },
  { key: 'tierNote', label: 'Tier note' },
  { key: 'targetDirectory', label: 'Target directory' },
];

export function getBootstrapPrompts(): BootstrapPrompt[] {
  return [...PROMPTS];
}

export function resolveSupportTier(orm: OrmFamily, database: DatabaseFamily): SupportTier {
  if (orm === 'Prisma' && database === 'PostgreSQL') {
    return 'recommended';
  }

  if ((orm === 'Prisma' && database === 'MySQL') || (orm === 'Drizzle' && database === 'PostgreSQL')) {
    return 'official';
  }

  return 'preview';
}

export function createTierNote(orm: OrmFamily, database: DatabaseFamily): string {
  const tier = resolveSupportTier(orm, database);

  if (tier === 'recommended') {
    return 'Using the recommended preset.';
  }

  if (tier === 'official') {
    return 'This combination is officially supported, but the recommended default is Prisma + PostgreSQL.';
  }

  return 'This combination is in preview. Core support exists, but docs/examples/test coverage may be narrower than the recommended path.';
}

export async function promptForBootstrapAnswers(
  partial: Partial<BootstrapAnswers> = {},
): Promise<BootstrapAnswers> {
  const rl = createInterface({ input, output });

  try {
    const projectName = partial.projectName ?? (await rl.question('Project name: '));
    const orm = (partial.orm ?? (await rl.question('ORM (Prisma/Drizzle): '))) as OrmFamily;
    const database = (partial.database ?? (await rl.question('Database (PostgreSQL/MySQL): '))) as DatabaseFamily;
    const packageManager = (partial.packageManager ?? (await rl.question('Package manager (pnpm/npm/yarn): '))) as PackageManager;
    const targetDirectory = partial.targetDirectory ?? (await rl.question(`Target directory (default: ./${projectName}): `));

    return {
      database,
      orm,
      packageManager,
      projectName,
      targetDirectory: targetDirectory || `./${projectName}`,
    };
  } finally {
    rl.close();
  }
}

export const getCreateKonektiPrompts = getBootstrapPrompts;
export const promptForCreateKonektiAnswers = promptForBootstrapAnswers;
