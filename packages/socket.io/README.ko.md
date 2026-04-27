# @fluojs/socket.io

<p><a href="./README.md"><kbd>English</kbd></a> <strong><kbd>한국어</kbd></strong></p>

fluo 런타임용 Socket.IO v4 게이트웨이 어댑터입니다.

## 목차

- [설치](#설치)
- [사용 시점](#사용-시점)
- [빠른 시작](#빠른-시작)
- [주요 패턴](#주요-패턴)
- [공개 API 개요](#공개-api-개요)
- [지원 플랫폼](#지원-플랫폼)
- [예제 소스](#예제-소스)

## 설치

```bash
npm install @fluojs/core @fluojs/socket.io @fluojs/websockets socket.io
```

## 사용 시점

Socket.IO가 제공하는 room, namespace, broadcast, 자동 재연결 같은 고수준 실시간 기능이 필요할 때 사용합니다. 이 패키지는 raw websocket 대신 Socket.IO v4 서버를 fluo의 `@WebSocketGateway` 기반 모델에 연결합니다.

## 빠른 시작

```ts
import { Inject, Module } from '@fluojs/core';
import { SOCKETIO_ROOM_SERVICE, SocketIoModule, type SocketIoRoomService } from '@fluojs/socket.io';
import { OnMessage, WebSocketGateway } from '@fluojs/websockets';

@Inject(SOCKETIO_ROOM_SERVICE)
@WebSocketGateway({ path: '/chat' })
class ChatGateway {
  constructor(private readonly rooms: SocketIoRoomService) {}

  @OnMessage('ping')
  handlePing(payload: unknown) {
    this.rooms.broadcastToRoom('chat:lobby', 'pong', payload);
  }
}

@Module({
  imports: [SocketIoModule.forRoot()],
  providers: [ChatGateway],
})
export class AppModule {}
```

## 주요 패턴

### Room 관리

```ts
this.rooms.joinRoom(socket.id, 'room:123');
this.rooms.broadcastToRoom('room:123', 'event', data);
```

Room helper는 공유 `WebSocketRoomService` 계약을 따르면서 Socket.IO namespace 인식을 추가합니다. gateway handler 안에서는 현재 `@WebSocketGateway({ path })` namespace를 자동으로 추론합니다. gateway handler 밖에서 room helper를 실행할 때는 같은 이름의 room이 다른 Socket.IO namespace에 존재할 수 있으므로 대상 namespace path를 명시적으로 전달하세요.

```ts
this.rooms.broadcastToRoom('room:123', 'event', data, '/chat');
this.rooms.joinRoom(socketId, 'room:123', '/chat');
```

### Raw Socket.IO 서버 접근

```ts
import { SOCKETIO_SERVER } from '@fluojs/socket.io';
import type { Server } from 'socket.io';

@Inject(SOCKETIO_SERVER)
class MyService {
  constructor(private readonly io: Server) {}
}
```

### auth guard, 안전한 CORS 기본값, bounded payload
`SocketIoModule.forRoot(...)`로 namespace/message 인증을 명시하고, CORS를 deny-by-default로 유지하며, 인바운드 Engine.IO payload 크기를 제한할 수 있습니다.

```ts
SocketIoModule.forRoot({
  auth: {
    connection({ socket }) {
      return socket.handshake.auth.token === 'demo-token'
        ? true
        : { message: 'Authentication required.' };
    },
    message({ payload }) {
      return payload === 'allowed'
        ? true
        : { message: 'Forbidden event.' };
    },
  },
  cors: {
    origin: ['https://app.example.com'],
  },
  engine: {
    maxHttpBufferSize: 65_536,
  },
});
```

이제 `cors`를 생략하면 `@fluojs/socket.io`는 `origin: false`를 기본값으로 사용하므로 cross-origin 노출은 명시적 opt-in이 필요합니다. `engine.maxHttpBufferSize`를 생략하면 어댑터가 1 MiB Engine.IO payload 상한을 적용합니다.

### 모듈 등록
`SocketIoModule.forRoot(...)`로 Socket.IO를 등록합니다.

Socket.IO 등록은 소유 모듈의 import 경로에서 구성하여 namespace/message guard, CORS, Engine.IO 옵션을 한 곳에서 관리합니다.

## 공개 API 개요

- `SocketIoModule.forRoot(options)`
- `SocketIoModule.forRoot({ auth, cors, engine, ... })`
- `SOCKETIO_SERVER`
- `SOCKETIO_ROOM_SERVICE`
- `SocketIoRoomService`: 공유 room 계약에 Socket.IO namespace-aware `joinRoom`, `leaveRoom`, `broadcastToRoom`, `getRooms` helper를 더한 타입입니다.
- `SocketIoLifecycleService`: server와 room-service token 뒤에서 동작하는 lifecycle 기반 구현입니다. 애플리케이션 코드는 일반적으로 `SOCKETIO_SERVER` 또는 `SOCKETIO_ROOM_SERVICE`를 주입하세요.

## 지원 플랫폼

| 플랫폼 | 지원 여부 | 비고 |
| --- | --- | --- |
| Node.js (Raw/Express/Fastify) | ✅ 전체 지원 | server-backed mode |
| Bun | ✅ 전체 지원 | `@socket.io/bun-engine` 기반 |
| Deno | ❌ 미지원 | 현재 지원하지 않음 |
| Workers | ❌ 미지원 | 현재 지원하지 않음 |

## 예제 소스

- `packages/socket.io/src/module.test.ts`
- `packages/socket.io/src/public-surface.test.ts`
