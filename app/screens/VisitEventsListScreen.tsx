import { FC, memo, useEffect, useMemo } from "react"
import { Alert, Pressable } from "react-native"
import { LegendList } from "@legendapp/list"
import { withObservables } from "@nozbe/watermelondb/react"
import * as Sentry from "@sentry/react-native"
import { useSelector } from "@xstate/react"
import { format, isValid } from "date-fns"
import { sortBy, upperFirst } from "es-toolkit/compat"
import { PlusIcon } from "lucide-react-native"
import Toast from "react-native-root-toast"
import { catchError, of as of$ } from "rxjs"

import { EventListItem } from "@/components/EventListItem"
import { Fab } from "@/components/Fab"
import { If } from "@/components/If"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { View } from "@/components/View"
import AppointmentModel from "@/db/model/Appointment"
import ClinicModel from "@/db/model/Clinic"
import EventModel from "@/db/model/Event"
import PrescriptionModel from "@/db/model/Prescription"
import { useDBVisitAppointments } from "@/hooks/useDBVisitAppointments"
import { useDBVisitEvents } from "@/hooks/useDBVisitEvents"
import { usePatientVisitPrescriptions } from "@/hooks/usePatientVisitPrescriptions"
import { usePermissionGuard } from "@/hooks/usePermissionGuard"
import { useProviderVisitEvents } from "@/hooks/useProviderVisitEvents"
import { translate } from "@/i18n/translate"
import Language from "@/models/Language"
import Prescription from "@/models/Prescription"
import User from "@/models/User"
import { PatientStackScreenProps } from "@/navigators/PatientNavigator"
import { useDataAccess } from "@/providers/DataAccessProvider"
import { languageStore } from "@/store/language"
import { providerStore } from "@/store/provider"
import { colors } from "@/theme/colors"

interface VisitEventsListScreenProps extends PatientStackScreenProps<"VisitEventsList"> {}

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
  currentStatus: Prescription.Status,
  navigation: any,
  patientId: string,
  visitId: string,
  visitDate: number,
  provider: User.Provider,
  canCheck?: (op: string) => boolean,
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
              if (canCheck && !canCheck("prescription:updateStatus")) {
                Toast.show("You do not have permission to update prescription status", {
                  duration: Toast.durations.SHORT,
                  position: Toast.positions.BOTTOM,
                })
                return
              }
              Prescription.DB.updatePrescription(
                prescriptionId,
                { status: "picked-up" } as any,
                provider,
              )
                .then(() => {
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

export const VisitEventsListScreen: FC<VisitEventsListScreenProps> = ({ navigation, route }) => {
  const language = useSelector(languageStore, (state) => state.context.language)
  const provider = useSelector(providerStore, (state) => state.context)
  const { patientId, visitId, visitTimestamp } = route.params
  const { isOnline } = useDataAccess()
  const { can } = usePermissionGuard()

  // Offline: WatermelonDB observable events. Online: React Query events.
  const offlineEventsList = useDBVisitEvents(visitId, patientId)
  const onlineEvents = useProviderVisitEvents(isOnline ? visitId : null, isOnline ? patientId : null)
  const eventsList = isOnline ? ((onlineEvents.data ?? []) as any) : offlineEventsList
  const appointmentsList = useDBVisitAppointments(visitId)
  const { prescriptions } = usePatientVisitPrescriptions(patientId, visitId)

  const visitDate = useMemo(() => {
    return visitTimestamp && isValid(new Date(visitTimestamp))
      ? new Date(visitTimestamp).getTime()
      : new Date().getTime()
  }, [visitTimestamp])

  const goToNewPatientVisit = () => {
    if (!can("visit:create")) {
      return Toast.show("You do not have permission to create visits", {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
      })
    }
    navigation.navigate("NewVisit", {
      patientId,
      visitId: visitId,
      visitDate: isValid(new Date(visitDate))
        ? new Date(visitDate).getTime()
        : new Date().getTime(),
    })
  }

  const openEventOptions = (event: EventModel) => {
    Alert.alert(
      translate("eventList:eventOptions"),
      translate("eventList:eventOptionsDescription"),
      [
        {
          text: translate("eventList:edit"),
          onPress: () => {
            if (!can("event:edit")) {
              return Toast.show("You do not have permission to edit events", {
                duration: Toast.durations.SHORT,
                position: Toast.positions.BOTTOM,
              })
            }
            navigation.navigate("EventForm", {
              patientId,
              visitId,
              formId: event.formId,
              eventId: event.id,
            })
          },
        },
        {
          text: translate("eventList:delete"),
          onPress: () => {
            return Toast.show("Delete is not supported.", {
              position: Toast.positions.BOTTOM,
              containerStyle: {
                marginBottom: 100,
              },
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
    navigation.navigate("AppointmentView", { appointmentId, patientId })
  }

  const eventsAndAppointments = useMemo(
    () =>
      sortBy(
        [...eventsList, ...appointmentsList, ...prescriptions],
        (event) => event.createdAt,
      ).reverse(),
    [eventsList, appointmentsList, prescriptions],
  )

  // Update the header title when the eventsList array changes
  useEffect(() => {
    const eventCount = eventsAndAppointments.length
    navigation.setOptions({ title: `Visit Events (${eventCount})` })
  }, [eventsAndAppointments.length, navigation])

  function renderItem(item: EventModel | AppointmentModel | PrescriptionModel) {
    if (isAppointment(item)) {
      return (
        <AppointmentListItem
          appointment={item}
          language={language}
          openAppointmentPage={openAppointmentPage}
        />
      )
    } else if (isPrescription(item)) {
      if (!visitId) {
        return null
      }
      return (
        <PrescriptionListItem
          prescription={item}
          language={language}
          openPrescriptionPage={() =>
            openPrescriptionPage(
              item.id,
              item.status,
              navigation,
              patientId,
              visitId,
              visitDate,
              provider,
              can,
            )
          }
        />
      )
    } else {
      return <EventListItem event={item} openEventOptions={openEventOptions} language={language} />
    }
  }

  return (
    <>
      <LegendList
        data={eventsAndAppointments}
        contentContainerStyle={$contentContainerStyle}
        renderItem={({ item }) => renderItem(item)}
        keyExtractor={(item) => item.id}
        ListFooterComponent={() => <View style={$legendListFooter} />}
      />
      <Fab Icon={PlusIcon} onPress={goToNewPatientVisit} />
    </>
  )
}

const $contentContainerStyle = {
  paddingHorizontal: 10,
}

const $legendListFooter = {
  height: 100,
}

const enhanceAppointment = withObservables(["appointment"], ({ appointment }) => ({
  appointment, // shortcut syntax for `event: event.observe()`
  clinic: appointment.clinicId
    ? appointment.clinic?.observe().pipe(catchError(() => of$(null)))
    : of$(null),
}))

type AppointmentListItemProps = {
  appointment: AppointmentModel
  language: Language.LanguageName
  clinic: ClinicModel | null
  openAppointmentPage: (appointmentId: string) => void
}

const AppointmentListItem = enhanceAppointment(
  ({ appointment, openAppointmentPage, language: _, clinic }: AppointmentListItemProps) => {
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
          <View>
            <View m={10}>
              <View style={$eventListItemHeader}>
                <Text preset="subheading">{`Set Appointment`}</Text>
                <Text preset="formHelper">{time}</Text>
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
  language: Language.LanguageName
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
  ({ prescription, openPrescriptionPage, language: _, clinic }: PrescriptionListItemProps) => {
    const $statusDot = {
      backgroundColor: getStatusColor(prescription.status),
      height: 10,
      width: 10,
      borderRadius: 10,
    }
    const time = new Date(prescription.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })

    return (
      <View>
        <Pressable testID="prescriptionListItem" onPress={openPrescriptionPage} style={{}}>
          <View m={10} gap={4}>
            <View style={$eventListItemHeader}>
              <Text preset="subheading">{`Prescription`}</Text>
              <Text preset="formHelper">{time}</Text>
            </View>
            <View direction="row" gap={10} alignItems="baseline">
              <RowItem label="Status" value={upperFirst(prescription.status)} />
              <View style={$statusDot}></View>
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

const statusColors: Record<Prescription.Status, string> = {
  "pending": "#FFA500", // Muted orange
  "partially-picked-up": "#FFA500", // Muted orange
  "prepared": "#4682B4", // Muted steel blue
  "picked-up": "#228B22", // Muted forest green
  "not-picked-up": "#CD5C5C", // Muted indian red
  "cancelled": "#808080", // Muted gray
  "other": "#8B4513", // Muted saddle brown
}

/**
 * Returns the color associated with a given prescription status.
 *
 * @param {Prescription.Status} status - The status of the prescription.
 * @returns {string} The hexadecimal color code for the given status.
 */
function getStatusColor(status: Prescription.Status): string {
  return statusColors[status] || statusColors.other
}

const $eventListItemHeader = {
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
}
