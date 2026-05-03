import { Module } from '@fluojs/core';
import { HealthModule as RuntimeHealthModule } from '@fluojs/runtime';

import { AuthModule } from './auth/auth.module';

@Module({
  imports: [RuntimeHealthModule.forRoot(), AuthModule],
})
export class AppModule {}
