import { IsOptional, IsString, IsUUID, IsIn, IsEmail, MaxLength } from 'class-validator';

export class ListModerationDto {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['pending', 'reviewed', 'rejected'])
  status?: 'pending' | 'reviewed' | 'rejected';
}

export class CreateModerationFlagDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  contentType?: string;

  @IsOptional()
  @IsUUID()
  contentId?: string;

  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  author?: string;

  @IsOptional()
  @IsEmail()
  authorEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  flaggedBy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  flaggedReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}

export class ReviewModerationDto {
  @IsOptional()
  @IsString()
  reviewNote?: string;
}
