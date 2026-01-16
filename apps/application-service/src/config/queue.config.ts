// Placeholder for future queue configuration
// Phase 1: RabbitMQ setup
// Phase 1: BullMQ setup
export default () => ({
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
    queues: {
      notifications: process.env.RABBITMQ_NOTIFICATION_QUEUE || 'notifications',
      emails: 'emails',
      sms: 'sms',
      push: 'push',
    },
    notificationQueue: process.env.RABBITMQ_NOTIFICATION_QUEUE || 'notifications',
  },
  bullmq: {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },
  },
});
