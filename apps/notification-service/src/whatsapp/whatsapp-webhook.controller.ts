import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { WhatsAppWebhookService } from './whatsapp-webhook.service';

// No JWT guard — Meta calls this endpoint directly (no auth token)
@ApiTags('notifications')
@Controller('notifications/whatsapp/webhook')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(private readonly webhookService: WhatsAppWebhookService) {}

  /**
   * Meta webhook verification — called once when you register the webhook URL
   * in Meta Developer Dashboard. Meta sends a GET with hub.challenge and
   * expects the challenge value back as plain text.
   */
  @Get()
  @ApiExcludeEndpoint()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: any,
  ) {
    const result = this.webhookService.verifyWebhook(mode, token, challenge);

    if (result !== null) {
      res.status(HttpStatus.OK).send(result);
    } else {
      res.status(HttpStatus.FORBIDDEN).send('Verification failed');
    }
  }

  /**
   * Meta webhook event receiver — called whenever:
   * - A candidate sends a message to your WhatsApp Business number
   * - A message delivery/read status changes
   * Meta expects a 200 OK response within 20 seconds.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async receive(@Body() body: any) {
    // Process asynchronously — respond 200 immediately so Meta doesn't retry
    this.webhookService
      .handleWebhookEvent(body)
      .catch((err) => this.logger.error(`Webhook event processing error: ${err.message}`));
    return { status: 'ok' };
  }
}
