import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Custom JSON replacer function to handle Date objects
 */
function jsonReplacer(key: string, value: any) {
    if (value instanceof Date) {
        return { __type: 'Date', value: value.toISOString() };
    }
    return value;
}

/**
 * Custom JSON reviver function to reconstruct Date objects
 */
function jsonReviver(key: string, value: any) {
    if (typeof value === 'object' && value !== null && value.__type === 'Date') {
        return new Date(value.value);
    }
    return value;
}

/**
 * A custom hook that provides a stateful value and a function to update it,
 * with automatic persistence to AsyncStorage. Handles Date objects correctly.
 * 
 * @template T The type of the state
 * @param {string} key The key to use for storing the state in AsyncStorage
 * @param {T} initialValue The initial value of the state
 * @returns {[T, (value: T | ((prevState: T) => T)) => void, boolean]} A tuple containing the current state, a function to update the state, and a loading flag
 */
export function useAsyncPersistedState<T>(key: string, initialValue: T): [T, (value: T | ((prevState: T) => T)) => void, boolean] {
    const [state, setState] = useState<T>(initialValue);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadState = async () => {
            try {
                const storedValue = await AsyncStorage.getItem(key);
                if (storedValue !== null) {
                    setState(JSON.parse(storedValue, jsonReviver));
                }
            } catch (error) {
                console.error('Error loading state:', error);
            } finally {
                setLoading(false);
            }
        };

        loadState();
    }, [key]);

    const setAsyncState = useCallback((value: T | ((prevState: T) => T)) => {
        setState((prevState) => {
            const newState = value instanceof Function ? value(prevState) : value;
            AsyncStorage.setItem(key, JSON.stringify(newState, jsonReplacer)).catch((error) =>
                console.error('Error saving state:', error)
            );
            return newState;
        });
    }, [key]);

    return [state, setAsyncState, loading];
}
