# Android Live video profile A/B — evidence sheet

**Do not** flip `EXPO_PUBLIC_LIVE_VIDEO_PROFILE` default to `test` until this sheet has evidence from all three device classes.

## Profiles

| Control | Meaning |
|---|---|
| Prepare form (Android) **Legacy · VP8** / **Test · H.264** | Temporary closed-tester toggle — persists on device; remove after A/B |
| `EXPO_PUBLIC_LIVE_VIDEO_PROFILE=legacy` (default) | Build fallback if no in-app override |
| `EXPO_PUBLIC_LIVE_VIDEO_PROFILE=test` | Build fallback for test encode |
| `test` + device RAM ≤ ~3 GB | Safer auto-tier (see front/rear table below) |

In-app toggle wins over the env flag. Requires a native Android build (Expo Go cannot run LiveKit WebRTC).

Host connect logs: `[live-video-profile]` with `profile`, `tier`, `facing`, codec, bitrate, dynacast. Camera flips also log `[live-video-profile] camera switch` with facing + capture/encoding.

## Test · H.264 front vs rear encode matrix

Legacy keeps a single SDK-default path for both cameras (facingMode only).

| Facing | Device tier | Capture | FPS | Max bitrate |
|---|---|---|---|---|
| Rear | mid/high | 1280×720 | 30 | 2.5 Mbps |
| Front | mid/high | 1280×720 | 24 | 2.2 Mbps |
| Rear | low-end (≤3 GB RAM) | 960×540 | 24 | 1.5 Mbps |
| Front | low-end | 960×540 | 20 | 1.3 Mbps |

Hosts join on **front** (`user`), so room defaults use the front row. Flipping to rear restarts capture and best-effort updates publisher encoding to the rear row.

## Out of scope for this A/B

- 1080p for all devices
- 60 fps
- Bitrate above 4 Mbps
- Disabling simulcast
- Portrait capture constraint changes (see report §11)

## Test matrix

For each device class, run **legacy** and **test** builds (same room conditions where possible). On Test, check **front** and **rear** after flipping the host camera control.

### 1. High-end Android

| Metric | Legacy | Test (front) | Test (rear) |
|---|---|---|---|
| Picture sharpness | | | |
| Buffering | | | |
| Crashes / freezes | | | |
| Device heat | | | |
| CPU / memory (if available) | | | |
| Upload stability | | | |
| Approx data usage | | | |
| Logged tier / facing | | | |

Notes:

### 2. Mid-range Android

| Metric | Legacy | Test (front) | Test (rear) |
|---|---|---|---|
| Picture sharpness | | | |
| Buffering | | | |
| Crashes / freezes | | | |
| Device heat | | | |
| CPU / memory (if available) | | | |
| Upload stability | | | |
| Approx data usage | | | |
| Logged tier / facing | | | |

Notes:

### 3. ~3 GB RAM Android

Expect `test` build to log `tier: test_low_end`. Front should use 540p / 20 fps / 1.3 Mbps; rear 540p / 24 fps / 1.5 Mbps — not the 2.5 Mbps mid-tier.

| Metric | Legacy | Test front (low-end) | Test rear (low-end) |
|---|---|---|---|
| Picture sharpness | | | |
| Buffering | | | |
| Crashes / freezes | | | |
| Device heat | | | |
| CPU / memory (if available) | | | |
| Upload stability | | | |
| Approx data usage | | | |
| Logged tier / facing | | | |

Notes:

## Weak-network spot check

Confirm adaptive / congestion control still lowers quality under poor upload (do **not** disable degradation).

| Scenario | Observed |
|---|---|
| Legacy on weak network | |
| Test front on weak network | |
| Test rear on weak network | |

## Go / no-go

- [ ] Evidence filled for high-end, mid-range, and ~3 GB devices
- [ ] No unacceptable crash/heat regression on `test`
- [ ] Low-end devices did **not** run the 2.5 Mbps profile
- [ ] Front vs rear Test rows verified after camera flip
- [ ] Stakeholder sign-off before changing default to `test`
