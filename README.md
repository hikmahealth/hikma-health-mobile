# Hikma Health Mobile Application

The Hikma Health platform is a mobile electronic health record system designed for organizations working in low-resource settings to collect and access patient health information. The repository contains the mobile application (Android tested, iOS support included) that supports offline functionality, thousands of patients and multiple languages including Arabic, Spanish, and English. Other languages can be added trivially.

The platform is designed to be intuitive and allow for efficient patient workflows for patient registration, data entry, and data download. You can see a user demo here: https://drive.google.com/file/d/1ssBdEPShWCu3ZXNCXnoodbwWgqlTncJb/view?usp=drive_link

This repository contains the client-side code for Hikma Health's mobile application. The corresponding server-side code is located at https://github.com/hikmahealth/hikma-health-backend. Please feel free to file feature requests and bugs at either location.

This app is built using React Native with Expo and can be compiled for either iOS or Android, although we do most of our testing on Android.

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)

![check-code-coverage](https://img.shields.io/badge/code--coverage-11.41%25-red)

## Quick Start

First, make sure you have set up react-native and Expo development environment by following the latest documentation on the official guide found here: https://docs.expo.dev/get-started/installation/

Clone this project

```bash
  git clone git@github.com:hikmahealth/hikma-health-mobile.git
```

Set up the backend either locally or remotely by following the instructions on the backend repository: https://github.com/hikmahealth/hikma-health-backend

Go to the project directory

```bash
  cd hikma-health-mobile
```

Install the dependencies using pnpm - depending on your internet connection, this could take a few minutes.

```bash
  pnpm install
```

Run the application on mobile device and/or emulator

```bash
  pnpm android
```

For iOS:

```bash
  pnpm ios
```

## Environment Variables

To run this project, you will need to add the following environment variables to your .env file

1. `EXPO_PUBLIC_HIKMA_API_TESTING`: This is the endpoint for where your backend is hosted. This file is by default already ignored in the `.gitignore` file, make sure it remains there.

Sentry configuration is handled through the app.json file in the Sentry plugin configuration.

🔥 DO NOT COMMIT THIS INFORMATION TO YOUR VERSION CONTROL (GITHUB) OR SHARE IT WITH UNAUTHORIZED PERSONNEL 🔥

## Technology Stack

Hikma Health mobile application is built on the open source community, key technologies used are:

- **Expo SDK (v53):** Managed React Native development platform
- **React Native (v0.79):** Cross platform development framework developed by Facebook
- **React (v19):** Declarative UI Framework
- **TypeScript (v5.8):** Adding types support to JavaScript
- **React Navigation (v7):** Performant and pleasant navigation library
- **Zustand/XState Store (v3.8):** State management with XState integration
- **XState (v5.20):** State Machines Library for complex workflows
- **React Hook Form (v7.62):** Performant forms with easy validation
- **WatermelonDB (v0.28)**: Fast, Scalable & Lazy local database solution built on SQLite
- **React Native MMKV (v3.2):** Fast & secure key-value storage
- **Expo Secure Store (v14.2):** Secure storage for sensitive data
- **i18next (v23.14) + react-i18next (v15):** Internationalization with RTL support
- **React Native Reanimated (v3.17):** Smooth animations with native performance
- **@legendapp/list (v1.1):** High-performance list component
- **Lucide React Native (v0.539):** Beautiful & consistent icon library
- **date-fns (v4.1):** Modern JavaScript date utility library
- **Sentry (v6.14):** Error tracking and performance monitoring
- **Effect (v3.17):** Functional programming utilities
- **Hermes:** Fast and efficient JavaScript engine
- **Jest (v29):** Test runner
- **Maestro:** Automated End-to-End UI testing library
- **EAS Build & Submit:** Expo Application Services for building and distributing

## Features

- Offline Patient Registration
- Offline patient visits and workflows
- Fast sync of data to backend
- Light/dark mode toggle
- Download patient data
- Multilanguage support (including RTL)
- Cross platform (Android tested, iOS supported)
- Easily extendable
- Supports custom workflows and forms

The Hikma Health App project's structure will look similar to this:

```
hikma-health-mobile
├── app
│   ├── assets
│   ├── components
│   ├── config
│   ├── data
│   ├── db
│   ├── devtools
│   ├── hooks
│   ├── i18n
│   ├── models
│   ├── navigators
│   ├── screens
│   ├── services
│   ├── store
│   ├── theme
│   ├── utils
│   └── app.tsx
├── assets
│   ├── icons
│   └── images
├── lib
├── plugins
├── test
│   ├── __snapshots__
│   ├── mockFile.ts
│   └── setup.ts
├── types
├── vendor
├── .maestro
│   └── shared
├── README.md
├── android
├── ios
├── app.config.ts
├── app.json
├── eas.json
├── package.json
├── pnpm-lock.yaml
├── .env
└── tsconfig.json
```

### ./app directory

The `app` directory contains the main application code:

**assets**
Application-specific assets and resources.

**components**
Reusable UI components that help build screens.

**config**
Configuration files for different environments (dev/prod).

**data**
Data layer including API calls and data transformations.

**db**
Database models and migrations for WatermelonDB.

**devtools**
Development tools and debugging utilities.

**hooks**
Custom React hooks for shared logic.

**i18n**
Internationalization files and translations.

**models**
Data models and business logic.

**navigators**
React Navigation navigators and routing configuration.

**screens**
Screen components that represent full pages in the app.

**services**
External services integration (APIs, storage, etc.).

**store**
Global state management with XState and Zustand.

**theme**
Application theming including colors, typography, and spacing.

**utils**
Shared utility functions and helpers.

**app.tsx**
Main application entry point.

### ./lib directory

Custom libraries and vendor-specific code.

### ./plugins directory

Custom Expo plugins for build-time configuration.

### ./types directory

TypeScript type definitions.

### ./vendor directory

Third-party libraries with custom modifications.

### ./.maestro directory

End-to-end test configurations and flows.

## Package Manager

This project uses **pnpm** as the package manager. Make sure you have pnpm installed:

```bash
npm install -g pnpm
```

All commands should be run with pnpm:

```bash
pnpm install
pnpm android
pnpm ios
pnpm test
```

## Running Maestro end-to-end tests

Follow our [Maestro Setup](https://ignitecookbook.com/docs/recipes/MaestroSetup) recipe from the [Ignite Cookbook](https://ignitecookbook.com/)!

Run E2E tests:

```bash
pnpm test:maestro
```

## EAS Build & Deploy

This project uses Expo Application Services (EAS) for building and deploying:

### Development Builds

```bash
# Android development build
pnpm build:android:dev

# iOS development build  
pnpm build:ios:dev
```

### Production Builds

```bash
# Android production build
pnpm build:android:prod

# iOS production build
pnpm build:ios:prod
```

### OTA Updates

```bash
# Push OTA update to production
pnpm eas:update:prod
```

## Screenshots

<div style="display: flex">
  <img src="https://drive.google.com/uc?export=view&id=1kwDc9YuXC27DI8jnbvcHwr6EWMENDfRU" style="width: 200px; height:auto;" alt="Hikma Health" />
  <img src="https://drive.google.com/uc?export=view&id=1jGzP4cVkfg42sbCTwD69IZmNpsIa0vDA" style="width: 200px; height:auto;" alt="Hikma Health" />
  <img src="https://drive.google.com/uc?export=view&id=1UYK1wHHnNtT1KInZ9Nv53dKTDS1ZlqOr" style="width: 200px; height:auto" alt="Hikma Health" />
  <img src="https://drive.google.com/uc?export=view&id=13HntluH8zTokKSFvaMeqHmlGjBvjZWnT" style="width: 200px; height:auto" alt="Hikma Health" />
  <img src="https://drive.google.com/uc?export=view&id=10-ihEwudiCo_ozOa_5TlRtVaL-jdhaLR" style="width: 200px; height:auto;" alt="Hikma Health" />
  <img src="https://drive.google.com/uc?export=view&id=1Xcu6_-3cHqRTLfhuiFZmxeSvApd4tEEK" style="width: 200px; height:auto" alt="Hikma Health" />
</div>



## Troubleshooting

#### iOS application fails to start with an error to do with the RN DatePicker

Apply the patch in patches/react-native-date-picker+5.0.13.patch:

In your terminal:

```bash
# Navigate to the specific package
cd node_modules/react-native-date-picker 

# Apply the patch
git apply ../../patches/react-native-date-picker+5.0.13.patch 
```


## FAQ

#### How do I delete the local data during testing?

Simply clear the application data and the app stored data will be removed. You can do this by going to the app settings (for android you can long press the icon from your apps menu), and choosing to clear all data from storage.

Remember that all data that is deleted before being synchronized is lost forever and this should only be done with testing data.

Furthermore, if the data has been synchronized and uploaded to the server, deleting the data locally will not help much since the data from the server will just synchronize back in on the next sync event (should be when you log in next time)

#### How do I add a new language to the app

In the application code, locate the folder `app/i18n`. This folder contains all the translation files, with English, Español and Arabic already there.

You can add new language by creating a new file with your translations and updating the `app/i18n/index.ts` file with the location and name of your new translation. That's it!

#### How do I get help?

If you are stuck for more than 10 minutes, please open an issue or email our head of development at `ally[at]hikmahealth.org` with your questions and concerns.

We are constantly looking for ways to build THE best portable electronic health record system and are constantly looking for feedback.

## Roadmap

Features on the roadmap represent the vision for the mobile app over the coming versions, but none are guaranteed. If there is a feature you would love to see supported, open a feature-request / issue with more details and we can prioritize features with the most requests.

- [ ] Improve online only support (for areas with guaranteed internet access)
- [ ] Improve test coverage (priority to 80%)
- [ ] Faster boot time on lower end devices
- [x] Official iOS support (add documentation for this support)
- [ ] Memory & performance profiling
- [ ] Automated CI pipeline for tests (add coveralls)
- [ ] Migration to React Native's New Architecture
- [ ] Enhanced offline capabilities with background sync

## Contributing

Please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for more information.

## Credits

This project, like many other open source works, relies heavily on the open source community and their contributions. We have built this EHR system on the shoulders of great projects such as the [Ignite](https://github.com/infinitered/ignite) boilerplate, WatermelonDB, Expo, and many others.
