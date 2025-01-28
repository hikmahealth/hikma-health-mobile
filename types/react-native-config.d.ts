declare module 'react-native-config' {
    export interface NativeConfig {
        HIKMA_API?: string;
        HIKMA_API_TESTING?: string;
        HIKMA_DEV_API?: string;
        SENTRY_DSN?: string;
        SENTRY_AUTH_TOKEN?: string;
    }

    export const Config: NativeConfig
    export default Config
}