<p align="center">
<img src="https://drive.google.com/file/d/1zQgr6td283xH2xDEvg70oyCHH_1TJzbx/view?usp=sharing" alt="Hikma Health" />
</p>


# Hikma Health Mobile Application
The Hikma Health platform is a mobile electronic health record system designed for organizations working in low-resource settings to collect and access patient health information. The repository contains the mobile application (Android tested, iOS support can be includes) that supports offline functionality, thousands of patients and multiple languages including Arabic, Spanish, and English. Other languages can be added trivially.

The platform is designed to be intuitive and allow for efficient patient workflows for patient registration, data entry, and data download. You can see a user demo here: https://drive.google.com/file/d/1ssBdEPShWCu3ZXNCXnoodbwWgqlTncJb/view?usp=drive_link

This repository contains the client-side code for Hikma Health's mobile application. The corresponding server-side code is located at https://github.com/hikmahealth/hikma-health-backend. Please feel free to file feature requests and bugs at either location.

This app is built using React Native and can be compiled for either iOS or Android, although we do most of our testing on Android.


[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)

## Get started locally
First, make sure you have set up react-native to run on your local environment by following the latest documentation on the official guide found here: https://reactnative.dev/docs/environment-setup

Clone this project

```bash
  git clone git@github.com:hikmahealth/hikma-health-mobile.git
```

Set up the backend either locally or remotely by following the instructions on the backend repository: https://github.com/hikmahealth/hikma-health-backend 

Go to the project directory

```bash
  cd hikma-health-mobile
```

Install the dependencies - depending on your internet connection, this could take a few minutes.
```bash
  npm install
```

Run the application on mobile application on a connected device and/or emulator
```bash
  npm run android
```


## Environment Variables

To run this project, you will need to add the following environment variable to your .env file

`HIKMA_API`

This is the endpoint for where your backend is hosted. This file is by default already ignored in the `.gitignore` file, make sure it remains there.

🔥 DO NOT COMMIT THIS INFORMATION TO YOUR VERSION CONTROL (GITHUB) OR SHARE IT WITH UNAUTHORIZED PERSONEL 🔥
## Technology Stack
Hikma Health mobile application is built on the open source community, key technologies used are:
- **React Native (v0.71):** Cross platform development framework developed by Facebook 
- **React (v18):** Declarative UI Framework
- **React Native Paper (v5.10):** Material design theming component library
- **TypeScript (v4.8):** Adding types support to JavaScript
- **React Navigation (v6):** Performant and pleasant navigation library
- **Zustand (v4.4):** Painless state management
- **Xstate (v3.2.1):** State Machines Library for complex workflows
- **Expo (v47):** For optional expo module support
- **Expo Localization (v14):** i18n support with RTL
- **RN Reanimated (v2):** Animations library built with native technologies
- **FlashList (v1.4):** Extremely fast and native replacement for the react-native flastlist.
- **WatermelonDB (v26)**: Fast, Scalable & Lazy local database solution built on the battle tested SQLite
- **AsyncStorage (v1):** Persistance of non-sensitive data + state on the device
- **RN Encrypted Storage (v4.0.3):** Persistance of sensitive data on the device
- **Hermes:** Fast and efficient JavaScript engine
- **Jest (v26):** Test runner
- **Maestro:** Automated End-to-End UI testing library
- **date-fns (v2):** Simple declarative date library
## Features
- Offline Patient Registration
- Offline patient visits and workflows
- Fast sync of data to backend
- Light/dark mode toggle
- Download patient data
- Multilanguage support (including RTL)
- Cross platform (Android tested, iOS can be added)
- Easily extendable
- Supports custom workflows and forms

## FAQ

#### How do I delete the local data during testing?

Simply clear the application data and the app stored data will be removed. You can do this by going to the app settings (for android you can long press the icon from your apps menu), and choosing to clear all data from storage.

Remember that all data that is deleted before being synchronized is lost forever and this should only be done with testing data.

Furthermore, if the data has been synchronized and uploaded to the server, deleting the data locally will not help much since the data from the server will just synchronize back in on the next sync event (should be when you log in next time)

#### How do I add a new language to the app

In the application code, locate the folder `i18n`. This folder contains all the translation files, with English, Espanol and Arabic already there.

You can add new language by creating a new file with your translations and updating the `src/i18n/index.ts` file with the location and name of your new translation. Thats it!

(If you are old enough to remember the nightmare of translations just 10 years ago, its a new world!)


#### How do I get help?

If you are stuck for more than 10 minutes, please open an issue or email our head of development at `ally[at]hikmahealth.org` with your questions and concerns.

We are constantly looking for ways to build THE best portable electronic health record system and are constantly looking for feedback.

## Roadmap
Features on the roadmap represent the vision for the mobile app over the coming versions, but none are guaranteed. If there is a feature you would love to see supported, open a feature-request / issue with more details and we can prioritize features with the most requests.

- [ ]  Improve online only support (for areas with guaranteed internet access)
- [ ]  Improve test coverage (priority)
- [ ]  Faster boot time on lower end devices
- [ ]  Official iOS support
- [ ]  Memory & performance profiling
- [ ]  Improved LTR to RTL (and vice versa) support: Currently needs a screen to be re-rendered for the system to pick up the change
- [ ]  Automated CI pipeline for tests


## License

[MIT](https://choosealicense.com/licenses/mit/)

