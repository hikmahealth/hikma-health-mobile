// we always make sure 'react-native' gets included first
import * as ReactNative from 'react-native';
// import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import mockFile from './mockFile';
import { create, createStore, storeResetFns } from './mockZustand';
// @ts-ignore: no type information
import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';

jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

// libraries to mock
jest.doMock('react-native', () => {
  // Extend ReactNative
  return Object.setPrototypeOf(
    {
      Image: {
        ...ReactNative.Image,
        resolveAssetSource: jest.fn(_source => mockFile), // eslint-disable-line @typescript-eslint/no-unused-vars
        getSize: jest.fn(
          (
            uri: string, // eslint-disable-line @typescript-eslint/no-unused-vars
            success: (width: number, height: number) => void,
            failure?: (_error: any) => void, // eslint-disable-line @typescript-eslint/no-unused-vars
          ) => success(100, 100),
        ),
      },
    },
    ReactNative,
  );
});

// jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('i18n-js', () => ({
  currentLocale: () => 'en',
  t: (key: string, params: Record<string, string>) => {
    return `${key} ${JSON.stringify(params)}`;
  },
}));

// Mock the useSafeAreaInsets hook
// jest.mock('react-native-safe-area-context', () => ({
//   useSafeAreaInsets: jest.fn(),
// }));


jest.mock('@nozbe/watermelondb/utils/common/randomId/randomId', () => { });


// jest.mock("zustand", () => ({
//   create,
//   createStore
// }))


jest.mock('react-native-encrypted-storage', () => {
  return {
    setItem: jest.fn(() => Promise.resolve()),
    getItem: jest.fn(() => Promise.resolve('{ "foo": 1 }')),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
  };
});


jest.mock('@xstate/react', () => {
  const state = {
    matches: jest.fn()
  }
  return {
    useActor: jest.fn(() => [state, jest.fn()]),
    useInterpret: jest.fn(),
    useService: jest.fn(() => [
      state, // This represents the state. You can adjust this mock value as needed.
      jest.fn(), // This represents the send function.
    ]),
    useMachine: jest.fn(() => [state, jest.fn()])
  }
});



// @ts-ignore
declare const tron; // eslint-disable-line @typescript-eslint/no-unused-vars

jest.useFakeTimers();
declare global {
  // @ts-ignore
  let __TEST__;
}
