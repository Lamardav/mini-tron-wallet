import { IsString } from 'class-validator';

export class SendDto {
  @IsString()
  toAddress!: string;

  @IsString()
  amountNano!: string;
}
