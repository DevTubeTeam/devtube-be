const rabbitmqConfig = () => ({
  rabbitmq: {
    url: process.env.RABBITMQ_URL,
    queue: process.env.RABBITMQ_QUEUE,
  },
});

const databaseConfig = () => ({
  database: {
    url: process.env.DATABASE_URL,
  },
});



export { databaseConfig, rabbitmqConfig };

