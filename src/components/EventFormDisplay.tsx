import * as React from "react"
import { View } from "react-native"
import { format, isValid } from "date-fns"
import { upperFirst } from "lodash"
import { PhysiotherapyDisplay, PhysiotherapyMetadata } from "../screens/PhysiotherapyForm"
import { MedicalHistoryDisplay, MedicalHistoryMetadata } from "../screens/MedicalHistoryForm"
import { MedicineDisplay, MedicineMetadata } from "../screens/Medicine"
import { ExaminationDisplay } from "../screens/Examination"
import { VitalsDisplay } from "../screens/VisitList"
import { Text } from "./Text"
import { Event, Examination } from "../types"
import { translate } from "../i18n"
import { parseMetadata } from "../utils/parsers"
import { VitalsMetadata } from "../screens/VitalsForm"

type Props = {}

// export function EventFormDisplay (props: Props) {
//   // const {eventType}
//
//     const time = new Date(item.createdAt).toLocaleTimeString([], {
//       hour: '2-digit',
//       minute: '2-digit',
//       hour12: true,
//     });

//     return (
//       <TouchableOpacity style={{}} onLongPress={() => editEvent(item)}>
//         <View style={{}}>
//           <View style={{margin: 10}}>
//             <Text>{`${eventTypeText}, ${time}`}</Text>
//             <View
//               style={{
//                 marginVertical: 5,
//                 borderBottomColor: 'black',
//                 borderBottomWidth: 1,
//               }}
//             />
//             {display}
//           </View>
//         </View>
//       </TouchableOpacity>
//     );

//   return (
//   <View>
//       <Text>
//         Lorem ipsum dolor sit amet, officia excepteur ex fugiat reprehenderit enim labore culpa sint ad nisi Lorem pariatur mollit ex esse exercitation amet. Nisi anim cupidatat excepteur officia. Reprehenderit nostrud nostrud ipsum Lorem est aliquip amet voluptate voluptate dolor minim nulla est proident. Nostrud officia pariatur ut officia. Sit irure elit esse ea nulla sunt ex occaecat reprehenderit commodo officia dolor Lorem duis laboris cupidatat officia voluptate. Culpa proident adipisicing id nulla nisi laboris ex in Lorem sunt duis officia eiusmod. Aliqua reprehenderit commodo ex non excepteur duis sunt velit enim. Voluptate laboris sint cupidatat ullamco ut ea consectetur et est culpa et culpa duis.
//       </Text>
//   </View>
//   )
// }

const isArray = (a: any): boolean => {
  return !!a && a.constructor === Array
}

// check whether the date is valid, it could also be an ISOString passed in
const isDate = (d: Date | string | number | undefined | null): boolean => {
  if (d === undefined || d === null) {
    return false
  }
  if (typeof d === "string") {
    return !isNaN(Date.parse(d)) && d.length > 12 // because millisecond time is 13 chars long
  }
  // Issue with this is that it will return true for numbers like 1234567890 or just 123 😱
  // if (typeof d === "number") {
  //   return !isNaN(d)
  // }
  return d instanceof Date || isValid(new Date(d))
}

// Check if array is a collection of objects or collection of strings
const isArrayOfObjects = (a: any[]): boolean => {
  return a.length > 0 && typeof a[0] === "object"
}

const isDiagnosisObj = (obj: any): boolean => {
  return obj && obj.desc && obj.code
}

const isMedicineObj = (obj: any): boolean => {
  return obj && obj.name && obj.dose && obj.frequency
}

export function getEventDisplay(event: Event) {
  let display
  // const parsedMetadata = parseMetadata<string>(event.eventMetadata)
  const { result: parsedMetadata, error } = parseMetadata<string>(event.eventMetadata)
  if (error) console.error(error)
  console.warn(typeof parsedMetadata)
  if (typeof parsedMetadata === "object") {
    // For each key in the object, show the key and the value
    display = (
      <View style={{ paddingVertical: 2 }}>
        {Object.keys(parsedMetadata).map((key) => {
          const data = parsedMetadata[key]
          const isDateField = isDate(data)
          if (isArray(data)) {
            const isCollection = isArrayOfObjects(data)
            if (!isCollection) {
              return (
                <View key={key} style={$row}>
                  <Text text={upperFirst(key)} />
                  {data.map((item, index) => {
                    return (
                      <View key={index}>
                        <Text>{item}</Text>
                      </View>
                    )
                  })}
                </View>
              )
            } else {
              return (
                <View key={key} style={[$row, { flexWrap: "wrap" }]}>
                  <Text text={upperFirst(key)} />
                  <Text text=": " />
                  {data.map((item, index) => {
                    const isDiagnosis = isDiagnosisObj(item)
                    const isMedicine = isMedicineObj(item)
                    if (isDiagnosis) {
                      return (
                        <View key={index}>
                          <Text>{`(${item.code}) ${item.desc}`}</Text>
                        </View>
                      )
                    }

                    if (isMedicine) {
                      console.warn(item.frequency)
                      return (
                        <View key={index}>
                          <Text>{`${item.name} (${item.dose}${item.doseUnits} ${String(item.frequency)})`}</Text>
                        </View>
                      )
                    }

                    return (
                      <View key={index}>
                        <Text>{JSON.stringify(item, null, 2)}</Text>
                      </View>
                    )
                  })}
                </View>
              )
            }
          }
          return (
            <View key={key} style={[$row, { flexWrap: "wrap" }]}>
              <Text text={upperFirst(key)} />
              <Text text=": " />
              <Text>
                {isDateField ? format(new Date(data), "dd MMMM yyyy") : parsedMetadata[key]}
              </Text>
            </View>
          )
        })}
      </View>
    )
  } else {
    display = <Text>{JSON.stringify(parsedMetadata || "")}</Text>
  }
  return display

  // TODO: Clean up below
  // Tombstonee: April 25 2023
  // LEFT behind for reference during transition period

  switch (event.eventType) {
    case "Vitals":
      display = <VitalsDisplay metadataObj={parseMetadata<VitalsMetadata>(event.eventMetadata).result} />
      break
    case "Examination Full":
    case "Examination":
      display = <ExaminationDisplay metadataObj={parseMetadata<Examination>(event.eventMetadata).result} />
      break
    case "Medicine":
      ; <MedicineDisplay metadataObj={parseMetadata<MedicineMetadata>(event.eventMetadata).result} />
      break
    case "Medical History Full":
      display = (
        <MedicalHistoryDisplay
          metadataObj={parseMetadata<MedicalHistoryMetadata>(event.eventMetadata).result}
        />
      )
      break
    case "Physiotherapy":
      display = (
        <PhysiotherapyDisplay
          metadataObj={parseMetadata<PhysiotherapyMetadata>(event.eventMetadata).result}
        />
      )
      break
    default:
      display = (
        <Text>{JSON.stringify(parseMetadata<string>(event.eventMetadata).result || "", null, 2)}</Text>
      )
      break
  }

  return display
}


export function getEventDisplayPrint(event: Event) {
  let display
  const { result: parsedMetadata, error } = parseMetadata<string>(event.eventMetadata)
  if (error) console.error(error)
  console.warn(typeof parsedMetadata)
  if (typeof parsedMetadata === "object") {
    // For each key in the object, show the key and the value
    display = (
      // <div style={{ paddingVertical: 2 }}>
      Object.keys(parsedMetadata).map((key) => {
        const data = parsedMetadata[key]
        const isDateField = isDate(data)
        if (isArray(data)) {
          const isCollection = isArrayOfObjects(data)
          if (!isCollection) {
            return ` 
                <div key={key} style="flex-direction: row; align-items: center; paddingpvertical: 2;">
                  <span>
                    ${upperFirst(key)}
                  </span>
                  ${data.map((item, index) => {
              return `
                      <div >
                        <span>${item}</span>
                      </div>
                    `
            })}
                    </div>
                  `
          } else {
            return `
                <div style="flex-direction: row; align-items: center; paddingpvertical: 2;">
                  <span>
                    ${upperFirst(key)}
                  </span>
                  <span>: </span>
                  ${data.map((item, index) => {
              const isDiagnosis = isDiagnosisObj(item)
              const isMedicine = isMedicineObj(item)
              if (isDiagnosis) {
                return (
                  <div>
                    <span>${`(${item.code}) ${item.desc}`}</span>
                  </div>
                )
              }

              if (isMedicine) {
                return (
                  `<div>
                          <span>${`${item.name} (${item.dose}${item.doseUnits}, ${String(item.frequency)})`}</span>
                        </div>`
                )
              }

              return (
                <div>
                  <span>{JSON.stringify(item, null, 2)}</span>
                </div>
              )
            })}
                </div>
              `
          }
        }
        return `
            <div key={key} style="flex-direction: row; align-items: center; paddingpvertical: 2;">
              <span>
                ${upperFirst(key)}
              </span>
              <span>: </span>
              <span>
                ${isDateField ? format(new Date(data), "dd MMMM yyyy") : data}
              </span>
            </div>
          `
      }).join("")
      // </div>
    )
  } else {
    display = JSON.stringify(parsedMetadata || "")
  }
  return display
}



export const $row = {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: 2,
}
