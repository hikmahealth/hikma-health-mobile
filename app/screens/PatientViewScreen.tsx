import { FC } from "react"
import { Pressable, ViewStyle, Dimensions } from "react-native"
import * as Print from "expo-print"
import { shareAsync } from "expo-sharing"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useSelector } from "@xstate/react"
import { format } from "date-fns"
import { Option } from "effect"
import { upperFirst } from "es-toolkit/compat"
import {
  ChevronRight,
  DownloadCloudIcon,
  LucideActivity,
  LucideActivitySquare,
  LucideArrowRight,
  LucideCircleDot,
  LucidePillBottle,
  LucidePlus,
  PencilIcon,
  PlusIcon,
} from "lucide-react-native"

import logoStr from "@/assets/images/logoStr"
import { Card } from "@/components/Card"
import { If } from "@/components/If"
import { PatientProfileSummary } from "@/components/PatientProfileSummary"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { View } from "@/components/View"
import { usePatientAppointments } from "@/hooks/useDBPatientAppointments"
import { useEventForms } from "@/hooks/useEventForms"
import { usePatientRecord } from "@/hooks/usePatientRecord"
import { translate } from "@/i18n/translate"
import Appointment from "@/models/Appointment"
import Event from "@/models/Event"
import EventForm from "@/models/EventForm"
import Patient from "@/models/Patient"
import Visit from "@/models/Visit"
import { PatientNavigatorParamList } from "@/navigators/PatientNavigator"
import { appStateStore } from "@/store/appState"
import { languageStore } from "@/store/language"
import { colors } from "@/theme/colors"
import { localeDate } from "@/utils/date"

const { height } = Dimensions.get("window")

interface PatientViewScreenProps
  extends NativeStackScreenProps<PatientNavigatorParamList, "PatientView"> {}

export const PatientViewScreen: FC<PatientViewScreenProps> = ({ route, navigation }) => {
  const { patientId } = route.params
  const { patient, isLoading } = usePatientRecord(patientId)
  const { hersEnabled } = useSelector(appStateStore, (store) => store.context)
  const language = useSelector(languageStore, (store) => store.context.language)
  const { forms: eventForms, isLoading: isLoadingForms } = useEventForms(
    Option.fromNullable(language),
  )

  const { appointments } = usePatientAppointments(patientId)

  // const createNewAppointment = () => {
  //   navigation.navigate("AppointmentEditorForm", {
  //     patientId,
  //     visitId: null,
  //     visitDate: Date.now(),
  //   })
  // }

  const downloadPatientReport = async () => {
    if (!patient) {
      return alert(translate("patientFile:patientNotFound"))
    }
    const visitEvents = await Patient.DB.getReportData(patientId, true)
    // TODO: these need to be updated and modernized
    // const latestSummaryEvent = await api.getLatestPatientEventByType(patientId, "Patient Summary")
    // const latestVitalsEvent = await api.getLatestPatientEventByType(patientId, "Vitals")

    const height = translate("common:noContent")
    const weight = translate("common:noContent")

    // TODO: these need to be updated and modernized
    // if (latestVitalsEvent && Object.keys(latestVitalsEvent).length > 0) {
    //   const vitalsTaken = Object.keys(latestVitalsEvent)

    //   vitalsTaken.forEach((vital) => {
    //     if (vital.toLowerCase().includes("weight")) {
    //       weight = latestVitalsEvent[vital as any]
    //     } else if (vital.toLowerCase().includes("height")) {
    //       height = latestVitalsEvent[vital as any]
    //     }
    //   })
    // }

    printHTML({
      patient: Option.map(patient, Patient.DB.fromDB),
      // summary: latestSummaryEvent ? latestSummaryEvent.summary : translate("common:noContent"),
      summary: "",
      anthropometrics: { height, weight },
      history: visitEvents,
      language: translate("common:languageCode"),
    })
  }

  const createNewVisit = () => {
    navigation.navigate("NewVisit", {
      patientId,
      visitId: null,
      visitDate: Date.now(),
    })
  }

  const openAppointmentView = (appointment: { id: string }) => {
    navigation.navigate("AppointmentView", {
      patientId,
      appointmentId: appointment.id,
    })
  }

  const createNewAppointment = () => {
    navigation.navigate("AppointmentEditorForm", {
      patientId,
      visitId: null,
      visitDate: Date.now(),
    })
  }

  const handleAppointmentLongPress = (appointment: Appointment.T) => {
    // TODO: Implement appointment long press
  }

  const handleVitalsPress = () => {
    navigation.navigate("VitalHistory", {
      patientId: patient?.value.id,
    })
  }

  const handlePrescriptionsPress = () => {
    navigation.navigate("PatientPrescriptionsList", {
      patientId: patient?.value.id,
    })
  }

  if (Option.isNone(patient)) {
    return (
      <Screen style={$root} preset="scroll">
        <View pt={40} pb={40} style={{ backgroundColor: colors.palette.primary50 }}>
          <Text text="Patient not found" />
        </View>
      </Screen>
    )
  }
  return (
    <>
      <Screen
        style={$root}
        contentContainerStyle={$contentContainer}
        safeAreaEdges={[]}
        preset="scroll"
      >
        <View pt={30} pb={30} style={{ backgroundColor: colors.palette.primary50 }}>
          <PatientProfileSummary
            patient={Patient.DB.fromDB(patient.value)}
            onPressEdit={() => {}}
          />

          <View direction="row" justifyContent="center" alignItems="center" mt={10} gap={10}>
            <Pressable
              style={$editButton}
              onPress={() =>
                navigation.navigate("PatientRecordEditor", { editPatientId: patient.value.id })
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

          <View direction="row" flex={1} gap={12} pb={22}>
            <Card
              verticalAlignment="center"
              testID="patient-medications-btn"
              onPress={handlePrescriptionsPress}
              HeadingComponent={
                <LucidePillBottle
                  style={{ alignSelf: "center" }}
                  size={34}
                  color={colors.textDim}
                />
              }
              ContentComponent={
                <View pt={8}>
                  <Text tx="common:prescriptions" align="center" size="md" />
                </View>
              }
              style={{
                flex: 1,
                elevation: 1,
                paddingTop: 40,
                paddingBottom: 24,
              }}
            />
            <Card
              verticalAlignment="center"
              onPress={handleVitalsPress}
              testID="patient-vitals-btn"
              HeadingComponent={
                <LucideActivitySquare
                  size={34}
                  style={{ alignSelf: "center" }}
                  color={colors.textDim}
                />
              }
              ContentComponent={
                <View pt={8}>
                  <Text tx="common:vitals" align="center" size="md" />
                </View>
              }
              style={{ flex: 1, elevation: 1, paddingTop: 40, paddingBottom: 24 }}
            />
          </View>

          <View gap={10} mb={4} style={$appointmentContainer}>
            <View direction="row" gap={10} alignItems="center">
              <Text preset="formLabel" text="Appointments" />
              <If condition={appointments.length > 0}>
                <Pressable onPress={createNewAppointment}>
                  <LucidePlus color={colors.palette.primary500} size={20} />
                </Pressable>
              </If>
            </View>
            <If condition={appointments?.length === 0 || !appointments}>
              <Pressable onPress={createNewAppointment}>
                <Text
                  textDecorationLine="underline"
                  color={colors.palette.primary500}
                  text="Create New Appointment"
                />
              </Pressable>
            </If>
            <If condition={appointments.length > 0}>
              <View direction="row" gap={10} style={{ flexWrap: "wrap" }}>
                {appointments.map((appointment) => {
                  return (
                    <Pressable
                      onPress={() => openAppointmentView(appointment)}
                      style={{
                        padding: 6,
                        paddingHorizontal: 10,
                        backgroundColor: colors.palette.primary300,
                        borderRadius: 10,
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                      }}
                      key={appointment.id}
                    >
                      <Text
                        text={`${format(new Date(appointment.timestamp), "dd MMM yyyy")}`}
                        size="xxs"
                        color="#fff"
                      />
                      <LucideArrowRight color={colors.palette.neutral100} size={16} />
                    </Pressable>
                  )
                })}
              </View>
            </If>
          </View>

          {/*<SnapshotFormLink
            onPress={() => {
              navigation.navigate("VitalHistory", {
                patientId: patient.value.id,
              })
            }}
            label={translate("patientFile:vitalHistory")}
            description={translate("patientFile:vitalHistoryDescription")}
          />*/}

          <SnapshotFormLink
            onPress={() =>
              navigation.navigate("PatientVisitsList", {
                patientId: patient.value.id,
              })
            }
            label={translate("patientFile:visitHistory")}
            description={translate("patientFile:visitHistoryDescription")}
          />
          {EventForm.filterSnapshots(eventForms).map((form) => {
            return (
              <SnapshotFormLink
                key={form.id}
                onPress={() =>
                  navigation.navigate("FormEventsList", {
                    patientId: patient.value.id,
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
        <Text color="white" size="md" tx="patientView:newVisit" />
      </Pressable>
    </>
  )
}

const $actionCard: ViewStyle = {
  flex: 1,
  padding: 16,
  borderRadius: 8,
  gap: 5,
  paddingTop: 28,
  paddingBottom: 12,
  alignItems: "center",
  borderStyle: "solid",
  borderWidth: 1,
  borderColor: colors.border,
  elevation: 1,
  shadowColor: colors.palette.neutral300,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.15,
  shadowRadius: 0.84,
}

const $root: ViewStyle = {
  flex: 1,
}

const $contentContainer: ViewStyle = {
  minHeight: height - 70,
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
        <Text preset="formLabel" text={label} />
        <Text size="xs" text={description} />
      </View>
      <View style={{ flex: 1 }} alignItems="flex-end">
        <ChevronRight color={colors.palette.neutral500} />
      </View>
    </Pressable>
  )
}

type PDFReportProps = {
  patient: Option.Option<Patient.T>
  summary: string
  anthropometrics: { height: string; weight: string }
  history: { visit: Visit.T; events: Event.T[] }[]
  language: string
}

async function printHTML(props: PDFReportProps) {
  const { patient, summary, anthropometrics, history, language } = props
  const { height, weight } = anthropometrics

  if (Option.isNone(patient)) {
    return
  }

  const visitsList = history
    .map(({ events, visit }) => {
      const eventRows = events
        .map((ev) => {
          const evs = Event.getHtmlEventDisplay(ev, language)
          return `
          <div class="mb-18">
            <p style="color: #1e3a8a; font-weight: bold;" class="m-0">Form: ${ev.eventType}</p>
            <p class="m-0 mb-4">${translate("common:healthcareProvider")}: ${visit.providerName}</p>

            <p class="m-0 mb-4">${translate("common:results")}:</p>
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

  const patientFullName = `${patient.value.givenName} ${patient.value.surname}`
  const { uri } = await Print.printToFileAsync({
    html: `
    <html>
    <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
  </head>
  <body style="padding: 18px;">
    <div style="">
      <div class="flex justify-between wide">
        <h1>${translate("patientReport:patientMedicalRecord")}</h1>
        <img src=${logoStr} style="height: 40px; width: 40px;" />
      </div>
      <div class="patient-info-container" style="">
        <div class="flex">
          <div style="flex: 1">
              <h3 class="mb-0">${translate("patientReport:PatientInformation")}</h3>
              ${patientFullName}

              <br>
              <br>
              ${
                patient.value.additionalData &&
                Object.entries(patient.value.additionalData)
                  .map((v) => "<p>" + v[0] + ": " + v[1] + "</p>")
                  .join("")
              }
              <br>
              <h3 class="mb-0">${translate("common:sex")}</h3>
              ${upperFirst(translate((patient.value.sex as any) || ""))}

              <br>
              <h3 class="mb-0">${translate("common:citizenship")}</h3>
              ${patient.value.citizenship}
          </div>

          <div style="flex: 1">
              <h3 class="mb-0">${translate("common:dob")}</h3>
              ${localeDate(new Date(patient.value.dateOfBirth), "MMMM dd yyyy", {})}

              <h3 class="mb-0">${translate("common:weight")}</h3>
              ${weight}

              <h3 class="mb-0">${translate("common:height")}</h3>
              ${height}
          </div>
        </div>


        <div>
          <h3 class='mb-0'>${translate("common:patientSummary")}</h3>
          ${summary}
        </div>
      </div>


      <div>
          <h3>${translate("common:visitHistory")}</h3>
          ${visitsList}
      </div>


      <style>
        h1 {
            font-size: 32px;
            color: #1e3a8a;
            margin-bottom: 10px;
        }

        h3 {
            font-size: 16px;
            color: #1e3a8a;
            margin-top: 12px;
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
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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
  // TODO: Offer a print/pdf option instead of just sharing
  // download
}

const $newVisitFAB: ViewStyle = {
  display: "flex",
  flexDirection: "row",
  position: "absolute",
  bottom: 40,
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

const $appointmentContainer: ViewStyle = {
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  paddingBottom: 10,
}
