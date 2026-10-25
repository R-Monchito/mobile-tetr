plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.tetrio.mobile"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.tetrio.mobile"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
    }

    buildFeatures {
        viewBinding = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    packaging {
        jniLibs {
            useLegacyPackaging = true
        }
    }

    sourceSets.configureEach {
        if (name == "main" || name == "test") {
            kotlin.srcDir("src/main/java/uniffi")
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.activity:activity-compose:1.8.2")
    implementation(platform("androidx.compose:compose-bom:2024.02.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
    androidTestImplementation(platform("androidx.compose:compose-bom:2024.02.00"))
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")

    // JNA for UniFFI FFI calls (UniFFI runtime is bundled in generated bindings)
    implementation("net.java.dev.jna:jna:5.13.0")
}

tasks.withType<org.gradle.api.tasks.testing.Test> {
    workingDir = project.projectDir
    systemProperty("java.library.path", "app/build/intermediates/merged_jni_libs/debug/mergeDebugJniLibFolders/out/x86_64")
    systemProperty("jna.library.path", "build/intermediates/merged_jni_libs/debug/mergeDebugJniLibFolders/out/x86_64")
    jvmArgs(
        "-Duniffi.component.tetrio_mobile_core.libraryOverride=tetrio_mobile_core",
        "-Djna.library.path=build/intermediates/merged_jni_libs/debug/mergeDebugJniLibFolders/out/x86_64"
    )
}