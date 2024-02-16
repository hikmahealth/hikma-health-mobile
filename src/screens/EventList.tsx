import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useEffect, useState } from "react"
import { FAB } from "react-native-paper"
import { Alert, View, FlatList, ViewStyle, TouchableOpacity, ToastAndroid } from "react-native"
import { Text } from "../components/Text"
import { Screen } from "../components/Screen"
import EventModel from "../db/model/Event"
import withObservables from '@nozbe/with-observables'
import { translate } from "../i18n"
import { Event } from "../types"
import { getEventDisplay } from "../components/EventFormDisplay"
import { calculateAgeInYears } from "../utils/dateUtils"
import { deleteEvent } from "../db/api"
import { primary } from "../styles/colors"
import { useDBEvents } from "../hooks/useDBEvents"
import { PatientFlowParamList } from "../navigators/PatientFlowNavigator"
import { useProviderStore } from "../stores/provider"
import { useLanguageStore } from "../stores/language"

type Props = NativeStackScreenProps<PatientFlowParamList, "EventList">


export const EventList = function(props: Props) {
  const { navigation, route } = props
  const { visitId, patient, visitCheckInTimestamp } = route.params
  const provider = useProviderStore((store) => store.provider)
  const [isRtl, language] = useLanguageStore((state) => [state.isRtl, state.language])

  const eventsList = useDBEvents(visitId)

  // Update the header title when the eventsList array changes
  useEffect(() => {
    navigation.setOptions({ title: `Visit Events (${eventsList.length})` })
  }, [eventsList.length])


  const goToNewPatientVisit = () => {
    navigation.navigate("NewVisit", {
      patientId: patient.id,
      patientAge: calculateAgeInYears(new Date(patient.dateOfBirth)),
      visitId: visitId,
      visitDate: new Date(visitCheckInTimestamp).getTime(),
      providerId: ""
    })
  }

  const editEvent = (event: EventModel) => {
    return navigation.navigate("EventForm", {
      formData: JSON.stringify(event._raw),
      formId: "", // the formId not needed in the edit route, it get extracted from form data
      eventDate: event.createdAt.getTime(),
      patientId: event.patientId,
      providerId: provider?.id || "",
      visitId: event.visitId,
      eventType: event.eventType as any
    })
  }

  const confirmDeleteEvent = (event: EventModel) => {
    Alert.alert("Delete", "Are you sure you want to delete this event?", [
      {
        text: "Cancel",
      },
      {
        text: "Delete",
        onPress: () => {
          deleteEvent(event.id)
            .then((res) => {
              // setEventsList(eventsList.filter((e) => e.id !== event.id))
              ToastAndroid.show(translate("eventList.eventDeleted"), ToastAndroid.SHORT)
            })
            .catch((error) => {
              console.error(error)
              ToastAndroid.show(translate("eventList.errorDeletingEvent"), ToastAndroid.SHORT)
            })
        },
      },
    ])
  }

  const openEventOptions = (event: EventModel) => {
    Alert.alert(
      translate("eventList.eventOptions"),
      translate("eventList.eventOptionsDescription"),
      [
        {
          text: translate("eventList.edit"),
          onPress: () => editEvent(event),
        },
        {
          text: translate("eventList.delete"),
          onPress: () => confirmDeleteEvent(event),
        },
      ],
      {
        cancelable: true,
      },
    )
  }

  const keyExtractor = (item: EventModel) => {
    // combile the item id and the item updatedAt to  create a unique key
    return `${item.id}-${item.updatedAt}`
  }

  const renderItem = ({ item }: { item: EventModel }) => {

    return <EventListItem
      event={item}
      openEventOptions={openEventOptions}
      language={language}
    />
  }

  return (
    <>
      <Screen style={$screen} preset="fixed">
        <FlatList
          keyExtractor={keyExtractor}
          data={eventsList}
          renderItem={(item) => renderItem(item)}
        />

      </Screen>

      <FAB icon="plus" label={translate("eventList.newEntry")} color="white" style={$fab} onPress={goToNewPatientVisit} />
    </>
  )
}


const enhanceEvent = withObservables(['event'], ({ event }) => ({
  event// shortcut syntax for `event: event.observe()`
}))

type EventListItemProps = {
  event: EventModel,
  openEventOptions: (event: Event) => void,
  language: string
}

const EventListItem = enhanceEvent(({ event, openEventOptions, language }: EventListItemProps) => {
  const display = getEventDisplay(event as Event, language)
  const time = new Date(event.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })

  return (
    <TouchableOpacity testID="eventListItem" style={{ paddingVertical: 8 }} onLongPress={() => openEventOptions(event as Event)}>
      <View style={{}}>
        <View style={{ margin: 10 }}>
          <Text variant="bodyLarge">{`${event.eventType}, ${time}`}</Text>
          <View
            style={{
              marginVertical: 5,
              borderBottomColor: "black",
              borderBottomWidth: 1,
            }}
          />
          {display}
        </View>
      </View>
    </TouchableOpacity>
  )
})

const $screen: ViewStyle = {}

const $fab: ViewStyle = {
  position: "absolute",
  margin: 16,
  backgroundColor: primary,
  right: 4,
  bottom: 10,
}
