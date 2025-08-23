import {
  withDangerousMod,
  withSettingsGradle,
  withAppBuildGradle,
  withMainApplication,
  withXcodeProject,
} from "@expo/config-plugins"
import { ExpoConfig } from "@expo/config-types"
import filesys from "fs"
import path from "path"
import resolveFrom from "resolve-from"

const fs = filesys.promises

type Options = {
  disableJsi?: boolean
  databases?: string[]
  excludeSimArch?: boolean
}

// 2. In android/settings.gradle, add:
function settingGradle(gradleConfig: ExpoConfig): ExpoConfig {
  return withSettingsGradle(gradleConfig, (mod) => {
    if (!mod.modResults.contents.includes(":watermelondb-jsi")) {
      console.log("[WatermelonDB] Adding watermelondb-jsi to settings.gradle")

      // Keep original implementation but with logging
      mod.modResults.contents += `
          include ':watermelondb-jsi'
          project(':watermelondb-jsi').projectDir = new File([
              "node", "--print",
              "require.resolve('@nozbe/watermelondb/package.json')"
          ].execute(null, rootProject.projectDir).text.trim(), "../native/android-jsi")
        `
      console.log("[WatermelonDB] Successfully added watermelondb-jsi configuration")
    } else {
      console.log("[WatermelonDB] watermelondb-jsi already configured in settings.gradle")
    }
    return mod
  }) as ExpoConfig
}
// 3. In android/app/build.gradle, add:
function buildGradle(config: ExpoConfig): ExpoConfig {
  return withAppBuildGradle(config, (mod) => {
    console.log("[WatermelonDB] Checking android/app/build.gradle configuration...")

    if (!mod.modResults.contents.includes("pickFirst '**/libc++_shared.so'")) {
      console.log("[WatermelonDB] Adding pickFirst configuration for libc++_shared.so")
      mod.modResults.contents = mod.modResults.contents.replace(
        "android {",
        `
        android {
          packagingOptions {
             pickFirst '**/libc++_shared.so'
          }
        `,
      )
    } else {
      console.log("[WatermelonDB] pickFirst configuration already exists")
    }

    if (!mod.modResults.contents.includes("implementation project(':watermelondb-jsi')")) {
      console.log("[WatermelonDB] Adding watermelondb-jsi implementation to dependencies")
      mod.modResults.contents = mod.modResults.contents.replace(
        "dependencies {",
        `
        dependencies {
          implementation project(':watermelondb-jsi')
        `,
      )
      console.log("[WatermelonDB] Successfully added watermelondb-jsi dependency")
    } else {
      console.log("[WatermelonDB] watermelondb-jsi dependency already exists")
    }

    return mod
  }) as ExpoConfig
}
// https://github.com/morrowdigital/watermelondb-expo-plugin/pull/51/files#diff-ac4d678cfe00980f9ba9c66167516e4ab4139b78c94ff9c5083553ae8ad1f79e
function mainApplicationSDK52(config: ExpoConfig): ExpoConfig {
  return withMainApplication(config, (mod) => {
    if (
      !mod.modResults.contents.includes("import com.nozbe.watermelondb.jsi.WatermelonDBJSIPackage")
    ) {
      mod.modResults["contents"] = mod.modResults.contents.replace(
        "import android.app.Application",
        `
import android.app.Application
import com.nozbe.watermelondb.jsi.WatermelonDBJSIPackage;
`,
      )
    }

    if (!mod.modResults.contents.includes("packages.add(WatermelonDBJSIPackage())")) {
      const newContents2 = mod.modResults.contents.replace(
        "return packages",
        `
            packages.add(WatermelonDBJSIPackage())
        return packages`,
      )
      mod.modResults.contents = newContents2
    }

    return mod
  }) as ExpoConfig
}

// 4. If you're using Proguard, in android/app/proguard-rules.pro add:
function proGuardRules(config: ExpoConfig): ExpoConfig {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const contents = await fs.readFile(
        `${config.modRequest.platformProjectRoot}/app/proguard-rules.pro`,
        "utf-8",
      )
      if (!contents.includes("-keep class com.nozbe.watermelondb.** { *; }")) {
        const newContents = `
      ${contents}
      -keep class com.nozbe.watermelondb.** { *; }
      `

        await fs.writeFile(
          `${config.modRequest.platformProjectRoot}/app/proguard-rules.pro`,
          newContents,
        )
      }

      return config
    },
  ]) as ExpoConfig
}

function withSDK50(options: Options) {
  return (config: ExpoConfig): ExpoConfig => {
    let currentConfig: ExpoConfig = config

    // Android Configuration
    if (options?.disableJsi !== true) {
      console.log("[WatermelonDB] Configuring Android...")
      currentConfig = settingGradle(config)
      currentConfig = buildGradle(currentConfig)
      currentConfig = proGuardRules(currentConfig)
      // Only manual link package on sdk 52+ as descripted here:
      // https://github.com/Nozbe/WatermelonDB/issues/1769#issuecomment-2600274652
      currentConfig = mainApplicationSDK52(currentConfig)
      console.log("[WatermelonDB] Android configuration completed")
    }

    // iOS Configuration
    console.log("[WatermelonDB] Configuring iOS...")
    currentConfig = withCocoaPods(currentConfig)
    if (options?.excludeSimArch === true) {
      currentConfig = withExcludedSimulatorArchitectures(currentConfig)
    }
    console.log("[WatermelonDB] iOS configuration completed")

    return currentConfig as ExpoConfig
  }
}

// export default (config: ExpoConfig, options: Options) => {
//   return withSDK50(options)(config)
// }

export function withWatermelon(config: ExpoConfig, options: Options) {
  return withSDK50(options)(config)
}

// iOS Configuration Functions
function withCocoaPods(config: ExpoConfig): ExpoConfig {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      console.log("[WatermelonDB] Configuring iOS Podfile...")
      const filePath = path.join(config.modRequest.platformProjectRoot, "Podfile")
      const contents = await fs.readFile(filePath, "utf-8")

      const watermelonPath = isWatermelonDBInstalled(config.modRequest.projectRoot)
      if (watermelonPath) {
        if (!contents.includes("pod 'simdjson'")) {
          console.log("[WatermelonDB] Adding simdjson pod to Podfile")
          const patchKey = "post_install"
          const slicedContent = contents.split(patchKey)
          // Tombstone Aug 20 2025
          // slicedContent[0] += `\n  # WatermelonDB dependency\n  pod 'simdjson', path: File.join(File.dirname(\`node --print "require.resolve('../node_modules/@nozbe/simdjson/package.json')"\`)), :modular_headers => true \n\n  `
          slicedContent[0] += `\n  # WatermelonDB dependency\n  pod 'simdjson', path: '../node_modules/@nozbe/simdjson', :modular_headers => true \n\n  `
          await fs.writeFile(filePath, slicedContent.join(patchKey))
          console.log("[WatermelonDB] Successfully added simdjson pod")
        } else {
          console.log("[WatermelonDB] simdjson pod already configured")
        }
      } else {
        console.error(
          "[WatermelonDB] Error: WatermelonDB not found. Please make sure you have @nozbe/watermelondb installed",
        )
        throw new Error("Please make sure you have @nozbe/watermelondb installed")
      }
      return config
    },
  ]) as ExpoConfig
}

/**
 * Exclude building for arm64 on simulator devices in the pbxproj project.
 * Without this, production builds targeting simulators will fail.
 */
function setExcludedArchitectures(project: any): any {
  console.log("[WatermelonDB] Setting excluded architectures for iOS simulator")
  const configurations = project.pbxXCBuildConfigurationSection()

  for (const { buildSettings } of Object.values(configurations || {}) as any[]) {
    // Guessing that this is the best way to emulate Xcode.
    // Using `project.addToBuildSettings` modifies too many targets.
    if (typeof buildSettings?.PRODUCT_NAME !== "undefined") {
      buildSettings['"EXCLUDED_ARCHS[sdk=iphonesimulator*]"'] = '"arm64"'
    }
  }
  console.log("[WatermelonDB] Successfully configured excluded architectures")
  return project
}

const withExcludedSimulatorArchitectures = (config: ExpoConfig): ExpoConfig => {
  return withXcodeProject(config, (config) => {
    config.modResults = setExcludedArchitectures(config.modResults)
    return config
  }) as ExpoConfig
}

function isWatermelonDBInstalled(projectRoot: string): string | null {
  const resolved = resolveFrom.silent(projectRoot, "@nozbe/watermelondb/package.json")
  return resolved ? path.dirname(resolved) : null
}
