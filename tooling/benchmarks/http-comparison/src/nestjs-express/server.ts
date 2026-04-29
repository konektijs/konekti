import 'reflect-metadata';

import { Controller, Get, Injectable, Module, Param } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

@Injectable()
class UsersRepository {
  findOne(id: string): { id: string; name: string; email: string } {
    return { id, name: 'Alice', email: 'alice@example.com' };
  }
}

@Injectable()
class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  getUser(id: string): { id: string; name: string; email: string } {
    return this.repo.findOne(id);
  }
}

class GetUserRequest {
  id = '';
}

@Controller('baseline')
class BaselineController {
  @Get()
  health(): { ok: boolean } {
    return { ok: true };
  }
}

@Controller('di-chain')
class DiChainController {
  constructor(private readonly service: UsersService) {}

  @Get(':id')
  get(@Param() input: GetUserRequest): { id: string; name: string; email: string } {
    return this.service.getUser(input.id);
  }

  @Get('users/:id')
  getUser(@Param() input: GetUserRequest): { id: string; name: string; email: string } {
    return this.service.getUser(input.id);
  }

  @Get('profiles/:id')
  getProfile(@Param() input: GetUserRequest): { id: string; name: string; email: string } {
    return this.service.getUser(input.id);
  }

  @Get('settings/:id')
  getSettings(@Param() input: GetUserRequest): { id: string; name: string; email: string } {
    return this.service.getUser(input.id);
  }

  @Get('r01/:id')
  getR01(@Param() input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }

  @Get('r02/:id')
  getR02(@Param() input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }

  @Get('r03/:id')
  getR03(@Param() input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }

  @Get('r04/:id')
  getR04(@Param() input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }

  @Get('r05/:id')
  getR05(@Param() input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }

  @Get('r06/:id')
  getR06(@Param() input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }

  @Get('r07/:id')
  getR07(@Param() input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }

  @Get('r08/:id')
  getR08(@Param() input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }

  @Get('r09/:id')
  getR09(@Param() input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }

  @Get('r10/:id')
  getR10(@Param() input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }

  @Get('r11/:id')
  getR11(@Param() input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }

  @Get('r12/:id')
  getR12(@Param() input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }

  @Get('r13/:id')
  getR13(@Param() input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }

  @Get('r14/:id')
  getR14(@Param() input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }

  @Get('r15/:id')
  getR15(@Param() input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }

  @Get('r16/:id')
  getR16(@Param() input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }

  @Get('r17/:id')
  getR17(@Param() input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }

  @Get('r18/:id')
  getR18(@Param() input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }

  @Get('r19/:id')
  getR19(@Param() input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }

  @Get('r20/:id')
  getR20(@Param() input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }
}

@Module({
  controllers: [BaselineController, DiChainController],
  providers: [UsersRepository, UsersService],
})
class AppModule {}

async function main(): Promise<void> {
  const port = Number(process.env['PORT'] ?? 3004);

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    { logger: false },
  );

  await app.listen(port, '0.0.0.0');
  process.stdout.write(`NestJS+Express listening on :${port}\n`);
}

main().catch((err) => {
  process.stderr.write(`[nestjs-express] fatal: ${String(err)}\n`);
  process.exit(1);
});
