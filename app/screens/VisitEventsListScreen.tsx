import React, { FC, useEffect } from "react"
import { observer } from "mobx-react-lite"
import { Alert } from "react-native"
import { AppStackScreenProps } from "../navigators"
import { EventListItem, Fab, View } from "../components"
import { useDBVisitEvents } from "../hooks/useDBVisitEvents"
import { useStores } from "../models"
import { PlusIcon } from "lucide-react-native"
import EventModel from "../db/model/Event"
import { FlashList } from "@shopify/flash-list"
import { translate } from "../i18n"
import { api } from "../services/api"

interface VisitEventsListScreenProps extends AppStackScreenProps<"VisitEventsList"> {}

export const VisitEventsListScreen: FC<VisitEventsListScreenProps> = observer(
  function VisitEventsListScreen({ route, navigation }) {
    const { language } = useStores()
    const { patientId, visitId, visitDate } = route.params
    const eventsList = useDBVisitEvents(visitId, patientId)
    // const patient = usePatientRecord(patientId)

    // Update the header title when the eventsList array changes
    useEffect(() => {
      navigation.setOptions({ title: `Visit Events (${eventsList.length})` })
    }, [eventsList.length])

    const goToNewPatientVisit = () => {
      navigation.navigate("NewVisit", {
        patientId,
        visitId: visitId,
        visitDate: new Date(visitDate).getTime(),
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

    return (
      <>
        <FlashList
          data={eventsList}
          contentContainerStyle={{ padding: 10 }}
          renderItem={({ item }) => (
            <EventListItem
              event={item}
              openEventOptions={openEventOptions}
              language={language.current}
            />
          )}
          ListFooterComponent={() => <View style={{ height: 60 }} />}
        />
        <Fab Icon={PlusIcon} onPress={goToNewPatientVisit} />
      </>
    )
  },
)
