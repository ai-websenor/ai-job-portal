import { IsString, IsOptional, IsBoolean, IsNumber, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateTestimonialDto {
  @ApiProperty({ description: 'Employee name' })
  @IsString()
  @MaxLength(255)
  employeeName: string;

  @ApiProperty({ description: 'Job title' })
  @IsString()
  @MaxLength(255)
  jobTitle: string;

  @ApiPropertyOptional({ description: 'Photo URL' })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiProperty({ description: 'Testimonial text' })
  @IsString()
  testimonial: string;

  @ApiPropertyOptional({ description: 'Video testimonial URL' })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  displayOrder?: number;
}

export class UpdateTestimonialDto extends PartialType(CreateTestimonialDto) {
  @ApiPropertyOptional({ description: 'Is approved (admin only)' })
  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;
}
