// Placeholder for future queue configuration
// Phase 1: RabbitMQ setup
// Phase 1: BullMQ setup
export default () => ({
  rabbitmq: {
    url: '',
    queues: {
      notifications: 'notifications',
      emails: 'emails',
      sms: 'sms',
      push: 'push',
    },
  },
  bullmq: {
    redis: {
      host: '',
      port: 6379,
    },
  },
});
