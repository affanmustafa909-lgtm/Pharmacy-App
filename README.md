# Hera Pharmacy App

React Native Community CLI customer app for Hera Pharmacy.

## Windows build note

Long workspace paths can break CMake/Ninja. If needed, build from a short mirror:

```bash
robocopy "E:\pharmacy app\mobile" E:\h /MIR /XD node_modules .git android\app\build android\app\.cxx android\build android\.gradle
cd E:\h
npm install
npx react-native run-android
```

## Scripts

```bash
npm install
npm start
npm run android
npm run typecheck
```
