import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const MASTER_DATA_TYPES = ['master-typed', 'user-typed'] as const;
export type MasterDataType = (typeof MASTER_DATA_TYPES)[number];

/**
 * Query parameters come in as strings, so the booleans and numbers are coerced
 * before validation. `undefined` is passed through untouched so an omitted
 * filter stays omitted rather than becoming `false`.
 */
const toOptionalBoolean = ({ value }: { value: unknown }) =>
  value === undefined || value === '' ? undefined : value === true || value === 'true';

const toOptionalInt = ({ value }: { value: unknown }) =>
  value === undefined || value === '' ? undefined : Number.parseInt(String(value), 10);

export class ListMasterDataDto {
  @ApiPropertyOptional({
    enum: MASTER_DATA_TYPES,
    example: 'user-typed',
    description:
      'Filter by type. Omit to get both — use "user-typed" for the values awaiting review.',
  })
  @IsOptional()
  @IsEnum(MASTER_DATA_TYPES)
  type?: MasterDataType;

  @ApiPropertyOptional({ example: 'developer', description: 'Case-insensitive search on name' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ default: 1, example: 1 })
  @IsOptional()
  @Transform(toOptionalInt)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 15, example: 15, description: 'Items per page (max 100)' })
  @IsOptional()
  @Transform(toOptionalInt)
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by active flag. Omit to include deactivated rows as well.',
  })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateMasterDataDto {
  @ApiPropertyOptional({
    example: 'Backend Developer',
    description: 'Corrected name. Must stay unique case-insensitively, otherwise 409.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    enum: MASTER_DATA_TYPES,
    example: 'master-typed',
    description: 'Set to "master-typed" to promote a reviewed value into the curated master list.',
  })
  @IsOptional()
  @IsEnum(MASTER_DATA_TYPES)
  type?: MasterDataType;

  @ApiPropertyOptional({ example: true, description: 'Reactivate a previously deleted row.' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
