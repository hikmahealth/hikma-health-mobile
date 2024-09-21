import React, { FC, useEffect } from "react"
import { observer } from "mobx-react-lite"
import { Alert, Pressable } from "react-native"
import { AppStackScreenProps } from "../navigators"
import { EventListItem, Text, Fab, View } from "../components"
import { useDBVisitEvents } from "../hooks/useDBVisitEvents"
import { LanguageName, useStores } from "../models"
import { PlusIcon } from "lucide-react-native"
import EventModel from "../db/model/Event"
import { FlashList } from "@shopify/flash-list"
import { translate } from "../i18n"
import { api } from "../services/api"
import { useDBVisitAppointments } from "app/hooks/useDBVisitAppointments"
import { colors } from "app/theme"
import { sortBy } from "lodash"
import AppointmentModel from "app/db/model/Appointment"
import { withObservables } from "@nozbe/watermelondb/react"
import ClinicModel from "app/db/model/Clinic"
import { catchError, of as of$ } from "rxjs"
import { format } from "date-fns"

interface VisitEventsListScreenProps extends AppStackScreenProps<"VisitEventsList"> {}

// TODO: Include appointments in the list of events, if there was an appointment that was created during the visit

export const VisitEventsListScreen: FC<VisitEventsListScreenProps> = observer(
  function VisitEventsListScreen({ route, navigation }) {
    const { language } = useStores()
    const { patientId, visitId, visitDate } = route.params
    const eventsList = useDBVisitEvents(visitId, patientId)
    const appointmentsList = useDBVisitAppointments(visitId)
    // const patient = usePatientRecord(patientId)

    // Update the header title when the eventsList array changes
    useEffect(() => {
      const eventCount = eventsList.length + appointmentsList.length
      navigation.setOptions({ title: `Visit Events (${eventCount})` })
    }, [eventsList.length, appointmentsList.length])

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

    const eventsAndAppointments = sortBy(
      [...eventsList, ...appointmentsList],
      (event) => event.createdAt,
    )

    return (
      <>
        <FlashList
          data={eventsAndAppointments}
          estimatedItemSize={100}
          contentContainerStyle={{ padding: 10 }}
          renderItem={({ item }) =>
            isAppointment(item) ? (
              <AppointmentListItem
                appointment={item}
                language={language.current}
                openAppointmentPage={openAppointmentPage}
              />
            ) : (
              <EventListItem
                event={item}
                openEventOptions={openEventOptions}
                language={language.current}
              />
            )
          }
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
              <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text preset="subheading">{`Set Appointment, ${time}`}</Text>
              </View>
              <Text>{`Appointment Date: ${format(appointment.timestamp, "MMM d, yyyy")}`}</Text>
              <Text>{`Clinic: ${clinic?.name || "Unknown Clinic"}`}</Text>
              <Text>{`Reason: ${appointment.reason}`}</Text>
              <Text>{`Status: ${appointment.status}`}</Text>
              <Text>{`Notes: \n${appointment.notes}`}</Text>
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
const isAppointment = (item: EventModel | AppointmentModel): item is AppointmentModel => {
  const appointment = item as AppointmentModel
  if ("status" in appointment && "reason" in appointment && "notes" in appointment) {
    return true
  }
  return false
}
