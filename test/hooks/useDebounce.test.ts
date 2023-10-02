import { renderHook, act } from '@testing-library/react-hooks';
import { useDebounce } from '../../src/hooks/useDebounce';

describe('useDebounce', () => {
  jest.useFakeTimers();

  it('should return the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('test', 500));

    expect(result.current).toBe('test');
  });

  it('should update the debounced value after the specified delay', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'test1', delay: 500 },
    });

    rerender({ value: 'test2', delay: 500 });

    expect(result.current).toBe('test1');

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toBe('test2');
  });

  it('should clear the timer on unmount', () => {
    const { unmount } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'test1', delay: 500 },
    });

    unmount();

    expect(clearTimeout).toHaveBeenCalled();
  });

});

