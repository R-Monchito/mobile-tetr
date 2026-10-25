# Platform Integration Guide

This directory contains platform-specific integration code for the Tetrio Mobile engine.

## Structure

```
platform/
├── android/          # Android (Kotlin + Jetpack Compose)
├── ios/              # iOS/macOS (Swift + SwiftUI)
├── web/              # Web (TypeScript + WASM)
└── bindings/         # Generated UniFFI bindings (populated after `uniffi-bindgen generate`)
```

## Prerequisites

- Rust toolchain (MSVC + MSYS2/MinGW for `uniffi-bindgen`)
- `cargo install uniffi --features cli`
- Android Studio (for Android)
- Xcode 15+ (for iOS)
- Node.js 20+ (for Web)

## Generating Bindings

```bash
# From workspace root
cd native-spike
uniffi-bindgen generate tetrio_mobile.udl --language kotlin --out-dir ../platform/bindings/kotlin
uniffi-bindgen generate tetrio_mobile.udl --language swift --out-dir ../platform/bindings/swift
uniffi-bindgen generate tetrio_mobile.udl --language typescript --out-dir ../platform/bindings/typescript
```

## Android

### Structure
```
android/
├── settings.gradle.kts
├── build.gradle.kts
└── app/
    ├── build.gradle.kts
    └── src/main/
        ├── java/com/tetrio/mobile/
        │   ├── MainActivity.kt       # Compose UI + game loop
        │   └── ...
        └── jniLibs/                  # Native .so files (generated)
```

### Build
```bash
cd platform/android
./gradlew assembleDebug
```

### Key Components
- `TetrioEngine` - Kotlin wrapper around UniFFI `EngineSession`
- `TouchInputAdapter` - DAS/ARR touch handling (mirrors TS)
- `GameCanvas` - Compose Canvas rendering

## iOS

### Structure
```
ios/
├── Package.swift                    # SPM manifest
└── TetrioMobileCore/
    ├── TetrioEngine.swift           # @MainActor engine wrapper
    ├── TouchInputAdapter.swift      # DAS/ARR touch handling
    └── GameView.swift               # SwiftUI game view
```

### Build
```bash
cd platform/ios
swift build
# Or open in Xcode: xed .
```

### Key Components
- `TetrioEngine` - `@MainActor` ObservableObject with game loop
- `TouchInputAdapter` - Gesture recognition with DAS/ARR
- `GameView` - SwiftUI Canvas + gesture handling

## Web

### Structure
```
web/
├── package.json
├── vite.config.ts
├── index.html
└── src/
    ├── engine.ts      # TetrioEngine + TouchInputAdapter
    └── main.ts        # Canvas rendering + input setup
```

### Build
```bash
cd platform/web
npm install
npm run dev     # Development server
npm run build   # Production build
```

### Key Components
- `TetrioEngine` - WASM module loader + requestAnimationFrame loop
- `TouchInputAdapter` - PointerEvent handling with DAS/ARR
- Canvas 2D rendering

## Golden Replay Verification

Each platform must verify the golden replay checksum `aca04ded`:

```kotlin
// Android
val session = EngineSession(initialSnapshot)
session.applyCommand(EngineCommand.MoveLeft)
session.applyCommand(EngineCommand.RotateCw)
session.applyCommand(EngineCommand.HardDrop)
assert(session.computeChecksum() == "aca04ded")
```

```swift
// iOS
let session = try EngineSession(initial: initialSnapshot)
session.applyCommand(.moveLeft)
session.applyCommand(.rotateCw)
session.applyCommand(.hardDrop)
XCTAssertEqual(session.computeChecksum(), "aca04ded")
```

```typescript
// Web
const session = new EngineSession(initialSnapshot)
session.applyCommand({ type: "moveLeft" })
session.applyCommand({ type: "rotateCW" })
session.applyCommand({ type: "hardDrop" })
assert(session.computeChecksum() === "aca04ded")
```

## Cross-Platform Checklist

- [ ] Bindings generated for all three targets
- [ ] Golden replay checksum matches `aca04ded`
- [ ] 60fps sustained on target devices (A14 / Snapdragon 778G)
- [ ] Touch input parity across platforms
- [ ] Settings persistence separate from replay state
- [ ] No networking code in engine module
- [ ] Offline-only capability verified