---
"@fluojs/prisma": major
---

Remove the `PrismaModule.forName` and `PrismaModule.forNameAsync` convenience aliases. Register named Prisma clients through `PrismaModule.forRoot({ name, ... })` or `PrismaModule.forRootAsync({ name, ... })` instead.
