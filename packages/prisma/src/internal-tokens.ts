export interface PrismaModuleRegistration {
  mode: 'async' | 'sync';
}

export const PRISMA_REGISTRATIONS = Symbol('fluo.prisma.registrations');
