namespace ICDEntry {
  export type T = {
    code: string
    desc: string
    // desc_ar: string
  }

  /**
Render out a language appropriate diagnosis string

@param {ICDEntry} entry
@param {string} language
@returns {string} diagnosis display field
*/
  export function ICD10RecordLabel(entry: T, language: string): string {
    // const diagField = language === "ar" ? "desc_ar" : "desc"
    // FIXME: desc_ar is not a property of T (the old app had this. migrating away) Tombstone: June 24 2025
    // if (entry[diagField]) {
    //   return `${entry[diagField]} (${entry.code})`
    // } else {
    //   return `${entry.desc} (${entry.code})`
    // }
    return `${entry.desc} (${entry.code})`
  }
}

export default ICDEntry
