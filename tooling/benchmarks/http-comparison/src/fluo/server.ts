import { Inject, Module } from '@fluojs/core';
import { Controller, FromBody, FromPath, FromQuery, Get, Post, RequestDto, type RequestContext } from '@fluojs/http';
import { createFastifyAdapter } from '@fluojs/platform-fastify';
import { FluoFactory } from '@fluojs/runtime';

type AppShape =
  | 'baseline'
  | 'dto-1'
  | 'dto-20'
  | 'direct-1'
  | 'direct-20'
  | 'query-1'
  | 'body-1'
  | 'query-web-1'
  | 'json-1';

@Controller('/baseline')
class BaselineController {
  @Get('/')
  health(): { ok: boolean } {
    return { ok: true };
  }
}

class UsersRepository {
  findOne(id: string): { id: string; name: string; email: string } {
    return { id, name: 'Alice', email: 'alice@example.com' };
  }
}

class GetUserRequest {
  @FromPath('id')
  id = '';
}

class SearchUsersRequest {
  @FromQuery('term')
  term = '';

  @FromQuery('role')
  role = '';

  @FromQuery('region')
  region = '';

  @FromQuery('sort')
  sort = '';

  @FromQuery('page')
  page = '';

  @FromQuery('limit')
  limit = '';
}

class CreateUserRequest {
  @FromBody('name')
  name = '';

  @FromBody('email')
  email = '';

  @FromBody('role')
  role = '';

  @FromBody('team')
  team = '';

  @FromBody('title')
  title = '';

  @FromBody('status')
  status = '';
}

class CreateMessageRequest {
  count = 0;
  title = '';
}

@Inject(UsersRepository)
class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  getUser(id: string): { id: string; name: string; email: string } {
    return this.repo.findOne(id);
  }

  searchUsers(input: SearchUsersRequest) {
    return {
      limit: input.limit,
      page: input.page,
      region: input.region,
      role: input.role,
      sort: input.sort,
      term: input.term,
    };
  }

  createUser(input: CreateUserRequest) {
    return {
      email: input.email,
      name: input.name,
      role: input.role,
      status: input.status,
      team: input.team,
      title: input.title,
    };
  }
}

function readPathId(context: RequestContext): string {
  return context.request.params['id'] ?? '';
}

function readRepeatedQueryValue(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value;
  }

  return value === undefined ? [] : [value];
}

@Inject(UsersService)
@Controller('/di-chain-one')
class DiChainOneController {
  constructor(private readonly service: UsersService) {}

  @RequestDto(GetUserRequest)
  @Get('/r01/:id')
  getR01(input: GetUserRequest): { id: string; name: string; email: string } {
    return this.service.getUser(input.id);
  }
}

@Inject(UsersService)
@Controller('/di-chain')
class DiChainTwentyController {
  constructor(private readonly service: UsersService) {}

  @RequestDto(GetUserRequest)
  @Get('/r01/:id')
  getR01(input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }
  @RequestDto(GetUserRequest)
  @Get('/r02/:id')
  getR02(input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }
  @RequestDto(GetUserRequest)
  @Get('/r03/:id')
  getR03(input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }
  @RequestDto(GetUserRequest)
  @Get('/r04/:id')
  getR04(input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }
  @RequestDto(GetUserRequest)
  @Get('/r05/:id')
  getR05(input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }
  @RequestDto(GetUserRequest)
  @Get('/r06/:id')
  getR06(input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }
  @RequestDto(GetUserRequest)
  @Get('/r07/:id')
  getR07(input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }
  @RequestDto(GetUserRequest)
  @Get('/r08/:id')
  getR08(input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }
  @RequestDto(GetUserRequest)
  @Get('/r09/:id')
  getR09(input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }
  @RequestDto(GetUserRequest)
  @Get('/r10/:id')
  getR10(input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }
  @RequestDto(GetUserRequest)
  @Get('/r11/:id')
  getR11(input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }
  @RequestDto(GetUserRequest)
  @Get('/r12/:id')
  getR12(input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }
  @RequestDto(GetUserRequest)
  @Get('/r13/:id')
  getR13(input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }
  @RequestDto(GetUserRequest)
  @Get('/r14/:id')
  getR14(input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }
  @RequestDto(GetUserRequest)
  @Get('/r15/:id')
  getR15(input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }
  @RequestDto(GetUserRequest)
  @Get('/r16/:id')
  getR16(input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }
  @RequestDto(GetUserRequest)
  @Get('/r17/:id')
  getR17(input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }
  @RequestDto(GetUserRequest)
  @Get('/r18/:id')
  getR18(input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }
  @RequestDto(GetUserRequest)
  @Get('/r19/:id')
  getR19(input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }
  @RequestDto(GetUserRequest)
  @Get('/r20/:id')
  getR20(input: GetUserRequest): { id: string; name: string; email: string } { return this.service.getUser(input.id); }
}

@Inject(UsersService)
@Controller('/di-chain-direct-one')
class DirectParamOneController {
  constructor(private readonly service: UsersService) {}

  @Get('/r01/:id')
  getR01(_input: undefined, context: RequestContext): { id: string; name: string; email: string } {
    return this.service.getUser(readPathId(context));
  }
}

@Inject(UsersService)
@Controller('/di-chain-direct')
class DirectParamTwentyController {
  constructor(private readonly service: UsersService) {}

  @Get('/r01/:id')
  getR01(_input: undefined, context: RequestContext): { id: string; name: string; email: string } { return this.service.getUser(readPathId(context)); }
  @Get('/r02/:id')
  getR02(_input: undefined, context: RequestContext): { id: string; name: string; email: string } { return this.service.getUser(readPathId(context)); }
  @Get('/r03/:id')
  getR03(_input: undefined, context: RequestContext): { id: string; name: string; email: string } { return this.service.getUser(readPathId(context)); }
  @Get('/r04/:id')
  getR04(_input: undefined, context: RequestContext): { id: string; name: string; email: string } { return this.service.getUser(readPathId(context)); }
  @Get('/r05/:id')
  getR05(_input: undefined, context: RequestContext): { id: string; name: string; email: string } { return this.service.getUser(readPathId(context)); }
  @Get('/r06/:id')
  getR06(_input: undefined, context: RequestContext): { id: string; name: string; email: string } { return this.service.getUser(readPathId(context)); }
  @Get('/r07/:id')
  getR07(_input: undefined, context: RequestContext): { id: string; name: string; email: string } { return this.service.getUser(readPathId(context)); }
  @Get('/r08/:id')
  getR08(_input: undefined, context: RequestContext): { id: string; name: string; email: string } { return this.service.getUser(readPathId(context)); }
  @Get('/r09/:id')
  getR09(_input: undefined, context: RequestContext): { id: string; name: string; email: string } { return this.service.getUser(readPathId(context)); }
  @Get('/r10/:id')
  getR10(_input: undefined, context: RequestContext): { id: string; name: string; email: string } { return this.service.getUser(readPathId(context)); }
  @Get('/r11/:id')
  getR11(_input: undefined, context: RequestContext): { id: string; name: string; email: string } { return this.service.getUser(readPathId(context)); }
  @Get('/r12/:id')
  getR12(_input: undefined, context: RequestContext): { id: string; name: string; email: string } { return this.service.getUser(readPathId(context)); }
  @Get('/r13/:id')
  getR13(_input: undefined, context: RequestContext): { id: string; name: string; email: string } { return this.service.getUser(readPathId(context)); }
  @Get('/r14/:id')
  getR14(_input: undefined, context: RequestContext): { id: string; name: string; email: string } { return this.service.getUser(readPathId(context)); }
  @Get('/r15/:id')
  getR15(_input: undefined, context: RequestContext): { id: string; name: string; email: string } { return this.service.getUser(readPathId(context)); }
  @Get('/r16/:id')
  getR16(_input: undefined, context: RequestContext): { id: string; name: string; email: string } { return this.service.getUser(readPathId(context)); }
  @Get('/r17/:id')
  getR17(_input: undefined, context: RequestContext): { id: string; name: string; email: string } { return this.service.getUser(readPathId(context)); }
  @Get('/r18/:id')
  getR18(_input: undefined, context: RequestContext): { id: string; name: string; email: string } { return this.service.getUser(readPathId(context)); }
  @Get('/r19/:id')
  getR19(_input: undefined, context: RequestContext): { id: string; name: string; email: string } { return this.service.getUser(readPathId(context)); }
  @Get('/r20/:id')
  getR20(_input: undefined, context: RequestContext): { id: string; name: string; email: string } { return this.service.getUser(readPathId(context)); }
}

@Inject(UsersService)
@Controller('/query-dto-one')
class QueryDtoOneController {
  constructor(private readonly service: UsersService) {}

  @RequestDto(SearchUsersRequest)
  @Get('/r01')
  getR01(input: SearchUsersRequest) {
    return this.service.searchUsers(input);
  }
}

@Inject(UsersService)
@Controller('/body-dto-one')
class BodyDtoOneController {
  constructor(private readonly service: UsersService) {}

  @RequestDto(CreateUserRequest)
  @Post('/r01')
  createR01(input: CreateUserRequest) {
    return this.service.createUser(input);
  }
}

@Controller('/query-one')
class QueryOneController {
  @Get('/')
  read(_input: undefined, context: RequestContext): { encoded: string; tag: string[] } {
    return {
      encoded: String(context.request.query['encoded'] ?? ''),
      tag: readRepeatedQueryValue(context.request.query['tag']),
    };
  }
}

@Controller('/body-one')
class JsonBodyOneController {
  @Post('/')
  create(_input: undefined, context: RequestContext): { count: number; title: string } {
    const body = context.request.body as Partial<CreateMessageRequest> | undefined;

    return {
      count: typeof body?.count === 'number' ? body.count : 0,
      title: typeof body?.title === 'string' ? body.title : '',
    };
  }
}

@Module({ controllers: [BaselineController] })
class BaselineModule {}

@Module({ controllers: [DiChainOneController], providers: [UsersRepository, UsersService] })
class DtoOneModule {}

@Module({ controllers: [DiChainTwentyController], providers: [UsersRepository, UsersService] })
class DtoTwentyModule {}

@Module({ controllers: [DirectParamOneController], providers: [UsersRepository, UsersService] })
class DirectOneModule {}

@Module({ controllers: [DirectParamTwentyController], providers: [UsersRepository, UsersService] })
class DirectTwentyModule {}

@Module({ controllers: [QueryDtoOneController], providers: [UsersRepository, UsersService] })
class QueryDtoOneModule {}

@Module({ controllers: [BodyDtoOneController], providers: [UsersRepository, UsersService] })
class BodyDtoOneModule {}

@Module({ controllers: [QueryOneController] })
class QueryWebOneModule {}

@Module({ controllers: [JsonBodyOneController] })
class JsonBodyOneModule {}

function resolveAppModule(shape: AppShape) {
  switch (shape) {
    case 'baseline': return BaselineModule;
    case 'dto-1': return DtoOneModule;
    case 'dto-20': return DtoTwentyModule;
    case 'direct-1': return DirectOneModule;
    case 'direct-20': return DirectTwentyModule;
    case 'query-1': return QueryDtoOneModule;
    case 'body-1': return BodyDtoOneModule;
    case 'query-web-1': return QueryWebOneModule;
    case 'json-1': return JsonBodyOneModule;
  }
}

function readAppShape(): AppShape {
  const raw = process.env['BENCH_APP_SHAPE'] ?? 'dto-20';
  if (
    raw === 'baseline'
    || raw === 'dto-1'
    || raw === 'dto-20'
    || raw === 'direct-1'
    || raw === 'direct-20'
    || raw === 'query-1'
    || raw === 'body-1'
    || raw === 'query-web-1'
    || raw === 'json-1'
  ) {
    return raw;
  }
  throw new Error(`Unsupported BENCH_APP_SHAPE: ${raw}`);
}

async function main(): Promise<void> {
  const port = Number(process.env['PORT'] ?? 3001);
  const app = await FluoFactory.create(resolveAppModule(readAppShape()), {
    adapter: createFastifyAdapter({ port }),
    logger: { debug() {}, error() {}, log() {}, warn() {} },
  });

  await app.listen();
  process.stdout.write(`fluo listening on :${port}\n`);
}

main().catch((err) => {
  process.stderr.write(`[fluo] fatal: ${String(err)}\n`);
  process.exit(1);
});
