import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AmountError, nanoToTrx, parseAmountNano } from '../common/amount';
import { PrismaService } from '../prisma/prisma.service';
import { TronService } from '../tron/tron.service';
import { WalletEventsService } from '../wallet/wallet-events.service';
import { ClaimDto } from './dto';

const MAX_CLAIM_NANO = 100_000_000_000n;
const RESERVE_NANO = 5_000_000_000n;

@Injectable()
export class FaucetService {
  private readonly logger = new Logger(FaucetService.name);
  private readonly privateKey: string;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tron: TronService,
    private readonly events: WalletEventsService,
  ) {
    this.privateKey = config.get<string>('FAUCET_PRIVATE_KEY') ?? '';
  }

  get enabled(): boolean {
    return this.privateKey.length > 0;
  }

  async status() {
    if (!this.enabled) {
      return { enabled: false };
    }

    const address = this.tron.addressForPrivateKey(this.privateKey);
    const balanceNano = await this.tron.getBalanceNano(address);

    return {
      enabled: true,
      address,
      balanceNano: balanceNano.toString(),
      balanceTrx: nanoToTrx(balanceNano),
      maxClaimNano: MAX_CLAIM_NANO.toString(),
      maxClaimTrx: nanoToTrx(MAX_CLAIM_NANO),
    };
  }

  async claim(userId: string, dto: ClaimDto) {
    if (!this.enabled) {
      throw new ServiceUnavailableException('FAUCET_DISABLED');
    }

    const amountNano = this.parseAmount(dto.amountNano);

    if (amountNano > MAX_CLAIM_NANO) {
      throw new BadRequestException('FAUCET_AMOUNT_TOO_LARGE');
    }

    const wallet = await this.prisma.wallet.findUniqueOrThrow({
      where: { userId },
    });

    const source = this.tron.addressForPrivateKey(this.privateKey);
    const available = await this.tron.getBalanceNano(source);

    if (available < amountNano + RESERVE_NANO) {
      throw new UnprocessableEntityException({
        message: 'FAUCET_OUT_OF_FUNDS',
        availableNano: available.toString(),
        requestedNano: amountNano.toString(),
      });
    }

    const txHash = await this.tron.sendFromPrivateKey(
      this.privateKey,
      wallet.address,
      amountNano,
    );

    this.logger.log(
      `Test faucet sent ${nanoToTrx(amountNano)} TRX to ${wallet.address}`,
    );
    this.events.bump(userId);

    return {
      txHash,
      amountNano: amountNano.toString(),
      amountTrx: nanoToTrx(amountNano),
      toAddress: wallet.address,
    };
  }

  private parseAmount(raw: string): bigint {
    try {
      return parseAmountNano(raw);
    } catch (error) {
      if (error instanceof AmountError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }
}
