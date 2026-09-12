# Android Live video profile A/B — evidence sheet

**Do not** flip `EXPO_PUBLIC_LIVE_VIDEO_PROFILE` default to `test` until this sheet has evidence from all three device classes.

## Profiles

| Control | Meaning |
|---|---|
| Prepare form (Android) **Legacy · VP8** / **Test · H.264** | Temporary closed-tester toggle — persists on device; remove after A/B |
| `EXPO_PUBLIC_LIVE_VIDEO_PROFILE=legacy` (default) | Build fallback if no in-app override |
| `EXPO_PUBLIC_LIVE_VIDEO_PROFILE=test` | Build fallback for test encode |
| `test` + device RAM ≤ ~3 GB | Safer auto-tier: H.264 540p @ 1.5 Mbps / 24 fps |

In-app toggle wins over the env flag. Requires a native Android build (Expo Go cannot run LiveKit WebRTC).

Host connect logs: `[live-video-profile]` with `profile`, `tier`, codec, bitrate, dynacast.

## Out of scope for this A/B

- 1080p for all devices
- 60 fps
- Bitrate above 4 Mbps
- Disabling simulcast
- Portrait capture constraint changes (see report §11)

## Test matrix

For each device class, run **legacy** and **test** builds (same room conditions where possible).

### 1. High-end Android

| Metric | Legacy | Test |
|---|---|---|
| Picture sharpness | | |
| Buffering | | |
| Crashes / freezes | | |
| Device heat | | |
| CPU / memory (if available) | | |
| Upload stability | | |
| Approx data usage | | |
| Logged tier (`legacy` / `test` / `test_low_end`) | | |

Notes:

### 2. Mid-range Android

| Metric | Legacy | Test |
|---|---|---|
| Picture sharpness | | |
| Buffering | | |
| Crashes / freezes | | |
| Device heat | | |
| CPU / memory (if available) | | |
| Upload stability | | |
| Approx data usage | | |
| Logged tier | | |

Notes:

### 3. ~3 GB RAM Android

Expect `test` build to log `tier: test_low_end` (540p / 1.5 Mbps / 24 fps), not 2.5 Mbps.

| Metric | Legacy | Test (low-end tier) |
|---|---|---|
| Picture sharpness | | |
| Buffering | | |
| Crashes / freezes | | |
| Device heat | | |
| CPU / memory (if available) | | |
| Upload stability | | |
| Approx data usage | | |
| Logged tier | | |

Notes:

## Weak-network spot check

Confirm adaptive / congestion control still lowers quality under poor upload (do **not** disable degradation).

| Scenario | Observed |
|---|---|
| Legacy on weak network | |
| Test on weak network | |

## Go / no-go

- [ ] Evidence filled for high-end, mid-range, and ~3 GB devices
- [ ] No unacceptable crash/heat regression on `test`
- [ ] Low-end devices did **not** run the 2.5 Mbps profile
- [ ] Stakeholder sign-off before changing default to `test`
