# Google Sign-In on Android — "SocialLogin plugin is not implemented" investigation

Investigated 2026-07-04. No code changed. HEAD at time of investigation: `d8ccee3` (2026-06-30).

## 1. Login/signup wiring

Both `app/login/page.tsx` and `app/signup/page.tsx` gate the Google button correctly:

```ts
async function handleGoogle() {
  if (isNativeGoogleShell()) {
    await signInWithGoogle(supabase);   // native path
    ...
    return;
  }
  await supabase.auth.signInWithOAuth({ provider: "google", ... }); // web/PWA path
}
```

`isNativeGoogleShell()` (from `src/lib/google-signin.ts`) is called, not a legacy `@capacitor/browser` deep-link flow, and there is no platform check that excludes Android — `isNativeGoogleShell()` returns `Capacitor.isNativePlatform()` for any native platform. **Confirmed: the button calls the intended `signInWithGoogle()` native code path on Android.**

## 2. Plugin registration list (`capacitor.plugins.json`)

`android/app/src/main/assets/capacitor.plugins.json` **does** list the plugin for Android after `cap sync`:

```json
{
  "pkg": "@capgo/capacitor-social-login",
  "classpath": "ee.forgr.capacitor.social.login.SocialLoginPlugin"
}
```

Gradle wiring is also intact and consistent with this:
- `android/capacitor.settings.gradle` — `include ':capgo-capacitor-social-login'`, pointed at `node_modules/@capgo/capacitor-social-login/android`.
- `android/app/capacitor.build.gradle` — `implementation project(':capgo-capacitor-social-login')` is present in the generated dependency list.
- The plugin's own `android/build.gradle` conditionally includes Google's runtime deps (`play-services-auth:21.4.0`, `androidx.credentials:credentials-play-services-auth:1.5.0`, `googleid:1.1.1`, `androidbrowserhelper:2.5.0`) behind a `socialLogin.google.include` Gradle property that defaults to `'true'` when unset. **`android/gradle.properties` has no `socialLogin.*` overrides**, so the default applies and these deps are compiled in as `implementation` (not `compileOnly`), meaning they should be present at runtime, not just at compile time.
- `android/app/build.gradle`'s release build type has `minifyEnabled false`, so R8/ProGuard stripping of the plugin class or its `@CapacitorPlugin` annotation is ruled out.
- JS-side `registerPlugin('SocialLogin', ...)` (in `node_modules/@capgo/capacitor-social-login/dist/esm/social-login.js`) matches the Java `@CapacitorPlugin(name = "SocialLogin")` annotation exactly — no name-mismatch between JS and native.

**Confirmed: registration is wired correctly everywhere I can inspect statically** (manifest merge, Gradle module graph, dependency inclusion, JS/native plugin name). This does not, on its own, explain the runtime "not implemented" error — see the note at the bottom.

## 3. MainActivity / manual registration requirement

```java
package com.sidusstudio.gellog;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {}
```

Checked the plugin's own README for Android-specific `MainActivity` setup requirements. **There are none for Google.** The only provider in this plugin that requires manual native wiring is **Facebook on iOS** (`AppDelegate.swift` + `Info.plist` URL scheme) — Android Google Sign-In here uses Credential Manager via `SocialLogin.initialize()`/`.login()` calls only; the README shows no `registerPlugin()` or `onActivityResult` step for Android. So a bare `BridgeActivity` is very likely *not* the root cause — this rules out item 3 as far as documentation goes.

## 4. GCP OAuth client / `google-services.json`

**This is a confirmed, real gap.** `android/app/google-services.json` has:

```json
"oauth_client": [],
```

Empty. Per its git history (`c6e8d02 chore(android): add Firebase/FCM SDK for push notifications`), this file was added solely for Firebase Cloud Messaging/push notifications and has **never been regenerated after adding an Android-type OAuth client**. The comment in `google-signin.ts` (lines 16-18) explicitly flags this as a requirement:

> "Android OAuth client (type: Android) with the keystore SHA-1 must also be registered in the same GCP project, and google-services.json regenerated to include it."

This was **not done**. That said: the Credential Manager / One Tap flow this plugin uses does **not** read `google-services.json`'s `oauth_client` array — it uses the `webClientId` passed directly into `SocialLogin.initialize({ google: { webClientId: ANDROID_WEB_CLIENT_ID } })`. So this gap is real and will block successful sign-in (or produce a different error, e.g. a Credential Manager `DEVELOPER_ERROR`/no-credential failure) once the bridge registration issue is fixed, but it is probably **not** the direct cause of the specific "plugin is not implemented on android" error, which is a bridge/registration-level failure, not an OAuth/credential-level one. **Needs fixing regardless** — register the release keystore SHA-1 against an Android OAuth client in the same GCP project as `ANDROID_WEB_CLIENT_ID`, then regenerate and replace `google-services.json`.

## 5. `isNativeGoogleShell()` vs `isCapacitorShell()`

`isNativeGoogleShell()` in `google-signin.ts` uses plain `Capacitor.isNativePlatform()`, not the more defensive `isCapacitorShell()` from `platform.ts` (which also checks for `androidBridge`/`webkit.messageHandlers.bridge` to cover the brief window where `isNativePlatform()` reports `false` before the bridge attaches).

**Flagging, not fixing:** this could in principle cause the Google button to fall through to the *web* OAuth-redirect branch instead of the native branch if the gate is checked in that brief "bridge not yet attached" window. But that would produce a *different* symptom — a browser redirect / `window.location.origin` OAuth flow launching instead of the native sheet — not the "SocialLogin plugin is not implemented on android" error, which only happens when the *native* branch **is** taken and the bridge can't find the plugin. So this discrepancy is real and worth aligning for consistency with `platform.ts`, but it does not appear to be the cause of the bug being chased in this session. Treating as a separate, lower-priority cleanup.

## What's still unexplained

I could not find a static-config explanation for the exact "not implemented" error — every registration surface I can inspect from the repo (manifest merge, plugin JSON, Gradle module graph + dependencies, JS/native name match, ProGuard) checks out. That points toward a **runtime-only failure during plugin instantiation** that these static checks can't see, e.g.:
- An exception thrown inside `SocialLoginPlugin`'s constructor/`load()` (Capacitor's `PluginManager` catches plugin-registration exceptions and logs them to Logcat rather than surfacing them to JS — the JS side just sees "not implemented").
- A device/emulator without Google Play Services, which the Credential Manager Play Services backend depends on.
- Since this is the Option A remote-URL wrapper, the JS actually executed is whatever is currently deployed at `https://www.gellog.app`, not necessarily what's in this working tree — worth confirming the Vercel production deployment actually includes `5d4c752`/`d8ccee3` before re-testing.

**Recommendation before another native rebuild:** pull `adb logcat` filtered on `Capacitor` (and `SocialLogin`/`ee.forgr`) during a fresh app launch and tapping the Google button. Capacitor logs a specific reason when a plugin fails to register or a method call finds no matching class — that will pinpoint the real cause (vs. guessing) and avoid burning another expensive release-build cycle. I have not made any code changes.

---

## Deferred (not investigated this session)

**Email/password sign-in fails on first two app opens after fresh install/update, succeeds on third.** Suspected cold-start race between session-storage reads and Capacitor bridge readiness — conceptually similar to the "ambiguous-shell" state `isCapacitorShell()`/`getPlatformContext()` already guard against elsewhere (`platform.ts`). Not blocking, noted for a future session.
