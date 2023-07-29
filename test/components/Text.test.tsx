import {render, screen} from '@testing-library/react-native';
import { Text } from '../../src/components/Text';

describe("Text Component", () => {
  it('Should render the the text given', () => {
    render(
      <Text text="Test" />
    )

    expect(screen.getByText("Test")).toBeDefined()
  })
})
