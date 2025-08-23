import { FC, useEffect } from "react"
import { Alert, View } from "react-native"
import { LegendList } from "@legendapp/list"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useSelector } from "@xstate/react"

import { EventListItem } from "@/components/EventListItem"
import EventModel from "@/db/model/Event"
import { useDBFormEvents } from "@/hooks/useDBFormEvents"
import { useDBSingleEventForm } from "@/hooks/useDBSingleEventForm"
import { translate } from "@/i18n/translate"
import Event from "@/models/Event"
import { PatientNavigatorParamList } from "@/navigators/PatientNavigator"
import { languageStore } from "@/store/language"
import { Screen } from "@/components/Screen"

interface FormEventsListScreenProps
  extends NativeStackScreenProps<PatientNavigatorParamList, "FormEventsList"> {}

export const FormEventsListScreen: FC<FormEventsListScreenProps> = ({ navigation, route }) => {
  const { language } = useSelector(languageStore, (state) => state.context)
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
              formId: event.formId,
              eventId: event.id,
            })
          },
        },
        {
          text: translate("eventList:delete"),
          onPress: () => {
            Event.DB.softDelete(event.id)
              .then(() => {
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
    <Screen preset="fixed">
      <LegendList
        data={eventsList}
        contentContainerStyle={$contentContainerStyle}
        renderItem={({ item }) => (
          <EventListItem event={item} openEventOptions={openEventOptions} language={language} />
        )}
        keyExtractor={(item) => item.id}
        ListFooterComponent={() => <View style={$legendListFooter} />}
      />
    </Screen>
  )
}

const $contentContainerStyle = {
  paddingHorizontal: 10,
}

const $legendListFooter = {
  height: 100,
}
