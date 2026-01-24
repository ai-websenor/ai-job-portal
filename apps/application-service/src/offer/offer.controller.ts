import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { OfferService } from './offer.service';
import { CurrentUser, Roles, RolesGuard } from '@ai-job-portal/common';
import { CreateOfferDto } from './dto';

@ApiTags('offers')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('offers')
export class OfferController {
  constructor(private readonly offerService: OfferService) {}

  @Post()
  @Roles('employer')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create job offer' })
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateOfferDto) {
    return this.offerService.create(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get offer details' })
  getById(@Param('id') id: string) {
    return this.offerService.getById(id);
  }

  @Post(':id/accept')
  @Roles('candidate')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Accept offer' })
  accept(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.offerService.accept(userId, id);
  }

  @Post(':id/decline')
  @Roles('candidate')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Decline offer' })
  decline(@CurrentUser('sub') userId: string, @Param('id') id: string, @Body() dto: { reason?: string }) {
    return this.offerService.decline(userId, id, dto.reason);
  }

  @Post(':id/withdraw')
  @Roles('employer')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Withdraw offer' })
  withdraw(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.offerService.withdraw(userId, id);
  }
}
