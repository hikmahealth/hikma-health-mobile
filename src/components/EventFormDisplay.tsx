import * as React from "react"
import { View } from "react-native"
import { format } from "date-fns"
import { upperFirst } from "lodash"
import { PhysiotherapyDisplay, PhysiotherapyMetadata } from "../screens/PhysiotherapyForm"
import { MedicalHistoryDisplay, MedicalHistoryMetadata } from "../screens/MedicalHistoryForm"
import { MedicineDisplay, MedicineMetadata } from "../screens/Medicine"
import { ExaminationDisplay } from "../screens/Examination"
import { VitalsDisplay } from "../screens/VisitList"
import { Covid19Display, Covid19FormMetadata } from "../screens/Covid19Form"
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
    return !isNaN(Date.parse(d))
  }
  // Issue with this is that it will return true for numbers like 1234567890 or just 123 😱
  // if (typeof d === "number") {
  //   return !isNaN(d)
  // }
  return d instanceof Date
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
  const parsedMetadata = parseMetadata<string>(event.eventMetadata)
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
                      return (
                        <View key={index}>
                          <Text>{`${item.name} (${item.dose} ${item.frequency})`}</Text>
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
    case "COVID-19 Screening":
      display = (
        <Covid19Display metadataObj={parseMetadata<Covid19FormMetadata>(event.eventMetadata)} />
      )
      break
    case "Vitals":
      display = <VitalsDisplay metadataObj={parseMetadata<VitalsMetadata>(event.eventMetadata)} />
      break
    case "Examination Full":
    case "Examination":
      display = <ExaminationDisplay metadataObj={parseMetadata<Examination>(event.eventMetadata)} />
      break
    case "Medicine":
      ;<MedicineDisplay metadataObj={parseMetadata<MedicineMetadata>(event.eventMetadata)} />
      break
    case "Medical History Full":
      display = (
        <MedicalHistoryDisplay
          metadataObj={parseMetadata<MedicalHistoryMetadata>(event.eventMetadata)}
        />
      )
      break
    case "Physiotherapy":
      display = (
        <PhysiotherapyDisplay
          metadataObj={parseMetadata<PhysiotherapyMetadata>(event.eventMetadata)}
        />
      )
      break
    default:
      display = (
        <Text>{JSON.stringify(parseMetadata<string>(event.eventMetadata) || "", null, 2)}</Text>
      )
      break
  }

  return display
}

export const $row = {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: 2,
}
