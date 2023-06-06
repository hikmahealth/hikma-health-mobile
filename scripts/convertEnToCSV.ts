////////////////////////////////////////////////////////////
////// HELPER SCRIPT TO CONVERT THE en.ts TRANSLATIONS INTO A CSV THAT
///// CAN EASILY BE EDITED IN A SPREADSHEET
///// RUN: node ./convertEnTOCSV
///////////////////////////////////////////////////////////

import { get } from "lodash";
import ar from "../src/i18n/ar";
import en from "../src/i18n/en";
import es from "../src/i18n/es";
// import fs from "fs"


let existingTranslations = {
  en: en,
  es: es,
  ar: ar,
  // Can add other objects
  // sw: {}
}

let eT = existingTranslations

function flattenObject(obj: any, prefix = '') {
  let flattenedObj: Record<string, string> = {};

  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      let nestedKey = prefix ? prefix + '.' + key : key;

      if (typeof obj[key] === 'object' && obj[key] !== null) {
        Object.assign(flattenedObj, flattenObject(obj[key], nestedKey));
      } else {
        flattenedObj[nestedKey] = obj[key];
      }
    }
  }

  return flattenedObj;
}


const flattenedTranslations = flattenObject(en)

// [key, en, ar, es, sw]
function convertEnObjToCSV(data: Record<string, string>, headers: string[]) {
  const csvRows = [];

  csvRows.push(headers.join('\t'));

  for (const prop in data) {
    let row = new Array(headers.length).fill("")
    row[0] = prop
    // @ts-ignore
    row[1] = get(eT[headers[1]], prop) || ""
    // @ts-ignore
    row[2] = get(eT[headers[2]], prop) || ""
    // @ts-ignore
    row[3] = get(eT[headers[3]], prop) || ""
    csvRows.push(row.join("\t"))
  }


  // Combine all the CSV rows into a single string
  const csvString = csvRows.join('\n');
  return csvString;
}

const csvData = convertEnObjToCSV(flattenedTranslations, ["key", "en", "es", "ar"]);
// fs.writeFileSync('enTranslationsCSV.csv', csvData);
console.log(csvData)
console.log("Translations CSV created.")

