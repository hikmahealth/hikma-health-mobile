declare module 'react-native-config' {
    export interface NativeConfig {
        HIKMA_API?: string;
        HIKMA_DEV_API?: string;
    }

    export const Config: NativeConfig
    export default Config
}