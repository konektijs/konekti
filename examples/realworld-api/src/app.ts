import { Module } from '@fluojs/core';
import { ConfigModule } from '@fluojs/config';
import { HealthModule as RuntimeHealthModule } from '@fluojs/runtime';

import { UsersModule } from './users/users.module';

@Module({
  imports: [ConfigModule.forRoot({ envFile: '.env', processEnv: process.env }), RuntimeHealthModule.forRoot(), UsersModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
