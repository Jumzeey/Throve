# Throve Live — Android Video Streaming Configuration

**Date:** 11 September 2026  
**Scope:** Current production Android Live implementation (read-only audit)  
**Status:** No code changes in this document — findings and recommendations only

---

## 1. Executive summary

Throve Live on Android uses **LiveKit WebRTC** with **stock LiveKit SDK defaults**. The app does **not** set custom capture resolution, bitrate, frame rate, or codec.

That is the main reason picture quality looks softer than TikTok / Instagram Live. Social apps typically use higher encode budgets, hardware H.264/H.265, and CDN live pipelines. Throve currently publishes roughly:

- **720p (1280×720 ideal)**
- **VP8**
- **~1.7 Mbps max** on the primary layer
- **Simulcast on**, **dynacast off**
- **No device-tier quality differences** (high-end and ~3 GB RAM phones use the same settings)

**Production provider in use:** LiveKit (`LIVE_MEDIA_PROVIDER=livekit`). Amazon IVS exists in code but is **not** used for in-app Android camera publish.

---

## 2. Current configuration (actual values found)

| Topic | Current value |
|---|---|
| Live / video SDK | LiveKit (`@livekit/react-native`, `livekit-client`, `@livekit/react-native-webrtc`) |
| Media provider (env) | `LIVE_MEDIA_PROVIDER=livekit` |
| Camera capture resolution | Ideal **1280×720** (LiveKit `VideoPresets.h720`) — not overridden in Throve |
| Outgoing primary stream | **1280×720**, max **1.7 Mbps**, **30 fps** |
| Simulcast layers (extra) | **320×180** (~160 kbps, 20 fps) and **640×360** (~450 kbps, 20 fps) |
| Target / min / max bitrate | Only **max** is defined (primary **1.7 Mbps**). No min. WebRTC can go lower under congestion |
| Frame rate | Capture ideal **30 fps**; lower simulcast layers **20 fps** |
| Video codec | **VP8** (LiveKit default). Backup codec enabled in SDK defaults |
| Adaptive bitrate | **Yes** — WebRTC congestion control |
| Auto lower quality on weak networks | **Yes** — camera degradation preference defaults to **maintain-framerate** (resolution drops first). Viewers can also receive lower simulcast layers |
| Front vs rear camera | **Same quality** — only `facingMode` differs (`user` / `environment`) |
| Lower-end Android devices | **No separate settings** — no RAM / device checks |
| Provider-side transcoding | **None in Throve**. LiveKit SFU forwards WebRTC layers (not TikTok-style HLS transcode CDN) |
| Crash / heat / data caps in our code | **None intentional** beyond SDK defaults |

---

## 3. What the app actually configures

### Room setup (host and viewer)

In `frontend/components/live/live-stage.tsx`, LiveKit is started as:

- `audio={isHost}`
- `video={isHost}`
- `options={{ adaptiveStream: { pixelDensity: 'screen' } }}`

No custom:

- resolution
- frameRate
- videoEncoding / bitrate
- videoCodec
- simulcast / dynacast overrides
- device performance profile

### Host camera publish

Host enables camera with only:

- `facingMode: 'user'` or `'environment'`

No quality options are passed.

### Viewer display

Video is rendered with `objectFit: "cover"` (fullscreen crop/scale).

---

## 4. LiveKit defaults we inherit (from installed SDK)

From `livekit-client` defaults used by the app:

### Capture default

- Resolution: **1280×720**
- Frame rate: **30** (from h720 preset)

### Publish defaults

- Codec: **VP8**
- Simulcast: **true**
- Backup codec: **true**
- Primary encode for h720: **1.7 Mbps @ 30 fps**

### Room option defaults (SDK)

- `adaptiveStream`: false by default in SDK — **Throve turns it on** with `pixelDensity: 'screen'`
- `dynacast`: **false** (Throve does not enable it)

### Preset reference (LiveKit)

| Preset | Resolution | Max bitrate | FPS |
|---|---|---|---|
| h180 | 320×180 | 160 kbps | 20 |
| h360 | 640×360 | 450 kbps | 20 |
| h540 | 960×540 | 800 kbps | 25 |
| h720 | 1280×720 | 1.7 Mbps | 30 |
| h1080 | 1920×1080 | 3.0 Mbps | 30 |

---

## 5. Amazon IVS status

IVS is implemented as an alternate provider path:

- Backend can create IVS channels and return ingest / playback URLs
- Frontend IVS host path currently shows a banner that in-app camera publish is not ready (OBS RTMPS would be required)
- Local env has LiveKit credentials set; AWS access keys for IVS are unset

**Conclusion for Android Live picture quality today:** quality is determined by **LiveKit WebRTC**, not IVS.

---

## 6. Why quality feels softer than TikTok / Instagram Live

1. **Lower encode budget** — ~1.7 Mbps VP8 vs social live often using higher bitrate and hardware H.264/H.265.
2. **Realtime WebRTC path** — optimised for low latency, not product-detail sharpness.
3. **Landscape 720p ideal on a portrait phone UI** — vertical `cover` scaling/crop can add softness.
4. **No Throve-side tuning** — defaults only; no high-end Wi‑Fi boost.
5. **No CDN live transcode ladder** like major social apps.
6. **Same settings on weak and strong devices** — no adaptive device profile in our code.

---

## 7. Comparison to sensible live-shopping targets

| Scenario | Sensible target | Throve today |
|---|---|---|
| Strong Wi‑Fi / high-end Android | 720×1280 or 1080p30, H.264, ~2.5–4 Mbps, simulcast + dynacast | 720p landscape ideal, VP8 ~1.7 Mbps, simulcast on, dynacast off |
| Average mobile / mid-range | 720p30, H.264, ~1.5–2.5 Mbps, simulcast | Similar resolution target, weaker codec/bitrate |
| Lower-end phones (~3 GB RAM) | Cap 540–720p, 15–24 fps, ≤1.2–1.7 Mbps; avoid always-on 1080p | Same settings as high-end (higher crash/heat risk if we raise quality globally) |

---

## 8. Recommended safest quality improvement to test

Do **not** move all devices to 1080p first.

### Recommended first A/B test

1. Explicitly set publish defaults to **720p30 + H.264 + ~2.5 Mbps**
2. Keep **simulcast**
3. Enable **`dynacast: true`** (saves host CPU/bandwidth when high layers are unused)
4. Keep front/rear quality the same initially
5. Do **not** remove simulcast
6. Do **not** force 1080p for everyone in v1 of the test

### Why this is safest

- Better perceived sharpness (hardware H.264 + modest bitrate increase)
- Lower heat/crash risk than always-on 1080p
- Dynacast reduces waste on weak networks / small viewers
- Still compatible with mid-range and many lower-end devices

### Later (only after A/B looks stable)

- Optional device tier: if RAM ≤ ~3 GB, keep 720p/1.7 Mbps or drop to 540p
- Optional high-end boost: 1080p only on strong Wi‑Fi + capable devices
- Revisit portrait capture constraints for vertical live shopping framing

### Avoid in the first test

- Force 1080p for all Android
- Disable simulcast
- Raise bitrate above ~4 Mbps with no device checks

---

## 9. Files inspected

- `frontend/components/live/live-stage.tsx`
- `frontend/lib/livekit-native.ts`
- `frontend/lib/livekit-native-impl.ts`
- `frontend/package.json`
- `backend/src/lib/live-media.ts`
- `backend/src/lib/livekit.ts`
- `backend/src/lib/ivs.ts`
- `backend/.env` / `backend/.env.example`
- `README.md`
- `node_modules/livekit-client/src/room/defaults.ts`
- `node_modules/livekit-client/src/room/track/options.ts`

---

## 10. One-line takeaway for stakeholders

**Throve Android Live is LiveKit WebRTC on default 720p / VP8 / 1.7 Mbps settings; the safest first quality win is an explicit H.264 720p ~2.5 Mbps publish profile with dynacast enabled — not an immediate jump to 1080p.**

---

## 11. Next: portrait capture (separate from this A/B)

Current UI stays portrait with `objectFit: "cover"` on a landscape-ideal 720p capture. Do **not** combine portrait-capture / constraint changes with the H.264 + bitrate A/B in the same test — we need to know which change actually improves perceived quality.

Follow-up investigation (after quality A/B evidence):

- Whether LiveKit / WebRTC on Android can publish a native portrait capture profile (e.g. 720×1280) instead of landscape 1280×720 + cover crop
- Impact on sharpness of product detail in vertical live shopping
- Keep layout unchanged until that experiment is isolated

A/B control for the encode profile is `EXPO_PUBLIC_LIVE_VIDEO_PROFILE=legacy|test` (see `frontend/.env.example` and `files/LIVE_VIDEO_PROFILE_AB_TEST.md`).
