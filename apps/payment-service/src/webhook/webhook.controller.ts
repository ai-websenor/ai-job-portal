import { Controller, Post, Body, Headers, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { WebhookService } from './webhook.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('razorpay')
  @ApiOperation({ summary: 'Razorpay webhook endpoint' })
  async razorpayWebhook(@Body() payload: any, @Headers('x-razorpay-signature') signature: string) {
    return this.webhookService.handleRazorpayWebhook(payload, signature);
  }

  @Post('stripe')
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  async stripeWebhook(@Req() req: FastifyRequest, @Headers('stripe-signature') signature: string) {
    // Use the raw body buffer stored by preParsing hook for Stripe signature verification
    const rawBody = (req as any).rawBodyBuffer?.toString('utf8') || JSON.stringify(req.body);
    return this.webhookService.handleStripeWebhook(rawBody, signature);
  }
}
