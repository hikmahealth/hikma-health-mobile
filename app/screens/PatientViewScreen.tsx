import React, { FC, useEffect, useState } from "react"
import { observer } from "mobx-react-lite"
import { ActivityIndicator, Pressable, ViewStyle } from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { SafeAreaView } from "react-native-safe-area-context"
import { Avatar, Button, If, Screen, Text, View, getHtmlEventDisplay } from "app/components"
import * as Print from "expo-print"
import { useStores } from "app/models"
import { shareAsync } from "expo-sharing"
import PatientModel from "app/db/model/Patient"
import database from "app/db"
import { displayName } from "app/utils/patient"
import { TxKeyPath, translate } from "app/i18n"
import { format, isValid } from "date-fns"
import { upperFirst } from "lodash"
import { localeDate } from "app/utils/date"
import {
  ChevronRight,
  DownloadCloudIcon,
  LucideCircleDot,
  PencilIcon,
  PlusIcon,
} from "lucide-react-native"
import { colors } from "app/theme"
import { usePatientRecord } from "app/hooks/usePatientRecord"
import EventModel from "app/db/model/Event"
import EventFormModel from "app/db/model/EventForm"
import { useDBEventForms } from "app/hooks/useDBEventForms"
import { api } from "app/services/api"
import VisitModel from "app/db/model/Visit"
import logoStr from "app/assets/images/logoStr"
import { useInteractionManager } from "@react-native-community/hooks"
import { useDebounce } from "usehooks-ts"

interface PatientViewScreenProps extends AppStackScreenProps<"PatientView"> {}

/**
 * Hook to subscribe to events from a form that is `is_snapshopt_form`
 * @param patientId - The patient ID
 * @returns {EventModel[]} - The events
 */
// export function use(patientId: string): EventModel[] {
//   const [events, setEvents] = useState<EventModel[]>([])
//   const [eventForms, setEventForms] = useState<string[]>([])

//   // subscribe to all the event_forms that are
// }

/**
 * Hook to subscribe to all the event_forms
 * @returns {EventFormModel[]} - The event forms
 */
function useEventForms(): EventFormModel[] {
  const [eventForms, setEventForms] = useState<EventFormModel[]>([])

  useEffect(() => {
    const ref = database.get<EventFormModel>("event_forms")
    const sub = ref
      .query()
      .observe()
      .subscribe((forms) => {
        setEventForms(forms)
      })

    return () => sub.unsubscribe()
  }, [])

  return eventForms
}

export const PatientViewScreen: FC<PatientViewScreenProps> = observer(function PatientViewScreen({
  route,
  navigation,
}) {
  // Pull in one of our MST stores
  const {
    appState: { hersEnabled },
  } = useStores()
  const { patientId, patient: defaultPatient } = route.params
  const _interactionReady = useInteractionManager()
  const interactionReady = useDebounce(_interactionReady, 500)
  const { patient, isLoading } = usePatientRecord(patientId, defaultPatient)
  const eventForms = useDBEventForms(translate("languageCode"))

  const createNewVisit = () => {
    navigation.navigate("NewVisit", {
      patientId,
      visitId: null,
      visitDate: Date.now(),
    })
  }

  const downloadPatientReport = async () => {
    if (!patient) {
      return alert("Patient not found")
    }
    const visitEvents = await api.fetchPatientReportData(patientId, true)
    const latestSummaryEvent = await api.getLatestPatientEventByType(patientId, "Patient Summary")
    const latestVitalsEvent = await api.getLatestPatientEventByType(patientId, "Vitals")

    var height = translate("noContent")
    var weight = translate("noContent")

    if (latestVitalsEvent && Object.keys(latestVitalsEvent).length > 0) {
      const vitalsTaken = Object.keys(latestVitalsEvent)

      vitalsTaken.forEach((vital) => {
        if (vital.toLowerCase().includes("weight")) {
          weight = latestVitalsEvent[vital as any]
        } else if (vital.toLowerCase().includes("height")) {
          height = latestVitalsEvent[vital as any]
        }
      })
    }

    printHTML({
      patient,
      summary: latestSummaryEvent ? latestSummaryEvent.summary : translate("noContent"),
      anthropometrics: { height, weight },
      history: visitEvents,
      language: translate("languageCode"),
    })
  }

  // if (isLoading && !patient) {
  // return <Text text="Loading Patient Details..." />
  // }

  if (!patient) {
    return <Text text="Patient not found" />
  }

  // if interaction is not ready yet, show a loading indicator
  // if (!interactionReady) {
  //   return <ActivityIndicator />
  // }

  return (
    <>
      <Screen style={$root} preset="scroll">
        <View pt={40} pb={40} style={{ backgroundColor: colors.palette.primary50 }}>
          <PatientProfileSummary patient={patient} onPressEdit={() => {}} />

          <View direction="row" justifyContent="center" alignItems="center" mt={10} gap={10}>
            <Pressable
              style={$editButton}
              onPress={() =>
                navigation.navigate("PatientRecordEditor", { editPatientId: patient.id })
              }
            >
              <PencilIcon color={colors.palette.primary400} size={20} style={{ marginRight: 10 }} />
              <Text text="Edit" />
            </Pressable>

            <Pressable style={$editButton} onPress={downloadPatientReport}>
              <DownloadCloudIcon
                color={colors.palette.primary400}
                size={20}
                style={{ marginRight: 10 }}
              />
              <Text text="Download" />
            </Pressable>
          </View>
        </View>

        <View px={16} py={20} gap={10} mb={18}>
          <If condition={hersEnabled && false}>
            <View
              direction="row"
              alignItems="center"
              gap={5}
              style={{
                borderRadius: 8,
                borderColor: colors.error,
                borderWidth: 1,
                backgroundColor: colors.errorBackground,
              }}
              p={3}
              mt={10}
            >
              <LucideCircleDot size={16} color={colors.error} />
              <Text text={"High: Asthma worsening risk"} size="xs" />
            </View>

            <View
              direction="row"
              alignItems="center"
              gap={5}
              style={{
                borderRadius: 8,
                borderColor: "#facc15",
                borderWidth: 1,
                backgroundColor: "#fef9c3",
              }}
              p={3}
              mt={0}
              mb={10}
            >
              <LucideCircleDot size={16} color={"#facc15"} />
              <Text text={"Low: Increased risk of stress & anxiety"} size="xs" />
            </View>
          </If>

          <SnapshotFormLink
            onPress={() =>
              navigation.navigate("PatientVisitsList", {
                patientId: patient.id,
              })
            }
            label={translate("patientFile.visitHistory")}
            description={translate("patientFile.visitHistoryDescription")}
          />
          {onlySnapshotForms(eventForms).map((form) => {
            return (
              <SnapshotFormLink
                key={form.id}
                onPress={() =>
                  navigation.navigate("FormEventsList", {
                    patientId: patient.id,
                    formId: form.id,
                  })
                }
                label={form.name}
                description={form.description}
              />
            )
          })}
        </View>
      </Screen>

      <Pressable onPress={createNewVisit} style={$newVisitFAB}>
        <PlusIcon color={"white"} size={20} style={{ marginRight: 10 }} />
        <Text color="white" size="md" text="New Visit" />
      </Pressable>
    </>
  )
})

/**
 * Function that takes a list of EventFormModel[] and returns only the snapshot forms
 * @param {EventFormModel[]} forms - The list of forms
 * @returns {EventFormModel[]} result - The snapshot forms
 */
function onlySnapshotForms(forms: EventFormModel[]): EventFormModel[] {
  return forms.filter((form) => form.isSnapshotForm)
}

type SnapshotFormLinkProps = {
  onPress: () => void
  label: string
  description: string
}

function SnapshotFormLink({ onPress, label, description }: SnapshotFormLinkProps) {
  return (
    <Pressable
      style={{
        borderBottomWidth: 1,
        paddingBottom: 8,
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomColor: colors.border,
      }}
      onPress={onPress}
    >
      <View style={{ flex: 5 }}>
        <Text text={label} />
        <Text size="xs" text={description} />
      </View>
      <View style={{ flex: 1 }} alignItems="flex-end">
        <ChevronRight color={colors.palette.neutral500} />
      </View>
    </Pressable>
  )
}

type PDFReportProps = {
  patient: PatientModel
  summary: string
  anthropometrics: { height: string; weight: string }
  history: { visit: VisitModel; events: EventModel[] }[]
  language: string
}

async function printHTML(props: PDFReportProps) {
  const { patient, summary, anthropometrics, history, language } = props
  const { height, weight } = anthropometrics

  const visitsList = history
    .map(({ events, visit }) => {
      const eventRows = events
        .map((ev) => {
          const evs = getHtmlEventDisplay(ev, language)
          return `
          <div class="mb-18">
            <p style="color: #1e3a8a; font-weight: bold;" class="m-0">Form: ${ev.eventType}</p>
            <p class="m-0 mb-4">Provider: ${visit.providerName}</p>

            <p class="m-0 mb-4">Results:</p>
            <div>
              ${evs}
            </div>
          </div>`
        })
        .join("")
      return `
        <div class="mb-38">
          <h4 class="mb-0">${format(visit.checkInTimestamp, "dd MMMM yyyy")}</h4>
          <hr color="#1e3a8a" />

          ${eventRows}               
        
          <br />
        </div>
        `
    })
    .join("")

  const patientFullName = `${patient.givenName} ${patient.surname}`
  const { uri } = await Print.printToFileAsync({
    html: `
    <html>
    <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
  </head>
  <body>
    <div style="">
      <div class="flex justify-between wide">
        <h1>${translate("patientReport.patientMedicalRecord")}</h1>
        <img src=${logoStr} style="height: 40px; width: 40px;" />
      </div>
      <div class="patient-info-container" style="">
        <div class="flex">
          <div style="flex: 1">
              <h3 class="mb-0">${translate("patientReport.PatientInformation")}</h3>
              ${patientFullName}

              <br>
              <br>
              ${
                patient.additionalData &&
                Object.entries(patient.additionalData)
                  .map((v) => "<p>" + v[0] + ": " + v[1] + "</p>")
                  .join("")
              }
              <br>
              ${upperFirst(translate((patient.sex as any) || ""))}

              <br>
              <br>
              ${patient.citizenship}
          </div>

          <div style="flex: 1">
              <h3 class="mb-0">${translate("dob")}</h3>
              ${localeDate(new Date(patient.dateOfBirth), "MMMM dd yyyy", {})}

              <h3 class="mb-0">${translate("weight")}</h3>
              ${weight}

              <h3 class="mb-0">${translate("height")}</h3>
              ${height}
          </div>
        </div>


        <div>
          <h3 class='mb-0'>${translate("patientSummary")}</h3>
          ${summary}
        </div>
      </div>


      <div>
          <h3>${translate("visitHistory")}</h3>
          ${visitsList}
      </div>


      <style>
        h1 {
            font-size: 40px;
            color: #1e3a8a;
        }

        h3 {
            font-size: 18px;
            color: #1e3a8a;
        }

        h4 {
            color: #1e3a8a;
        }

        .wide {
          width: 100%;
        }

        .flex {
            display: flex;
        }
        .justify-between {
          justify-content: space-between
        }

        .patient-info-container {
            background-color: #eff6ff;
            border-radius: 10px;
            padding: 20px;
        }

        .m-0 {
            margin: 0px;
        }
        .mb-0 {
            margin-bottom: 0px;
        }
        .mb-4 {
            margin-bottom: 4px;
        }
        .mb-18 {
            margin-bottom: 18px;
        }
        .mb-38 {
            margin-bottom: 38px;
        }
      </style>
    </div>
    </body>
    </html>`,
  })

  console.log("File has been saved to:", uri)
  await shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" })
}

const $newVisitFAB: ViewStyle = {
  display: "flex",
  flexDirection: "row",
  position: "absolute",
  bottom: 60,
  right: 24,
  elevation: 4,
  zIndex: 100,
  borderRadius: 10,
  padding: 14,
  backgroundColor: colors.palette.primary500,
  justifyContent: "center",
  alignItems: "center",
}

const $editButton: ViewStyle = {
  display: "flex",
  flexDirection: "row",
  alignContent: "center",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 30,
  paddingHorizontal: 18,
  paddingVertical: 3,
  borderWidth: 1,
  borderColor: colors.palette.primary300,
}

/**
 * Patient profile summary component
 */
type PatientProfileSummaryProps = {
  patient: PatientModel
  onPressEdit: () => void
}

const PatientProfileSummary: FC<PatientProfileSummaryProps> = function PatientProfileSummary({
  patient,
  onPressEdit,
}) {
  return (
    <View alignItems="center">
      <View direction="row" justifyContent="center" pb={10}>
        <Avatar
          size={80}
          fullName={`${patient.givenName} ${patient.surname}`}
          imageURL={patient.photoUrl}
        />
      </View>
      <View>
        <Text align="center" textDecorationLine="underline" size="xl">
          {displayName(patient)}
        </Text>
        <Text align="center" testID="sex">{`${translate("sex")}:  ${upperFirst(
          translate(patient.sex as TxKeyPath, { defaultValue: patient.sex || "" }),
        )}`}</Text>
        <Text
          align="center"
          text={`${translate("dob")}: ${
            isValid(new Date(patient.dateOfBirth))
              ? format(new Date(patient.dateOfBirth), "dd MMM yyyy")
              : ""
          }`}
        />

        <Text align="center">Registered: {localeDate(patient.createdAt, "MMM dd, yyyy", {})}</Text>
      </View>
    </View>
  )
}

const $root: ViewStyle = {
  flex: 1,
}
