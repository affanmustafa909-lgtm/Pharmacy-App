# Hera Pharmacy

React Native Community CLI app. Static product data. Edit in `mobile/`.

## Windows build note

`E:\pharmacy app\mobile` is too long for CMake/Ninja. Build from the short mirror:

```bash
# sync + run (after editing mobile/)
robocopy "E:\pharmacy app\mobile" E:\h /MIR /XD node_modules .git android\app\build android\app\.cxx android\build android\.gradle
cd E:\h
npm install
npx react-native run-android
```

## Scripts

```bash
npm start
npm run android
npm run typecheck
```
