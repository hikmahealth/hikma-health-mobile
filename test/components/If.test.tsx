import {render, screen} from '@testing-library/react-native';
import {If} from '../../src/components/If';
import {Text} from 'react-native';

describe('If', () => {
  it('should render children when condition is true', () => {
    // const {getByTestId, debug} =
    render(
      <>
        <If condition={true}>
          <Text accessibilityLabel="answer input" testID="testStr">
            Test
          </Text>
        </If>
      </>,
    );

    expect(screen.getByTestId('testStr')).not.toBeNull();
  });

  it('should not render children when condition is false', () => {
    render(
      <>
        <If condition={false}>
          <Text>Test</Text>
        </If>
      </>,
    );

    expect(screen.queryByText('Test')).toBeNull();
  });
});
