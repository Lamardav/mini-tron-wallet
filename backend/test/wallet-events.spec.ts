import { WalletEventsService } from '../src/wallet/wallet-events.service';

describe('WalletEventsService', () => {
  it('starts every user at version zero', () => {
    expect(new WalletEventsService().versionFor('user-1')).toBe(0);
  });

  it('returns immediately when a change already happened', async () => {
    const events = new WalletEventsService();
    events.bump('user-1');

    await expect(events.waitForChange('user-1', 0, 5000)).resolves.toBe(1);
  });

  it('resolves as soon as a change arrives', async () => {
    const events = new WalletEventsService();
    const waiting = events.waitForChange('user-1', 0, 5000);

    events.bump('user-1');

    await expect(waiting).resolves.toBe(1);
  });

  it('resolves with null when nothing happens before the deadline', async () => {
    const events = new WalletEventsService();

    await expect(events.waitForChange('user-1', 0, 20)).resolves.toBeNull();
  });

  it('keeps versions separate per user', async () => {
    const events = new WalletEventsService();
    const waiting = events.waitForChange('user-1', 0, 40);

    events.bump('user-2');

    await expect(waiting).resolves.toBeNull();
    expect(events.versionFor('user-2')).toBe(1);
  });

  it('leaves no listeners behind after waiting', async () => {
    const events = new WalletEventsService();

    await events.waitForChange('user-1', 0, 20);
    const waiting = events.waitForChange('user-1', 0, 5000);
    events.bump('user-1');
    await waiting;

    expect(events.versionFor('user-1')).toBe(1);
  });
});
