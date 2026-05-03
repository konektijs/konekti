import { Module } from '@fluojs/core';
import { HealthModule as RuntimeHealthModule } from '@fluojs/runtime';

import { HelloController } from './hello.controller';
import { HelloService } from './hello.service';

@Module({
  imports: [RuntimeHealthModule.forRoot()],
  controllers: [HelloController],
  providers: [HelloService],
})
export class AppModule {}
