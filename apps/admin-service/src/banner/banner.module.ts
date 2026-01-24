import { Module } from '@nestjs/common';
import { AdminBannerController, PublicBannerController } from './banner.controller';
import { BannerService } from './banner.service';

@Module({
  controllers: [AdminBannerController, PublicBannerController],
  providers: [BannerService],
  exports: [BannerService],
})
export class BannerModule {}
