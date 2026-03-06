import { FC, useEffect } from "react"
import { Alert, View } from "react-native"
import { LegendList } from "@legendapp/list"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useSelector } from "@xstate/react"

import Toast from "react-native-root-toast"

import { EventListItem, EventListItemPlain } from "@/components/EventListItem"
import EventModel from "@/db/model/Event"
import { useDBFormEvents } from "@/hooks/useDBFormEvents"
import { useDBSingleEventForm } from "@/hooks/useDBSingleEventForm"
import { usePermissionGuard } from "@/hooks/usePermissionGuard"
import { useDataAccess } from "@/providers/DataAccessProvider"
import { useProviderFormEvents } from "@/hooks/useProviderFormEvents"
import { useDeleteEvent } from "@/hooks/useDeleteEvent"
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
  const { isOnline } = useDataAccess()
  const offlineEventsList = useDBFormEvents(formId, patientId)
  const onlineEventsQuery = useProviderFormEvents(isOnline ? formId : null, isOnline ? patientId : null)
  const eventsList = isOnline ? (onlineEventsQuery.data ?? []) : offlineEventsList
  const { can } = usePermissionGuard()
  const deleteEventMutation = useDeleteEvent()

  const form = useDBSingleEventForm(formId)
  useEffect(() => {
    const formName = form?.name || "Unknown Form"
    navigation.setOptions({ title: `${formName} (${eventsList.length})` })
  }, [eventsList.length, form?.name])

  const openEventOptions = (event: any) => {
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
              visitId: event.visitId,
              formId: event.formId,
              eventId: event.id,
            })
          },
        },
        {
          text: translate("eventList:delete"),
          onPress: () => {
            if (!can("event:delete")) {
              return Toast.show("You do not have permission to delete events", {
                duration: Toast.durations.SHORT,
                position: Toast.positions.BOTTOM,
              })
            }
            if (isOnline) {
              deleteEventMutation
                .mutateAsync(event.id)
                .then(() => Alert.alert("Success", "Event deleted"))
                .catch((error) => {
                  console.log(error)
                  Alert.alert("Error", "Could not delete event")
                })
            } else {
              Event.DB.softDelete(event.id)
                .then(() => Alert.alert("Success", "Event deleted"))
                .catch((error) => {
                  console.log(error)
                  Alert.alert("Error", "Could not delete event")
                })
            }
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
        data={eventsList as any}
        contentContainerStyle={$contentContainerStyle}
        renderItem={({ item }) =>
          isOnline ? (
            <EventListItemPlain event={item} openEventOptions={openEventOptions} language={language} />
          ) : (
            <EventListItem event={item} openEventOptions={openEventOptions} language={language} />
          )
        }
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
