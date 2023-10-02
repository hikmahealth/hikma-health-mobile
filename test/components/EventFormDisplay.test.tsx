import { getEventDisplay, getEventDisplayPrint } from "../../src/components/EventFormDisplay";
import {Event} from "../../src/types/Event"

describe('getEventDisplay', () => {
  it('should return the correct display for an event with object metadata', () => {
    const mockEvent: Event = {
      eventMetadata: {
        key1: 'value1',
        key2: 'value2',
      },
    };

    const result = getEventDisplay(mockEvent);
    // DEVELOPER: Make assertions based on the expected result
  });

  // DEVELOPER: Add more tests for different event types and metadata structures
});

describe('getEventDisplayPrint', () => {
  it('should return the correct print display for an event with object metadata', () => {
    const mockEvent: Event = {
      eventMetadata: {
        key1: 'value1',
        key2: 'value2',
      },
      // DEVELOPER: ... other properties
    };

    const result = getEventDisplayPrint(mockEvent);
    // DEVELOPER: Make assertions based on the expected result
  });

  // DEVELOPER: Add more tests for different event types and metadata structures
});
