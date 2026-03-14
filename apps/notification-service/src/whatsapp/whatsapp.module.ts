import { Module } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';
import { WhatsAppWebhookService } from './whatsapp-webhook.service';
import { PreferenceModule } from '../preference/preference.module';

@Module({
  imports: [PreferenceModule],
  controllers: [WhatsAppController, WhatsAppWebhookController],
  providers: [WhatsAppService, WhatsAppWebhookService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
