import { renderHook, act } from '@testing-library/react-hooks';
import { useIsMounted } from '../../src/utils/useIsMounted';

describe('useIsMounted', () => {
  it('should return a function that indicates if the component is mounted', () => {
    // Render the hook
    const { result, unmount } = renderHook(() => useIsMounted());

    // Initially, the component is mounted
    expect(result.current()).toBe(true);

    // Unmount the component
    act(() => {
      unmount();
    });

    // After unmounting, the component is not mounted
    expect(result.current()).toBe(false);
  });
});
