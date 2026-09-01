import { isEventBookable } from '../../src/events/events.service';

const future = new Date('2099-01-01T00:00:00Z');

describe('isEventBookable', () => {
  it('allows a future internal event owned by a verified organizer', () => {
    expect(
      isEventBookable({
        status: 'PUBLISHED',
        bookingMode: 'INTERNAL',
        salesEnabled: true,
        startDateTime: future,
        organizer: { isVerified: true },
      }),
    ).toBe(true);
  });

  it('never exposes TicketFlow checkout for an external listing', () => {
    expect(
      isEventBookable({
        status: 'PUBLISHED',
        bookingMode: 'EXTERNAL',
        salesEnabled: true,
        startDateTime: future,
        organizer: { isVerified: true },
      }),
    ).toBe(false);
  });

  it('closes internal sales once an event has started', () => {
    expect(
      isEventBookable({
        status: 'PUBLISHED',
        bookingMode: 'INTERNAL',
        salesEnabled: true,
        startDateTime: new Date('2020-01-01T00:00:00Z'),
        organizer: { isVerified: true },
      }),
    ).toBe(false);
  });
});
