import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsNotEmpty, MaxLength, Matches, Length } from 'class-validator';

// A strong passphrase: 12-128 chars with upper, lower, digit and symbol.
const PASSPHRASE_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,128}$/;
const PASSPHRASE_MESSAGE =
  'Passphrase must be 12-128 characters and include upper, lower, a digit and a symbol';

export class SetupVaultDto {
  @ApiProperty({ example: 'Str0ng!Vault#Pass', description: 'Vault passphrase (high complexity)' })
  @IsString()
  @Matches(PASSPHRASE_REGEX, { message: PASSPHRASE_MESSAGE })
  passphrase: string;

  @ApiProperty({ example: 'owner@customer.com', description: 'Recovery email (for OTP reset)' })
  @IsEmail()
  recoveryEmail: string;

  @ApiProperty({
    example: '+919876543210',
    description: 'Recovery mobile in E.164 (for OTP reset)',
  })
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: 'recoveryMobile must be a valid phone number' })
  recoveryMobile: string;
}

export class ConfirmTotpDto {
  @ApiProperty({ example: '123456', description: '6-digit code from the authenticator app' })
  @Matches(/^\d{6}$/, { message: 'TOTP code must be 6 digits' })
  totp: string;
}

export class UnlockVaultDto {
  @ApiProperty({ example: 'Str0ng!Vault#Pass' })
  @IsString()
  @IsNotEmpty()
  passphrase: string;

  @ApiProperty({ example: '123456' })
  @Matches(/^\d{6}$/, { message: 'TOTP code must be 6 digits' })
  totp: string;
}

export class UpdateSecretDto {
  @ApiProperty({ example: 'sk_live_...', description: 'New plaintext secret value (write-only)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(8192)
  value: string;
}

export class RevealSecretDto {
  @ApiProperty({ example: '123456', description: 'Fresh TOTP required to reveal a secret' })
  @Matches(/^\d{6}$/, { message: 'TOTP code must be 6 digits' })
  totp: string;
}

export class ChangePassphraseDto {
  @ApiProperty({ example: 'OldVault!Pass99' })
  @IsString()
  @IsNotEmpty()
  currentPassphrase: string;

  @ApiProperty({ example: 'NewStr0ng!Vault#Pass' })
  @Matches(PASSPHRASE_REGEX, { message: PASSPHRASE_MESSAGE })
  newPassphrase: string;

  @ApiProperty({ example: '123456' })
  @Matches(/^\d{6}$/, { message: 'TOTP code must be 6 digits' })
  totp: string;
}

export class RecoveryConfirmDto {
  @ApiProperty({ example: '481920', description: 'OTP delivered to recovery email' })
  @Length(6, 6)
  emailOtp: string;

  @ApiProperty({ example: '273645', description: 'OTP delivered to recovery mobile' })
  @Length(6, 6)
  mobileOtp: string;

  @ApiProperty({ example: 'NewStr0ng!Vault#Pass' })
  @Matches(PASSPHRASE_REGEX, { message: PASSPHRASE_MESSAGE })
  newPassphrase: string;
}
