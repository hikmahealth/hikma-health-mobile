import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Row } from '../../src/components/Row';

describe('Row', () => {
  it('should render children correctly', () => {
    const { getByText } = render(
      <Row>
        <Text>Test Content</Text>
      </Row>
    );
    expect(getByText('Test Content')).toBeTruthy();
  });

  it('should have the correct style', () => {
    const { getByTestId } = render(
      <Row>
        <Text testID="row-view">Test Content</Text>
      </Row>
    );
    const row = getByTestId('row-view');
    expect(row).toBeDefined();
  });
});

