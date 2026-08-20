import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { RequestWithUser } from '../auth/jwt.guard';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected getTracker(request: RequestWithUser): Promise<string> {
    return Promise.resolve(request.user?.id ?? request.ip ?? 'anonymous');
  }
}
