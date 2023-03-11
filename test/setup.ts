// we always make sure 'react-native' gets included first
import * as ReactNative from 'react-native';
import 'react-native-gesture-handler/jestSetup';
require('react-native-reanimated/lib/reanimated2/jestUtils').setUpTests();

// import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import mockFile from './mockFile';

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

// class I18n {
//   constructor(local: string) {
//     // this.locale = 'en';
//   }
// }
jest.mock('i18n-js', () => {
  return jest.requireActual('i18n-js/dist/require/index');
});
// jest.mock('i18n-js', () => ({
//   jest.requireActual('i18n-js/dist/require/index'),
//   currentLocale: () => 'en',
//   t: (key: string, params: Record<string, string>) => {
//     return `${key} ${JSON.stringify(params)}`;
//   },
// }));
//
//
// jest.mock('react-native-reanimated', () => {
//   const Reanimated = require('react-native-reanimated/mock.js');

//   // The mock for `call` immediately calls the callback which is incorrect
//   // So we override it with a no-op
//   Reanimated.default.call = () => {};

//   return Reanimated;
// });

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      dispatch: jest.fn(),
    }),
    useRoute: () => ({
      params: {
        id: '123',
      },
    }),

    useScrollToTop: (_: any) => {},
  };
});

// Silence the warning: Animated: `useNativeDriver` is not supported because the native animated module is missing
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// @ts-ignore
declare const tron; // eslint-disable-line @typescript-eslint/no-unused-vars

jest.useFakeTimers();
declare global {
  // @ts-ignore
  let __TEST__;
}
