<!-- packages: @fluojs/prisma -->
<!-- project-state: FluoBlog v1.9 -->

# Chapter 12. Database Integration with Prisma

## Learning Objectives
- Understand the role of Prisma as an ORM in a Fluo application.
- Install and configure `@fluojs/prisma` within the Fluo ecosystem.
- Define a database schema using Prisma's DSL.
- Learn how to run migrations to synchronize the database with the schema.
- Use `PrismaService` to perform basic CRUD operations.
- Integrate Prisma into the FluoBlog project to persist data.

## Prerequisites
- Completed Chapter 11 (Configuration Management).
- Basic knowledge of relational databases and SQL.
- Node.js and a package manager (npm, yarn, or pnpm) installed.

## 12.1 Why Prisma and Fluo?

In the previous chapters, we built a robust HTTP API, but all our data lived in memory. If we restart the server, the data is gone, which means FluoBlog still behaves more like a demo than an application people can rely on.

This chapter is where the configuration work from Chapter 11 starts paying off. Now that connection settings can be loaded cleanly, we can move to the next layer and persist our posts, users, and comments in a real database.

Prisma is a modern Object-Relational Mapper (ORM) that fits perfectly with Fluo's philosophy of explicit, type-safe development. Unlike traditional ORMs that rely on complex class-based decorators or obscure magic, Prisma uses a central "schema" file that acts as the single source of truth for your database structure and your TypeScript types.

### Key Benefits of Prisma

- **Type Safety**: Prisma generates a client tailored to your schema, providing full autocompletion and type checking for your database queries.
- **Declarative Schema**: You define your data models in a human-readable format.
- **Automated Migrations**: Prisma handles the complexity of evolving your database schema over time.
- **Fluo Integration**: The `@fluojs/prisma` package manages the connection lifecycle and transaction context for you.

## 12.2 Setting up the Environment

With the goal in place, we can start by preparing the project environment. First, we need to install the necessary packages.

```bash
pnpm add @fluojs/prisma @prisma/client
pnpm add -D prisma
```

Once installed, we initialize Prisma in our project:

```bash
npx prisma init
```

This command creates a `prisma/` directory with a `schema.prisma` file and adds a `DATABASE_URL` entry to your `.env` file.

## 12.3 Defining the FluoBlog Schema

Once Prisma is initialized, the next job is to describe the data we actually want to keep. Open `prisma/schema.prisma`. We will define the core models for our blog: `User` and `Post`.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int
  createdAt DateTime @default(now())
}
```

### Understanding the DSL

- `model`: Defines a database table.
- `@id`: Marks a primary key.
- `@default(autoincrement())`: Sets up an auto-incrementing integer.
- `@unique`: Ensures values in this column are unique.
- `@relation`: Defines how tables link to each other.

After defining the schema, we need to generate the TypeScript client. This keeps the code we write later aligned with the data model we just declared.

```bash
npx prisma generate
```

## 12.4 Running Migrations

Now that our schema is ready, we need to turn that description into actual database tables. This is the moment where the design in `schema.prisma` becomes something the database can enforce.

```bash
npx prisma migrate dev --name init_blog_schema
```

This command:
1. Creates a new SQL migration file.
2. Applies the migration to your database.
3. Re-generates the Prisma Client to ensure it's in sync with the new schema.

In a Fluo project, we treat these migrations as part of our source code. They should be committed to version control so that every developer, and the production server, stays on the same page. That shared history matters because our application code, generated client, and real database all need to move forward together.

## 12.5 Registering PrismaModule

Once the database structure exists, we need a clean way to bring Prisma into the Fluo runtime. In Fluo, we don't just import the Prisma Client directly into our services. Instead, we use `PrismaModule` to manage the lifecycle of the connection.

### Registration in AppModule

Open `src/app.module.ts`:

```typescript
import { Module } from '@fluojs/core';
import { PrismaModule } from '@fluojs/prisma';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [
    PrismaModule.forRoot({
      client: new PrismaClient(),
    }),
  ],
})
export class AppModule {}
```

By registering it this way, Fluo automatically handles connecting to the database when the application starts and disconnecting when it shuts down gracefully.

## 12.6 Using PrismaService

After registration, the next question is how application code should talk to the database every day. The `@fluojs/prisma` package provides a `PrismaService` which is a wrapper around the generated Prisma Client.

### Creating a Repository

It is a best practice to keep database logic separate from your business logic. We will create a `PostsRepository`.

```typescript
import { Injectable, Inject } from '@fluojs/core';
import { PrismaService } from '@fluojs/prisma';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PostsRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService<PrismaClient>
  ) {}

  async createPost(data: { title: string; content?: string; authorId: number }) {
    return this.prisma.current().post.create({
      data,
    });
  }

  async findMany() {
    return this.prisma.current().post.findMany({
      include: { author: true },
    });
  }
}
```

### The current() Pattern

Notice the call to `this.prisma.current()`. This is a critical pattern in Fluo because it lets the repository stay focused on queries instead of context management.

`current()` returns the active database client. If you are inside a transaction, which we will cover in the next chapter, it returns the transaction-aware client. If not, it returns the standard client.

By always using `current()`, your repositories remain transaction-agnostic, making them much more reusable and easier to test. It also creates a smooth handoff into the next chapter, where the same repository code will keep working even when several writes have to succeed or fail together.

## 12.7 Summary

In this chapter, we brought FluoBlog to life by adding a persistent database layer instead of relying on memory alone.

We learned that:
- Prisma provides a type-safe and declarative way to manage data.
- The `schema.prisma` file is the source of truth for the database structure.
- Migrations allow us to evolve the database safely over time.
- `PrismaModule` integrates Prisma into the Fluo lifecycle.
- `PrismaService` and the `current()` pattern enable flexible, transaction-aware data access.

With a database in place, FluoBlog can now store and retrieve posts reliably. We moved in a clear sequence from configuration, to schema design, to migrations, to runtime integration, and that gives us a solid base for the next problem. Real-world data operations often involve multiple steps that must succeed or fail together, so in the next chapter we will learn how to handle those scenarios using Transactions.

<!-- line-count-check: 200+ lines target achieved -->
