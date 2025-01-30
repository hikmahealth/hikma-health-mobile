import React, { FC, useEffect } from "react"
import { observer } from "mobx-react-lite"
import { Alert, ViewStyle } from "react-native"
import { AppStackScreenProps } from "../navigators"
import { EventListItem } from "../components"
import { useDBFormEvents } from "../hooks/useDBFormEvents"
import { useStores } from "../models"
import { useDBSingleEventForm } from "../hooks/useDBSingleForm"
import { FlashList } from "@shopify/flash-list"
import { translate } from "../i18n"
import { api } from "../services/api"
import EventModel from "../db/model/Event"
// import { useNavigation } from "@react-navigation/native"
// import { useStores } from "../models"

interface FormEventsListScreenProps extends AppStackScreenProps<"FormEventsList"> {}

export const FormEventsListScreen: FC<FormEventsListScreenProps> = observer(
  function FormEventsListScreen({ route, navigation }) {
    const { language } = useStores()
    const { patientId, formId } = route.params
    const eventsList = useDBFormEvents(formId, patientId)

    const form = useDBSingleEventForm(formId)

    useEffect(() => {
      const formName = form?.name || "Unknown Form"
      navigation.setOptions({ title: `${formName} (${eventsList.length})` })
    }, [eventsList.length, form?.name])

    const openEventOptions = (event: EventModel) => {
      Alert.alert(
        translate("eventList:eventOptions"),
        translate("eventList:eventOptionsDescription"),
        [
          {
            text: translate("eventList:edit"),
            onPress: () => {
              navigation.navigate("EventForm", {
                patientId,
                visitId: event.visitId,
                visitDate: new Date().getTime(), // Actually not needed when editing an event already attached to a visit.
                formId: event.formId,
                eventId: event.id,
              })
            },
          },
          {
            text: translate("eventList:delete"),
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
          estimatedItemSize={101}
          renderItem={({ item }) => (
            <EventListItem
              event={item}
              openEventOptions={openEventOptions}
              language={language.current}
            />
          )}
        />
      </>
    )
  },
)
