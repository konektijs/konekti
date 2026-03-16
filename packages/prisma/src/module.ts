import type { Provider } from '@konekti/di';
import { defineModule, type ModuleType } from '@konekti/runtime';

import { PrismaService } from './service.js';
import { PRISMA_CLIENT, PRISMA_OPTIONS } from './tokens.js';
import { PrismaTransactionInterceptor } from './transaction.js';
import type { PrismaClientLike, PrismaModuleOptions } from './types.js';

export function createPrismaProviders<TClient extends PrismaClientLike<TTransactionClient>, TTransactionClient = TClient>(
  options: PrismaModuleOptions<TClient, TTransactionClient>,
): Provider[] {
  return [
    {
      provide: PRISMA_CLIENT,
      useValue: options.client,
    },
    {
      provide: PRISMA_OPTIONS,
      useValue: { strictTransactions: options.strictTransactions ?? false },
    },
    PrismaService,
    PrismaTransactionInterceptor,
  ];
}

export function createPrismaModule<TClient extends PrismaClientLike<TTransactionClient>, TTransactionClient = TClient>(
  options: PrismaModuleOptions<TClient, TTransactionClient>,
): ModuleType {
  class PrismaModule {}

  return defineModule(PrismaModule, {
    exports: [PrismaService, PrismaTransactionInterceptor],
    providers: createPrismaProviders(options),
  });
}
