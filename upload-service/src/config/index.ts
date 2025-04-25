export const config = () => ({
  rabbitmq: {
    url: process.env.RABBITMQ_URL,
    queue: process.env.RABBITMQ_QUEUE,
  },
  authService: {
    url: process.env.RABBITMQ_URL,
    queue: process.env.auth_queue,
  },
  awsConfig: {
    awsRegion: process.env.AWS_REGION,
    bucketName: process.env.AWS_BUCKET_NAME,
    roleArn: process.env.ROLE_ARN,
  },
});
