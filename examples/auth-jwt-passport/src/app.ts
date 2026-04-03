import { Module } from '@konekti/core';
import { createHealthModule } from '@konekti/runtime';

import { AuthModule } from './auth/auth.module';

const RuntimeHealthModule = createHealthModule();

@Module({
  imports: [RuntimeHealthModule, AuthModule],
})
export class AppModule {}
