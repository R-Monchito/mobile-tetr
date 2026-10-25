// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "TetrioMobileCore",
    platforms: [
        .iOS(.v16),
        .macOS(.v13)
    ],
    products: [
        .library(
            name: "TetrioMobileCore",
            targets: ["TetrioMobileCore"]
        ),
    ],
    dependencies: [
        // UniFFI runtime
        .package(url: "https://github.com/mozilla/uniffi-rs.git", exact: "0.32.2"),
    ],
    targets: [
        .binaryTarget(
            name: "TetrioMobileCoreFFI",
            path: "TetrioMobileCore.xcframework"
        ),
        .target(
            name: "TetrioMobileCore",
            dependencies: [
                .product(name: "UniFFI", package: "uniffi-rs"),
                "TetrioMobileCoreFFI"
            ],
            path: "TetrioMobileCore",
            sources: [
                "tetrio_mobile_core.swift",
                "TetrioEngine.swift",
                "GameView.swift"
            ],
            resources: [
                .copy("tetrio_mobile_core.xcframework"),
            ],
            linkerSettings: [
                .linkedFramework("Foundation"),
            ]
        ),
        .testTarget(
            name: "TetrioMobileCoreTests",
            dependencies: ["TetrioMobileCore"],
            path: "Tests"
        ),
    ]
)