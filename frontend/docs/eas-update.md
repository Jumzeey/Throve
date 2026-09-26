# EAS Update (OTA) — Throve mobile

Ship JS and asset changes without a new store binary. Native module / SDK / plugin changes still need a new build.

**Expo project:** [@jumzeeydevs-team/throve](https://expo.dev/accounts/jumzeeydevs-team/projects/throve)  
**Project ID:** `b0504134-8367-4f6c-bd9a-d8960baf919e`  
**Updates URL:** `https://u.expo.dev/b0504134-8367-4f6c-bd9a-d8960baf919e`

## Prerequisites

```bash
cd frontend
npx eas-cli@latest whoami   # must be logged in
```

If not logged in: `npx eas-cli@latest login`.

## Channels and profiles

| Profile (`eas.json`) | Channel | Use |
|----------------------|---------|-----|
| `preview` | `preview` | Internal / QA binaries |
| `production` | `production` | Store binaries |
| `development` | (none) | Dev Client — load updates via Extensions / Orbit |

**Runtime version** is the explicit string `1.0.0` (bare Android cannot use `{ "policy": "appVersion" }`). Keep `app.json` `runtimeVersion`, `expo.version`, and `android/.../strings.xml` `expo_runtime_version` in sync. Bump all three and rebuild when native deps change; OTAs only apply to matching runtime versions.

`android/app/google-services.json` is committed (Firebase client config, not a secret) so EAS cloud builds receive it.

Icons, splash and notification icon are native: changing them needs a new build, not an OTA. Regenerate them from `assets/images/throve-logo.png` with `npm run brand:assets` (macOS).

## 1. Build a binary that can receive OTAs

Existing installs built with updates disabled will **not** start pulling OTAs. Ship a new binary after this config:

```bash
# Internal QA (Android)
npx eas-cli@latest build --profile preview --platform android

# Store (when ready)
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --profile production
```

Install the preview build on a device before publishing test updates.

Local release builds (`expo run:android --variant release`) use the AndroidManifest preview channel header. EAS Build overrides the channel from `eas.json`.

## 2. Publish an OTA

Make a **JS/asset-only** change, then:

```bash
# Preview / QA
npm run update:preview -- --message "Describe the fix"
# or: npx eas-cli@latest update --channel preview --environment preview --message "Describe the fix"

# Production (store builds only)
npm run update:production -- --message "Describe the fix"
```

`--environment` resolves EAS environment variables (required on recent CLI / SDK 54+).

## 3. Test

1. Use a **preview or production** install (not Expo Go).
2. Force-quit and reopen up to **twice** (download on first launch, apply on second cold start).
3. Dev Client: Extensions tab or Expo Orbit can load the published update.

## What OTA can / cannot ship

| Can OTA | Needs new native build |
|---------|------------------------|
| Screens, styles, business logic | New native module / LiveKit / WebRTC bumps |
| Expo JS APIs already in the binary | New Expo SDK major, new permissions/plugins |
| Images/fonts in the JS update | Native-only `app.json` fields, splash changes that need prebuild |

## Ops checklist

- Publish to the **same channel** as the installed binary’s build profile.
- Keep **runtimeVersion** in sync with `expo.version` (bump + rebuild when native changes).
- Watch [Expo pricing](https://expo.dev/pricing) bandwidth/MAU on the free plan.
- When you add a committed `ios/` tree, ensure `Expo.plist` has `EXUpdatesURL`, `EXUpdatesRuntimeVersion`, and channel request headers.
