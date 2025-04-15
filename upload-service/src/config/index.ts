const rabbitmqConfig = () => ({
  rabbitmq: {
    url: process.env.RABBITMQ_URL,
    queue: process.env.RABBITMQ_QUEUE,
  },
});

const bucketName = process.env.S3_BUCKET;

const awsRegion = process.env.REGION;

const roleArn = process.env.ROLE_ARN;

export { awsRegion, bucketName, rabbitmqConfig, roleArn };
