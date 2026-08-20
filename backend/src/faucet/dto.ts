import { IsString } from 'class-validator';

export class ClaimDto {
  @IsString()
  amountNano!: string;
}
