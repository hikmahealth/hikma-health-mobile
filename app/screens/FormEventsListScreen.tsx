import React, { FC, useEffect } from "react"
import { observer } from "mobx-react-lite"
import { Alert, ViewStyle } from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { EventListItem } from "app/components"
import { useDBFormEvents } from "app/hooks/useDBFormEvents"
import { useStores } from "app/models"
import { useDBSingleEventForm } from "app/hooks/useDBSingleForm"
import { FlashList } from "@shopify/flash-list"
import { translate } from "app/i18n"
import { api } from "app/services/api"
import EventModel from "app/db/model/Event"
// import { useNavigation } from "@react-navigation/native"
// import { useStores } from "app/models"

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
        translate("eventList.eventOptions"),
        translate("eventList.eventOptionsDescription"),
        [
          {
            text: translate("eventList.edit"),
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
