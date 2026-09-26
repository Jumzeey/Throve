// Regenerates app icons, splash, notification icon, favicon and Play Store art
// from assets/images/throve-logo.png (plum mark on ivory).
//
// Usage (from frontend/): swift scripts/brand-assets.swift

import AppKit
import CoreGraphics
import CoreText
import Foundation
import ImageIO
import UniformTypeIdentifiers

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let images = root.appendingPathComponent("assets/images")
let store = root.appendingPathComponent("assets/store")
let res = root.appendingPathComponent("android/app/src/main/res")
let fontsRoot = root.appendingPathComponent("../node_modules/@expo-google-fonts")

struct RGB { let r, g, b: CGFloat }
let plum = RGB(r: 0x5A / 255, g: 0x1F / 255, b: 0x45 / 255)
let ivory = RGB(r: 0xFF / 255, g: 0xF7 / 255, b: 0xF0 / 255)
let white = RGB(r: 1, g: 1, b: 1)
let black = RGB(r: 0, g: 0, b: 0)

func cg(_ c: RGB, _ a: CGFloat = 1) -> CGColor { CGColor(srgbRed: c.r, green: c.g, blue: c.b, alpha: a) }

// MARK: - Mark extraction

/// Alpha mask of the mark, cropped to its bounds (8-bit gray, 255 = ink).
func extractMask(from url: URL) -> CGImage {
  guard let src = CGImageSourceCreateWithURL(url as CFURL, nil),
        let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { fatalError("Cannot read \(url.path)") }
  let w = img.width, h = img.height
  var px = [UInt8](repeating: 0, count: w * h * 4)
  let ctx = CGContext(data: &px, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
                      space: CGColorSpace(name: CGColorSpace.sRGB)!,
                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))

  // Luma of paper vs ink; anything in between is anti-aliasing.
  let paper: CGFloat = 244, ink: CGFloat = 70
  var mask = [UInt8](repeating: 0, count: w * h)
  var minX = w, minY = h, maxX = 0, maxY = 0
  for y in 0..<h {
    for x in 0..<w {
      let i = (y * w + x) * 4
      let l = 0.299 * CGFloat(px[i]) + 0.587 * CGFloat(px[i + 1]) + 0.114 * CGFloat(px[i + 2])
      var t = (paper - l) / (paper - ink)
      t = min(max(t, 0), 1)
      if t < 0.08 { t = 0 }
      let a = UInt8(t * 255)
      mask[y * w + x] = a
      if a > 40 {
        minX = min(minX, x); maxX = max(maxX, x)
        minY = min(minY, y); maxY = max(maxY, y)
      }
    }
  }
  let pad = 4
  minX = max(0, minX - pad); minY = max(0, minY - pad)
  maxX = min(w - 1, maxX + pad); maxY = min(h - 1, maxY + pad)
  let cw = maxX - minX + 1, ch = maxY - minY + 1
  var cropped = [UInt8](repeating: 0, count: cw * ch)
  for y in 0..<ch {
    for x in 0..<cw { cropped[y * cw + x] = mask[(y + minY) * w + (x + minX)] }
  }
  let provider = CGDataProvider(data: Data(cropped) as CFData)!
  return CGImage(width: cw, height: ch, bitsPerComponent: 8, bitsPerPixel: 8, bytesPerRow: cw,
                 space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGBitmapInfo(rawValue: 0),
                 provider: provider, decode: nil, shouldInterpolate: true, intent: .defaultIntent)!
}

let mask = extractMask(from: images.appendingPathComponent("throve-logo.png"))
let markAspect = CGFloat(mask.width) / CGFloat(mask.height)

// MARK: - Drawing helpers

func canvas(_ w: Int, _ h: Int, _ draw: (CGContext) -> Void) -> CGImage {
  let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0,
                      space: CGColorSpace(name: CGColorSpace.sRGB)!,
                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  ctx.interpolationQuality = .high
  ctx.setShouldAntialias(true)
  draw(ctx)
  return ctx.makeImage()!
}

/// Draws the mark tinted `color`, fitted inside a centered box of `fraction` of the canvas.
func drawMark(_ ctx: CGContext, in rect: CGRect, color: RGB, alpha: CGFloat = 1) {
  var box = rect
  if rect.width / rect.height > markAspect {
    box.size.width = rect.height * markAspect
    box.origin.x = rect.midX - box.width / 2
  } else {
    box.size.height = rect.width / markAspect
    box.origin.y = rect.midY - box.height / 2
  }
  ctx.saveGState()
  ctx.clip(to: box, mask: mask)
  ctx.setFillColor(cg(color, alpha))
  ctx.fill(box)
  ctx.restoreGState()
}

func centered(_ size: CGFloat, _ fraction: CGFloat) -> CGRect {
  let s = size * fraction
  return CGRect(x: (size - s) / 2, y: (size - s) / 2, width: s, height: s)
}

func markImage(size: Int, fraction: CGFloat, color: RGB, background: RGB? = nil, circle: Bool = false) -> CGImage {
  canvas(size, size) { ctx in
    let s = CGFloat(size)
    if let bg = background {
      ctx.setFillColor(cg(bg))
      if circle { ctx.fillEllipse(in: CGRect(x: 0, y: 0, width: s, height: s)) } else { ctx.fill(CGRect(x: 0, y: 0, width: s, height: s)) }
    }
    drawMark(ctx, in: centered(s, fraction), color: color)
  }
}

func solid(_ size: Int, _ color: RGB) -> CGImage {
  canvas(size, size) { ctx in
    ctx.setFillColor(cg(color))
    ctx.fill(CGRect(x: 0, y: 0, width: size, height: size))
  }
}

/// Drops the alpha channel (Play Store feature graphics must be 24-bit).
func opaque(_ img: CGImage) -> CGImage {
  let ctx = CGContext(data: nil, width: img.width, height: img.height, bitsPerComponent: 8, bytesPerRow: 0,
                      space: CGColorSpace(name: CGColorSpace.sRGB)!,
                      bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
  ctx.draw(img, in: CGRect(x: 0, y: 0, width: img.width, height: img.height))
  return ctx.makeImage()!
}

func write(_ img: CGImage, _ url: URL) {
  try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
  guard let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else {
    fatalError("Cannot write \(url.path)")
  }
  CGImageDestinationAddImage(dest, img, nil)
  CGImageDestinationFinalize(dest)
  print("wrote", url.path.replacingOccurrences(of: root.path + "/", with: ""))
}

// Fractions of the canvas the mark occupies.
let iconFraction: CGFloat = 0.64      // full-bleed icons (iOS, Play, legacy Android)
let adaptiveFraction: CGFloat = 0.50  // inside the 66dp-of-108dp adaptive safe zone
let splashFraction: CGFloat = 0.92
let notificationFraction: CGFloat = 0.9

// MARK: - Expo source assets (app.json)

write(opaque(markImage(size: 1024, fraction: iconFraction, color: plum, background: ivory)), images.appendingPathComponent("icon.png"))
write(markImage(size: 1024, fraction: adaptiveFraction, color: plum), images.appendingPathComponent("android-icon-foreground.png"))
write(solid(1024, ivory), images.appendingPathComponent("android-icon-background.png"))
write(markImage(size: 1024, fraction: adaptiveFraction, color: black), images.appendingPathComponent("android-icon-monochrome.png"))
write(markImage(size: 1024, fraction: splashFraction, color: plum), images.appendingPathComponent("splash-icon.png"))
write(markImage(size: 96, fraction: notificationFraction, color: white), images.appendingPathComponent("notification-icon.png"))
write(markImage(size: 196, fraction: 0.8, color: plum, background: ivory), images.appendingPathComponent("favicon.png"))
write(markImage(size: 1024, fraction: 0.96, color: plum), images.appendingPathComponent("throve-mark.png"))

// MARK: - Native Android resources (bare workflow)

let densities: [(String, CGFloat)] = [("mdpi", 1), ("hdpi", 1.5), ("xhdpi", 2), ("xxhdpi", 3), ("xxxhdpi", 4)]
for (d, scale) in densities {
  let mipmap = res.appendingPathComponent("mipmap-\(d)")
  for name in ["ic_launcher", "ic_launcher_round", "ic_launcher_foreground", "ic_launcher_background", "ic_launcher_monochrome"] {
    try? FileManager.default.removeItem(at: mipmap.appendingPathComponent("\(name).webp"))
  }
  let legacy = Int(48 * scale), adaptive = Int(108 * scale)
  write(markImage(size: legacy, fraction: iconFraction, color: plum, background: ivory), mipmap.appendingPathComponent("ic_launcher.png"))
  write(markImage(size: legacy, fraction: 0.58, color: plum, background: ivory, circle: true), mipmap.appendingPathComponent("ic_launcher_round.png"))
  write(markImage(size: adaptive, fraction: adaptiveFraction, color: plum), mipmap.appendingPathComponent("ic_launcher_foreground.png"))
  write(solid(adaptive, ivory), mipmap.appendingPathComponent("ic_launcher_background.png"))
  write(markImage(size: adaptive, fraction: adaptiveFraction, color: black), mipmap.appendingPathComponent("ic_launcher_monochrome.png"))

  let drawable = res.appendingPathComponent("drawable-\(d)")
  write(markImage(size: Int(160 * scale), fraction: splashFraction, color: plum), drawable.appendingPathComponent("splashscreen_logo.png"))
  write(markImage(size: Int(24 * scale), fraction: notificationFraction, color: white), drawable.appendingPathComponent("notification_icon.png"))
}

// MARK: - Play Store

func registerFont(_ relative: String) {
  let url = fontsRoot.appendingPathComponent(relative)
  var err: Unmanaged<CFError>?
  if !CTFontManagerRegisterFontsForURL(url as CFURL, .process, &err) {
    print("warn: font", relative, err?.takeRetainedValue().localizedDescription ?? "")
  }
}
registerFont("playfair-display/600SemiBold/PlayfairDisplay_600SemiBold.ttf")
registerFont("inter/400Regular/Inter_400Regular.ttf")
registerFont("inter/500Medium/Inter_500Medium.ttf")

func font(_ name: String, _ size: CGFloat) -> CTFont { CTFontCreateWithName(name as CFString, size, nil) }

func drawText(_ ctx: CGContext, _ text: String, font f: CTFont, color: RGB, alpha: CGFloat = 1, x: CGFloat, baseline: CGFloat, kern: CGFloat = 0) {
  let attrs: [NSAttributedString.Key: Any] = [
    NSAttributedString.Key(kCTFontAttributeName as String): f,
    NSAttributedString.Key(kCTForegroundColorAttributeName as String): cg(color, alpha),
    NSAttributedString.Key(kCTKernAttributeName as String): kern,
  ]
  let line = CTLineCreateWithAttributedString(NSAttributedString(string: text, attributes: attrs))
  ctx.textPosition = CGPoint(x: x, y: baseline)
  CTLineDraw(line, ctx)
}

write(opaque(markImage(size: 512, fraction: iconFraction, color: plum, background: ivory)), store.appendingPathComponent("play-store-icon-512.png"))

func featureGraphic(background: RGB, ink: RGB, sub: RGB) -> CGImage {
  let W = 1024, H = 500
  return canvas(W, H) { ctx in
    ctx.setFillColor(cg(background))
    ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))

    // Oversized, faint mark bleeding off the right edge.
    drawMark(ctx, in: CGRect(x: 640, y: -120, width: 560, height: 560), color: ink, alpha: 0.07)

    // Mark + wordmark lockup (CoreGraphics origin is bottom-left).
    let markBox = CGRect(x: 96, y: 150, width: 200, height: 200)
    drawMark(ctx, in: markBox, color: ink)

    let textX: CGFloat = 340
    drawText(ctx, "Throve", font: font("PlayfairDisplay-SemiBold", 104), color: ink, x: textX, baseline: 262, kern: 0.5)
    drawText(ctx, "Fashion & beauty resale", font: font("Inter-Medium", 30), color: sub, x: textX + 4, baseline: 206)
    drawText(ctx, "Browse  ·  Make offers  ·  Shop live", font: font("Inter-Regular", 24), color: sub, alpha: 0.8, x: textX + 4, baseline: 164)
  }
}

let plumSub = RGB(r: 0xF3 / 255, g: 0xE6 / 255, b: 0xDC / 255)
let ivorySub = RGB(r: 0x5C / 255, g: 0x4B / 255, b: 0x45 / 255)
write(opaque(featureGraphic(background: plum, ink: ivory, sub: plumSub)), store.appendingPathComponent("play-store-feature-graphic-1024x500.png"))
write(opaque(featureGraphic(background: ivory, ink: plum, sub: ivorySub)), store.appendingPathComponent("play-store-feature-graphic-1024x500-light.png"))
