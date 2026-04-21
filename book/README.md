# fluo Book Series

[English](./README.md) &nbsp;&middot;&nbsp; [한국어](./README.ko.md)

This three-volume series is the guided learning path for fluo. Start with the volume that matches your current experience, then move forward as your work expands from a single HTTP app to distributed systems, internals, and framework extension.

## Overview

- **Beginner** introduces fluo through **FluoBlog**, covering the framework mental model, standard decorators, and the full path from CLI setup to a working HTTP application.
- **Intermediate** grows that foundation into **FluoShop**, covering distributed architecture, transports, events, realtime systems, notifications, GraphQL, ORM choices, and cross-runtime portability.
- **Advanced** explains how fluo works under the hood, from DI and runtime architecture to adapter design, portability testing, Studio, custom packages, and contributing.

## How to Choose a Volume

- Start with **[fluo for Beginners](./beginner/toc.md)** if you're new to fluo or want the clearest end-to-end onboarding path.
- Start with **[fluo for Intermediate Users](./intermediate/toc.md)** if you already know the basics and want to design multi-service, event-driven, or realtime systems.
- Start with **[fluo for Advanced Users](./advanced/toc.md)** if you need internals, platform seams, extension points, or contributor-level understanding.

## What Each Volume Covers

### [fluo for Beginners](./beginner/toc.md)

Builds **FluoBlog** while teaching the core fluo model. It covers modules, providers, controllers, TC39 standard decorators, routing, DTO validation, serialization, exceptions, guards, interceptors, OpenAPI, configuration, Prisma, transactions, authentication, throttling, caching, health checks, metrics, and testing.

### [fluo for Intermediate Users](./intermediate/toc.md)

Builds **FluoShop** as a distributed application. It covers microservice architecture, TCP, Redis, RabbitMQ, Kafka, NATS, MQTT, gRPC, domain events, CQRS, sagas, queues, scheduling, distributed locks, WebSockets, Socket.IO, notifications, email, Slack and Discord integrations, GraphQL, Mongoose, Drizzle, and runtime portability across adapters.

### [fluo for Advanced Users](./advanced/toc.md)

Focuses on framework internals and extension work. It covers decorator history and metadata, custom decorators, provider resolution, scopes, circular dependency handling, dynamic modules, module graph compilation, application context and adapter contracts, runtime branching, HTTP pipeline internals, custom adapters, portability testing, Studio, custom package authoring, and contributing to fluo.

## Reading Order

The default path is:

1. [fluo for Beginners](./beginner/toc.md)
2. [fluo for Intermediate Users](./intermediate/toc.md)
3. [fluo for Advanced Users](./advanced/toc.md)

You can also use this hub as a chooser. Pick one volume, finish its table of contents, then return here to decide your next step.

## Navigation

- New to the series, start with **[Beginner TOC](./beginner/toc.md)**.
- Want a quick orientation before the full chapter list? Start with **[Beginner Chapter 0](./beginner/ch00-introduction.md)**, **[Intermediate Chapter 0](./intermediate/ch00-introduction.md)**, or **[Advanced Chapter 0](./advanced/ch00-introduction.md)**.
- Finished the beginner volume, continue to **[Intermediate TOC](./intermediate/toc.md)**.
- Need internals or contributor context, go to **[Advanced TOC](./advanced/toc.md)**.
- Looking for broader framework docs instead of the book path, use the **[Documentation Hub](../docs/README.md)**.
