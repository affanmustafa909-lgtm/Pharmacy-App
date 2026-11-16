This is a React Native Community CLI app (no Expo).

## Commands

```bash
npm install
npx react-native run-android
npm start
npm run typecheck
```

On Windows, native builds must run from a short path such as `E:\h`. The folder `E:\pharmacy app\mobile` exceeds the CMake/Ninja path limit.

## Layout

- `App.tsx` and `src/navigation` own navigation (React Navigation).
- Screens live in `src/app`.
- Product data is static in `src/data`.
- Android package: `com.hera.pharmacy`.
