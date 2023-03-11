import {generateEvents} from '../../../src/utils/generators/events';
import {Event} from '../../../src/types';

describe('generateEvents', () => {
  it('should generate an array of events', () => {
    const events = generateEvents(5, 'patientId', 'visitId');
    expect(events).toHaveLength(5);
    expect(events[0]).toMatchObject<Event>({
      patientId: 'patientId',
      visitId: 'visitId',
      id: expect.any(String),
      eventType: expect.any(String),
      eventMetadata: expect.any(String),
      isDeleted: false,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
  });
});
