import { useDatabase } from "@nozbe/watermelondb/hooks"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useEffect, useState } from "react"
import { FAB } from "react-native-paper"
import { Alert, View, FlatList, ViewStyle, TouchableOpacity, ToastAndroid } from "react-native"
import { RootStackParamList } from "../../App"
import { Text } from "../components/Text"
import { Screen } from "../components/Screen"
import EventModel from "../db/model/Event"
import withObservables from '@nozbe/with-observables'
import { translate } from "../i18n"
import { compose } from 'recompose';
import { Event, EventTypes } from "../types"
import { Database, Q } from "@nozbe/watermelondb"
import { getEventDisplay } from "../components/EventFormDisplay"
import { calculateAgeInYears } from "../utils/dateUtils"
import { deleteEvent } from "../db/api"
import { primary } from "../styles/colors"
import { withDatabase } from "@nozbe/watermelondb/DatabaseProvider"
import VisitModel from "../db/model/Visit"
import database from "../db"

type Props = NativeStackScreenProps<RootStackParamList, "EventList">


export const EventList = function(props: Props & { events: Event[] }) {
  const { navigation, route } = props
  const { visit, patient, providerId } = route.params
  const [updateCount, setUpdateCount] = useState(0)

  const [eventsList, setEventsList] = useState<Event[]>([])

  useEffect(() => {
    const eventSub = database
      .get<EventModel>("events")
      .query(
        Q.where("visit_id", visit.id),
        // sort by created at
        Q.sortBy("created_at", Q.desc),
      ).observe()
      .subscribe((events) => {
        console.log("EVENTS RERENDER")
        setEventsList(events)
      })
    return () => {
      console.log("EVENTS UNSUBSCRIBE")
      eventSub?.unsubscribe()
    }
  }, [updateCount])


  // Update the header title when the eventsList array changes
  useEffect(() => {
    navigation.setOptions({ title: `Visit Events (${eventsList.length})` })
  }, [eventsList.length])


  const onUpdate = () => setUpdateCount((count) => count + 1)

  const keyExtractor = (item: Event) => {
    // combile the item id and the item updatedAt to  create a unique key
    return `${item.id}-${item.updatedAt}`
  }

  const goToNewPatientVisit = () => {
    navigation.navigate("NewVisit", {
      patientId: patient.id,
      patientAge: calculateAgeInYears(new Date(patient.dateOfBirth)),
      providerId,
      visitId: visit.id,
      visitDate: new Date(visit.checkInTimestamp)
    })
  }

  const editEvent = (event: Event, onUpdate: () => void) => {
    return navigation.navigate("EventForm", {
      formData: JSON.stringify(event._raw),
      onUpdate
    })
    // switch (event.eventType) {
    //   case "Vitals":
    //     props.navigation.navigate("EditVitals", { event, userName })
    //     break
    //   case "Examination Full":
    //     props.navigation.navigate("EditExamination", {
    //       event,
    //       language,
    //       userName,
    //     })
    //     break
    //   case "Medicine":
    //     props.navigation.navigate("EditMedicine", { event, language, userName })
    //     break
    //   case "Medical History Full":
    //     props.navigation.navigate("EditMedicalHistory", {
    //       event,
    //       language,
    //       userName,
    //     })
    //     break
    //   case "Physiotherapy":
    //     props.navigation.navigate("EditPhysiotherapy", {
    //       event,
    //       userName,
    //     })
    //     break
    //   case "Complaint":
    //   case "Dental Treatment":
    //   case "Notes":
    //     props.navigation.navigate("EditOpenTextEvent", { event })
    //   default:
    //     break
    // }
  }

  const confirmDeleteEvent = (event: Event) => {
    Alert.alert("Delete", "Are you sure you want to delete this event?", [
      {
        text: "Cancel",
      },
      {
        text: "Delete",
        onPress: () => {
          deleteEvent(event.id)
            .then((res) => {
              setEventsList(eventsList.filter((e) => e.id !== event.id))
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

  const openEventOptions = (event: Event, onUpdate: () => void) => {
    Alert.alert(
      translate("eventList.eventOptions"),
      translate("eventList.eventOptionsDescription"),
      [
        {
          text: translate("eventList.edit"),
          onPress: () => editEvent(event, onUpdate),
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

  const renderItem = ({ item }: { item: Event }) => {
    const display = getEventDisplay(item)
    const time = new Date(item.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })


    return <EventListItem
      display={display}
      event={item}
      time={time}
      openEventOptions={openEventOptions}
      onUpdate={onUpdate}
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
  display: string,
  event: Event,
  time: string,
  openEventOptions: (event: Event, onUpdate: () => void) => void,
  onUpdate: () => void
}

const EventListItem = enhanceEvent(({ display, event, time, openEventOptions, onUpdate }: EventListItemProps) => {
  return (
    <TouchableOpacity style={{ paddingVertical: 8 }} onLongPress={() => openEventOptions(event, onUpdate)}>
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
