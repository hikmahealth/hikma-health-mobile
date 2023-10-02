import { renderHook } from '@testing-library/react-hooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeAreaInsetsStyle } from '../../src/utils/useSafeAreaInsetsStyle';


describe('useSafeAreaInsetsStyle', () => {
  it('should return padding styles for safe area edges', () => {

    const { result } = renderHook(() => useSafeAreaInsetsStyle(['top', 'bottom', 'start', 'end']));

    expect(result.current).toEqual({
      paddingTop: 0,
      paddingBottom: 0,
      paddingStart: 0,
      paddingEnd: 0,
    });
  });

});

