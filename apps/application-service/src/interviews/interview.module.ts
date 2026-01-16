import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { DatabaseModule } from '../database/database.module.js';
import { InterviewController } from './interview.controller.js'; // Requires extension in nodenext
import { InterviewService } from './interview.service.js';

@Module({
  imports: [
    DatabaseModule,
    // Registration for RabbitMQ to emit events
    ClientsModule.register([
      {
        name: 'NOTIFICATION_SERVICE', // Using string literal if constant not found immediately. I should verify if I can find the constant.
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URI || 'amqp://localhost:5672'],
          queue: 'notification_queue',
          queueOptions: {
            durable: false,
          },
        },
      },
    ]),
  ],
  controllers: [InterviewController],
  providers: [InterviewService],
})
export class InterviewModule {}
