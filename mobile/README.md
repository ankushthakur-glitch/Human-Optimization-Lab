# Human Optimization: Patient App

The patient's mobile app, built with React Native on Expo (SDK 57, React Native 0.86). Android first; the same code builds for iOS.

## The flow it covers

1. The practice invites the patient. The invitation email (web prototype: `/screens/login/invite-email/mobile?as=patient`) carries the app download link, the patient's email and a one-time password.
2. The patient installs the app and opens it on **Activate your account**, then signs in with that email and one-time password.
3. **Set your password** replaces the one-time password: at least 12 characters, with upper and lowercase letters, a number and a symbol (the web portal's rules). There is no two-factor step for patients.
4. The patient lands on **Home**. After that, the app opens on **Sign in** (email and their own password), or straight to Home while they stay signed in.

In the prototype, the email's app link opens the web build at `/app/activate?email=...` with the email filled in. The installed native app answers the same path on its `hol://` scheme: `hol://activate?email=...`.

### Sample account

There is no backend yet. The app knows one sample patient ([src/lib/patient.ts](src/lib/patient.ts)):

| Field | Value |
| --- | --- |
| Email | `olivia.bennett@example.com` |
| One-time password | `Hx4-pR8t-Lm2` |

[src/lib/auth.tsx](src/lib/auth.tsx) stands in for the server. It keeps a SHA-256 hash of the password the patient sets in SecureStore (Android Keystore, iOS Keychain). When the API exists, replace the bodies of `activate`, `setPassword` and `signIn` with API calls; the screens stay as they are. To start over on a device, clear the app's storage or reinstall it.

## Run it

You need Node 20+, Android Studio (its SDK and an emulator), and Java from Android Studio's bundled JBR.

```bash
cd mobile
npm install
npm run prebuild        # generates android/ from app.json (icons, splash, package id)
```

### From Android Studio

1. **File > Open** and pick `mobile/android`. Let Gradle sync.
2. Start an emulator from **Device Manager**.
3. For a build that runs without a dev server, set **Build Variants > app > release** and press **Run**. The release build bundles the JavaScript and is signed with the debug key, so it installs on any emulator or test phone.
4. For live reload while developing, keep the **debug** variant, run `npx expo start` in `mobile/`, then press **Run**.

### From the terminal

```bash
npm run android                       # debug build on the running emulator, with live reload
cd android && ./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

That release APK is the file to share with testers until the app is in the Play Store.

## Web version (installable, for reviews)

The same code builds as a website that installs like an app: open it in Chrome, tap **Install app** (or Chrome's menu, **Add to home screen**), and the HOL icon lands on the home screen and opens full screen. The manifest, install icons and page template are in `public/`. On web the password hash lives in the browser's localStorage.

```bash
npm run web             # local dev server
npm run build:web       # builds into ../public/app, which the web portal serves
```

It goes live with the web portal: the build is committed to `public/app/` at the repo root and served at `/app` on the portal's Vercel site (`experiments.baseUrl` in app.json; the rewrite in the root `next.config.ts` lets `/app/activate?email=...` links work). After changing the app, run `npm run build:web` and commit `public/app/` with it. Installing needs HTTPS, which Vercel provides (Chrome also accepts `localhost`).

To try it on the Android emulator locally: run the portal (`npm run dev` at the repo root), run `adb reverse tcp:3000 tcp:3000`, and open `http://localhost:3000/app` in the emulator's Chrome.

## Project layout

```
mobile/
  app.json               Name, package id (com.humanoptimizationlab.patient), hol:// scheme, icons, splash
  src/app/               Screens (Expo Router: each file is a route)
    _layout.tsx          Fonts, splash, and which screens exist in each account state
    activate.tsx         Email + one-time password
    set-password.tsx     New password + confirm
    sign-in.tsx          Returning patient
    index.tsx            Home
  src/components/ui.tsx  Screen, fields, buttons
  src/lib/               Account state, sample patient, validation, theme
  assets/                Icon, adaptive icon layers, splash and lockup, rendered from the brand SVGs
```

`android/` is generated and not committed. Configure native settings in `app.json`, then run `npm run prebuild -- --clean` to regenerate it.

## Icons

The launcher icon, the Android adaptive and themed (monochrome) layers, the splash mark and the sign-in lockup are rendered from `public/brand/` at the repo root, so they match the web favicon and logo. After a logo change:

```bash
npm run icons           # from mobile/, runs ../scripts/gen-mobile-icons.mjs
npm run prebuild -- --clean
```

## Checks

```bash
npm run typecheck
```
