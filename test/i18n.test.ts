import { execSync, exec } from "child_process"

import en from "../app/i18n/en"

// Use this array for keys that for whatever reason aren't greppable so they
// don't hold your test suite hostage by always failing.
const EXCEPTIONS: string[] = [
  // "welcomeScreen:readyForLaunch",

  /**
   * This translation key actually shows up in a comment describing the usage of the translate
   * function in the app/i18n/translate.ts file. Because the grep command in the i18n test below
   * doesn't account for commented out code, we must manually exclude it so tests don't fail
   * because of a comment.
   */
  "hello",
  "patientList.deletePatientQuestion",
  "patientList.confirmDeletePatient",
]

function iterate(obj, stack, array) {
  for (const property in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, property)) {
      if (typeof (obj as object)[property] === "object") {
        iterate(obj[property], `${stack}.${property}`, array)
      } else {
        array.push(`${stack.slice(1)}.${property}`)
      }
    }
  }

  return array
}

/**
 * This tests your codebase for missing i18n strings so you can avoid error strings at render time
 *
 * It was taken from https://gist.github.com/Michaelvilleneuve/8808ba2775536665d95b7577c9d8d5a1
 * and modified slightly to account for our Ignite higher order components,
 * which take 'tx' and 'fooTx' props.
 * The grep command is nasty looking, but it's essentially searching the codebase for a few different things:
 *
 * tx="*"
 * Tx=""
 * tx={""}
 * Tx={""}
 * translate(""
 *
 * and then grabs the i18n key between the double quotes
 *
 * This approach isn't 100% perfect. If you are storing your key string in a variable because you
 * are setting it conditionally, then it won't be picked up.
 *
 */

describe("i18n", () => {
  test("There are no missing keys", () => {
    try {
      const command = `grep "[T\\|t]x=[{]\\?\\"\\S*\\"[}]\\?\\|translate(\\"\\S*\\"" -ohr './app' | grep -o "\\".*\\""`
      const stdout = execSync(command, {
        encoding: "utf8",
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      })

      const allTranslationsDefinedOld = iterate(en, "", [])
      const allTranslationsDefined = allTranslationsDefinedOld.map((key) => key.replace(".", ":"))
      const allTranslationsUsed = stdout.replace(/"/g, "").split("\n").filter(Boolean)

      console.log("Found keys:", allTranslationsUsed.slice(0, 5))

      for (let i = 0; i < allTranslationsUsed.length; i += 1) {
        if (!EXCEPTIONS.includes(allTranslationsUsed[i])) {
          expect(allTranslationsDefined).toContainEqual(allTranslationsUsed[i])
        }
      }
    } catch (error) {
      console.error("Command failed:", error.message)
      throw error
    }
  }, 240000)
  // test("There are no missing keys", (done) => {
  //   // Actual command output:
  //   // grep "[T\|t]x=[{]\?\"\S*\"[}]\?\|translate(\"\S*\"" -ohr './app' | grep -o "\".*\""
  //   // Note: --exclude-dir=data excludes the data directory which contains large ICD files that cause grep to hang
  //   // const command = `grep -E "[Tt]x=[{]?\"[^\"]*\"|translate\(\"[^\"]*\"" -ohr --exclude-dir=data './app' | grep -o "\"[^\"]*\""`
  //   // const command = `grep "[T\\|t]x=[{]\\?\\"\\S*\\"[}]\\?\\|translate(\\"\\S*\\"" -ohr --exclude-dir=data './app' | grep -o "\\".*\\""`
  //   // const command = [
  //   //   "grep",
  //   //   '[T\\|t]x=[{]?\\\"\\S*\\\"[}]?\\|translate(\\\"\\S*\\\"',
  //   //   "-ohr",
  //   //   // "--exclude-dir=data",
  //   //   "./app",
  //   //   "|",
  //   //   "grep",
  //   //   "-o",
  //   //   '\\".*\\"',
  //   // ].join(" ")
  //   const command = `grep '[T\\|t]x=[{]?"\\S*"[}]?\\|translate("\\S*")' -ohr --exclude-dir=data './app' | grep -o '".*"'`

  //   // exec(command, (_, stdout) => {
  //   exec(command, (error, stdout, stderr) => {
  //     console.log("Command:", command)
  //     console.log("Error:", error)
  //     console.log("Stdout length:", stdout.length)
  //     console.log("Stderr:", stderr)
  //     console.log("First few results:", stdout.slice(0, 200))
  //     const allTranslationsDefinedOld = iterate(en, "", [])
  //     // Replace first instance of "." because of i18next namespace separator
  //     const allTranslationsDefined = allTranslationsDefinedOld.map((key) => key.replace(".", ":"))
  //     const allTranslationsUsed = stdout.replace(/"/g, "").split("\n")
  //     allTranslationsUsed.splice(-1, 1)

  //     for (let i = 0; i < allTranslationsUsed.length; i += 1) {
  //       if (!EXCEPTIONS.includes(allTranslationsUsed[i])) {
  //         // You can add keys to EXCEPTIONS (above) if you don't want them included in the test
  //         expect(allTranslationsDefined).toContainEqual(allTranslationsUsed[i])
  //       }
  //     }
  //     done()
  //   })
  // }, 240000)
})
