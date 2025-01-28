import React, { FC, memo, useEffect, useMemo } from "react"
import { observer } from "mobx-react-lite"
import { Alert, Pressable } from "react-native"
import { AppStackScreenProps } from "../navigators"
import { EventListItem, Text, Fab, View, If } from "../components"
import { useDBVisitEvents } from "../hooks/useDBVisitEvents"
import { LanguageName, Provider, useStores } from "../models"
import { PlusIcon } from "lucide-react-native"
import EventModel from "../db/model/Event"
import { FlashList } from "@shopify/flash-list"
import { translate } from "../i18n"
import { api } from "../services/api"
import { useDBVisitAppointments } from "../hooks/useDBVisitAppointments"
import { colors } from "../theme"
import { sortBy, upperFirst } from "lodash"
import AppointmentModel from "../db/model/Appointment"
import { withObservables } from "@nozbe/watermelondb/react"
import ClinicModel from "../db/model/Clinic"
import * as Sentry from "@sentry/react-native"
import { catchError, of as of$ } from "rxjs"
import { format } from "date-fns"
import { usePatientVisitPrescriptions } from "../hooks/usePatientVisitPrescriptions"
import PrescriptionModel, { PrescriptionStatus } from "../db/model/Prescription"
import Toast from "react-native-root-toast"
import database from "../db"
import { Q } from "@nozbe/watermelondb"

interface VisitEventsListScreenProps extends AppStackScreenProps<"VisitEventsList"> {}

// TODO: Include appointments in the list of events, if there was an appointment that was created during the visit

/**
 * Opens the prescription management page and provides options to edit or update the prescription status.
 *
 * @param {string} prescriptionId - The unique identifier of the prescription.
 * @param {PrescriptionStatus} currentStatus - The current status of the prescription.
 * @param {any} navigation - The navigation object used for screen transitions.
 * @param {string} patientId - The unique identifier of the patient.
 * @param {string} visitId - The unique identifier of the visit.
 * @param {Date} visitDate - The date of the visit.
 * @param {Provider} provider - The provider object containing authentication information.
 */
export const openPrescriptionPage = (
  prescriptionId: string,
  currentStatus: PrescriptionStatus,
  navigation: any,
  patientId: string,
  visitId: string,
  visitDate: number,
  provider: Provider,
) => {
  Alert.alert(
    "Manage Prescription",
    "Choose an action you'd like to perform",
    [
      {
        text: "Edit",
        onPress: () => {
          navigation.navigate("PrescriptionEditorForm", { visitId, patientId, visitDate })
        },
      },
      ["pending", "prepared"].includes(currentStatus)
        ? {
            text: "Picked Up",
            onPress: () => {
              api
                .updatePrescription(prescriptionId, { status: "picked-up" } as any, provider)
                .then((res) => {
                  Toast.show("✅ Prescription marked as picked up", {
                    position: Toast.positions.BOTTOM,
                    containerStyle: {
                      marginBottom: 100,
                    },
                  })
                })
                .catch((error) => {
                  console.error(error)
                  Sentry.captureException(error)
                  Toast.show("❌ Error marking prescription as picked up", {
                    position: Toast.positions.BOTTOM,
                    containerStyle: {
                      marginBottom: 100,
                    },
                  })
                })
            },
          }
        : {
            text: "Cancel",
          },
    ],
    { cancelable: true },
  )
}

export const VisitEventsListScreen: FC<VisitEventsListScreenProps> = observer(
  function VisitEventsListScreen({ route, navigation }) {
    const { language, provider } = useStores()
    const { patientId, visitId, visitDate } = route.params
    const eventsList = useDBVisitEvents(visitId, patientId)
    const appointmentsList = useDBVisitAppointments(visitId)
    const { prescriptions, isLoading: isLoadingPrescriptions } = usePatientVisitPrescriptions(
      patientId,
      visitId,
    )
    // const patient = usePatientRecord(patientId)

    const goToNewPatientVisit = () => {
      navigation.navigate("NewVisit", {
        patientId,
        visitId: visitId,
        visitDate: new Date(visitDate).getTime(),
        appointmentId: null,
      })
    }

    const openEventOptions = (event: EventModel) => {
      Alert.alert(
        translate("eventList.eventOptions"),
        translate("eventList.eventOptionsDescription"),
        [
          {
            text: translate("eventList.edit"),
            onPress: () => {
              navigation.navigate("EventForm", {
                patientId,
                visitId,
                visitDate,
                formId: event.formId,
                eventId: event.id,
                appointmentId: null,
              })
            },
          },
          {
            text: translate("eventList.delete"),
            onPress: () => {
              return Toast.show("Delete is not supported.", {
                position: Toast.positions.BOTTOM,
                containerStyle: {
                  marginBottom: 100,
                },
              })
              api
                .deleteEvent(event.id)
                .then((res) => {
                  Alert.alert("Success", "Event deleted")
                })
                .catch((error) => {
                  console.log(error)
                  Alert.alert("Error", "Could not delete event")
                })
            },
          },
        ],
        {
          cancelable: true,
        },
      )
    }

    const openAppointmentPage = (appointmentId: string) => {
      navigation.navigate("AppointmentView", { appointmentId })
    }

    const eventsAndAppointments = useMemo(
      () =>
        sortBy([...eventsList, ...appointmentsList, ...prescriptions], (event) => event.createdAt),
      [eventsList, appointmentsList, prescriptions],
    )

    // Update the header title when the eventsList array changes
    useEffect(() => {
      const eventCount = eventsAndAppointments.length
      navigation.setOptions({ title: `Visit Events (${eventCount})` })
    }, [eventsAndAppointments.length])

    function renderItem(item: EventModel | AppointmentModel | PrescriptionModel) {
      if (isAppointment(item)) {
        return (
          <AppointmentListItem
            appointment={item}
            language={language.current}
            openAppointmentPage={openAppointmentPage}
          />
        )
      } else if (isPrescription(item)) {
        return (
          <PrescriptionListItem
            prescription={item}
            language={language.current}
            openPrescriptionPage={() =>
              openPrescriptionPage(
                item.id,
                item.status,
                navigation,
                patientId,
                visitId,
                visitDate,
                provider,
              )
            }
          />
        )
      } else {
        return (
          <EventListItem
            event={item}
            openEventOptions={openEventOptions}
            language={language.current}
          />
        )
      }
    }

    return (
      <>
        <FlashList
          data={eventsAndAppointments}
          estimatedItemSize={100}
          contentContainerStyle={{ padding: 10 }}
          renderItem={({ item }) => renderItem(item)}
          ListFooterComponent={() => <View style={{ height: 60 }} />}
        />
        <Fab Icon={PlusIcon} onPress={goToNewPatientVisit} />
      </>
    )
  },
)

const enhanceAppointment = withObservables(["appointment"], ({ appointment }) => ({
  appointment, // shortcut syntax for `event: event.observe()`
  clinic: appointment.clinicId
    ? appointment.clinic?.observe().pipe(catchError(() => of$(null)))
    : of$(null),
}))

type AppointmentListItemProps = {
  appointment: AppointmentModel
  language: LanguageName
  clinic: ClinicModel | null
  openAppointmentPage: (appointmentId: string) => void
}

const AppointmentListItem = enhanceAppointment(
  ({ appointment, openAppointmentPage, language, clinic }: AppointmentListItemProps) => {
    const time = new Date(appointment.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })

    return (
      <View>
        <Pressable
          testID="appointmentListItem"
          onPress={() => openAppointmentPage(appointment.id)}
          style={{}}
        >
          <View style={{}}>
            <View style={{ margin: 10 }}>
              <View style={$eventListItemHeader}>
                <Text preset="subheading">{`Set Appointment, ${time}`}</Text>
              </View>
              <RowItem
                label="Appointment Date"
                value={format(appointment.timestamp, "MMM d, yyyy")}
              />
              <RowItem label="Clinic" value={clinic?.name || "Unknown Clinic"} />
              <RowItem label="Reason" value={appointment.reason} />
              <RowItem label="Status" value={appointment.status} />
              <RowItem label="Notes" value={appointment.notes} direction="column" />
            </View>
          </View>
        </Pressable>
      </View>
    )
  },
)

/**
 * Helper function to check if an item is an appointment
 */
const isAppointment = (
  item: EventModel | AppointmentModel | PrescriptionModel,
): item is AppointmentModel => {
  const appointment = item as AppointmentModel
  if ("status" in appointment && "reason" in appointment && "notes" in appointment) {
    return true
  }
  return false
}

/**
 * Helper function to check if an item is a prescription
 */
const isPrescription = (
  item: EventModel | AppointmentModel | PrescriptionModel,
): item is PrescriptionModel => {
  const prescription = item as PrescriptionModel
  if ("items" in prescription && "status" in prescription && "priority" in prescription) {
    return true
  }
  return false
}

type PrescriptionListItemProps = {
  prescription: PrescriptionModel
  language: LanguageName
  clinic: ClinicModel | null
  openPrescriptionPage: () => void
}

const enhancePrescription = withObservables(["prescription"], ({ prescription }) => ({
  prescription, // shortcut syntax for `event: event.observe()`
  clinic: prescription.pickupClinicId
    ? prescription.pickupClinic?.observe().pipe(catchError(() => of$(null)))
    : of$(null),
}))

export const PrescriptionListItem = enhancePrescription(
  ({ prescription, openPrescriptionPage, language, clinic }: PrescriptionListItemProps) => {
    console.log("prescription", prescription.pickupClinicId, clinic?.name)
    database
      .get<ClinicModel>("clinics")
      .query(Q.where("id", prescription.pickupClinicId))
      .fetch()
      .then((res) => {
        console.log(res[0]?.name, res[0]?.id)
      })
    return (
      <View>
        <Pressable testID="prescriptionListItem" onPress={openPrescriptionPage} style={{}}>
          <View style={{ margin: 10 }} gap={4}>
            <View style={$eventListItemHeader}>
              <Text preset="subheading">{`Prescription`}</Text>
            </View>
            <View direction="row" gap={10} alignItems="baseline">
              <RowItem label="Status" value={upperFirst(prescription.status)} />
              <View
                style={{
                  backgroundColor: getStatusColor(prescription.status),
                  height: 10,
                  width: 10,
                  borderRadius: 10,
                }}
              ></View>
            </View>
            <RowItem label="Priority" value={upperFirst(prescription.priority)} />
            <RowItem
              label="Items"
              direction="column"
              value={prescription.items
                .map((item) => {
                  return `${upperFirst(item.name)} ${item.dose}${item.doseUnits} (${
                    item.frequency
                  })`
                })
                .join(", \n")}
            />
            <RowItem
              label="Prescribed At"
              value={format(prescription.prescribedAt, "MMM d, yyyy")}
            />
            <If condition={!!prescription.filledAt}>
              <RowItem
                label="Filled At"
                value={
                  prescription.filledAt
                    ? format(prescription.filledAt, "MMM d, yyyy")
                    : "Not Filled"
                }
              />
              <RowItem label="Filled By" value={prescription.filledBy || "Unknown"} />
            </If>
            <RowItem
              label="Expiration Date"
              value={format(prescription.expirationDate, "MMM d, yyyy")}
            />
            <RowItem label="Pickup Clinic" value={clinic?.name || "Unknown Clinic"} />
            <RowItem label="Notes" value={prescription.notes} direction="column" />
          </View>
        </Pressable>
      </View>
    )
  },
)

const RowItem = memo(
  function RowItem({
    label,
    value,
    direction = "row",
  }: {
    label: string
    value: string
    direction?: "row" | "column"
  }) {
    return (
      <View direction={direction} mb={direction === "row" ? 0 : 4} gap={4}>
        <Text preset="formLabel">{label}:</Text>
        <Text>{value}</Text>
      </View>
    )
  },
  (prevProps, nextProps) => prevProps.value === nextProps.value,
)

const statusColors: Record<PrescriptionStatus, string> = {
  pending: "#FFA500", // Muted orange
  "partially-picked-up": "#FFA500", // Muted orange
  prepared: "#4682B4", // Muted steel blue
  "picked-up": "#228B22", // Muted forest green
  "not-picked-up": "#CD5C5C", // Muted indian red
  cancelled: "#808080", // Muted gray
  other: "#8B4513", // Muted saddle brown
}

/**
 * Returns the color associated with a given prescription status.
 *
 * @param {PrescriptionStatus} status - The status of the prescription.
 * @returns {string} The hexadecimal color code for the given status.
 */
function getStatusColor(status: PrescriptionStatus): string {
  return statusColors[status] || statusColors.other
}

const $eventListItemHeader = {
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
}
