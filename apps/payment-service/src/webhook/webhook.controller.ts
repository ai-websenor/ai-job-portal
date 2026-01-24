import { Controller, Post, Body, Headers, RawBodyRequest, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { WebhookService } from './webhook.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('razorpay')
  @ApiOperation({ summary: 'Razorpay webhook endpoint' })
  async razorpayWebhook(
    @Body() payload: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    return this.webhookService.handleRazorpayWebhook(payload, signature);
  }

  @Post('stripe')
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  async stripeWebhook(
    @Req() req: RawBodyRequest<FastifyRequest>,
    @Headers('stripe-signature') signature: string,
  ) {
    // Stripe requires raw body for signature verification
    const rawBody = req.rawBody?.toString() || '';
    return this.webhookService.handleStripeWebhook(rawBody, signature);
  }
}
