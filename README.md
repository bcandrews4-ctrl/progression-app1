# progression-app
member progression app

# Gym Progression App Design

This is a code bundle for Gym Progression App Design. The original project is available at https://www.figma.com/design/D6XusngAnaphpFSLFMDArH/Gym-Progression-App-Design.

## Installation

Run `npm i` to install the dependencies.

## Running the app

### Web Development Mode
Run `npm run dev` to start the development server (web version).

### Native App Development Mode
Run `npm run electron:dev` to build and run the native Electron app in development mode.

### Building Native App
Run `npm run build:electron` to build the native app for your platform. The built app will be in the `release` directory.

## Features

- ✅ Fixed import case inconsistencies
- ✅ Weight input is now typeable (no spinner arrows)
- ✅ TypeScript errors resolved
- ✅ Native app support via Electron
- ✅ Cross-platform (macOS, Windows, Linux)

## HealthKit Sync (Backend + iOS Bridge)

This repo now includes:
- `backend/`: Express + SQLite API to ingest workouts and health metrics.
- `ios/HealthBridge/`: Swift helpers to read HealthKit and upload to backend.

See `backend/README.md` for server setup and `ios/HealthBridge/README.md` for
iOS integration steps.

## React Native Mobile App

`GymProgressionMobile/` is the native mobile app project (React Native).
See `GymProgressionMobile/README.md` for setup and HealthKit sync steps.
