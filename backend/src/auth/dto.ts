import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { MINIMUM_PASSWORD_LENGTH } from './password.policy';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(MINIMUM_PASSWORD_LENGTH)
  @MaxLength(72)
  password!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
