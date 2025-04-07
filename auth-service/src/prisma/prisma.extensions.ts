import { Prisma } from '@prisma/client';

export const LoggingExtension = Prisma.defineExtension((prisma) => {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const start = Date.now();
          const result = await query(args);
          const duration = Date.now() - start;

          console.log(
            `🧩 [${model}.${operation}] took ${duration}ms`,
            'args:',
            args,
          );
          return result;
        },
      },
    },
  });
});
