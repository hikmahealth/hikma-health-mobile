import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button } from '../../src/components/Button';
import { Text } from '../../src/components/Text';

describe('If', () => {
  it('should render children when condition is true', () => {
    // const {getByTestId, debug} =
    render(
      <Button>
        <Text testID="TestText" text="Test" />
      </Button>
    );

    expect(screen.getByTestId('TestText')).toBeDefined();
  });

  it('calls onpress when pressed in', () => {
    const handler = jest.fn()
    render(
      <Button testID="Button" onPress={handler}>
        <Text testID="TestText" text="Test" />
      </Button>
    )

    const btn = screen.getByTestId("Button")
    fireEvent(btn, "press")
    expect(handler).toBeCalled()
  })
});
