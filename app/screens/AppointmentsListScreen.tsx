import React, { FC } from "react"
import { observer } from "mobx-react-lite"
import { Pressable, SectionList, TextStyle, ViewStyle } from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text, View } from "app/components"
import { colors } from "app/theme/colors"
import { format, subDays } from "date-fns"
import { Appointment } from "app/types"
import { useNavigation } from "@react-navigation/native"
// import { useStores } from "app/models"

interface AppointmentsListScreenProps extends AppStackScreenProps<"AppointmentsList"> { }

export const AppointmentsListScreen: FC<AppointmentsListScreenProps> = observer(function AppointmentsListScreen() {
  // Pull in one of our MST stores
  // const { someStore, anotherStore } = useStores()

  // Pull in navigation via hook
  const navigation = useNavigation()

  const appointments: { title: string, data: Appointment[] }[] = [
    {
      title: format(subDays(new Date(), 1), "MMM dd, yyyy"),
      data: [
        {
          id: "1",
          patient_id: "1",
          provider_id: "1",
          clinic_id: "1",
          user_id: "1",
          current_visit_id: "1",
          fulfilled_visit_id: "1",
          timestamp: new Date(),
          duration: 60,
          reason: "Reason",
          notes: "Notes",
          status: "pending",
          metadata: {},
          is_deleted: false,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        }
      ]
    },
    {
      title: format(new Date(), "MMM dd, yyyy"),
      data: [
        {
          id: "2",
          patient_id: "2",
          provider_id: "2",
          clinic_id: "2",
          user_id: "2",
          current_visit_id: "2",
          fulfilled_visit_id: "2",
          timestamp: new Date(),
          duration: 60,
          reason: "Reason",
          notes: "Notes",
          status: "pending",
          metadata: {},
          is_deleted: false,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
        {
          id: "3",
          patient_id: "3",
          provider_id: "3",
          clinic_id: "3",
          user_id: "3",
          current_visit_id: "3",
          fulfilled_visit_id: "3",
          timestamp: new Date(),
          duration: 60,
          reason: "Reason",
          notes: "Notes",
          status: "pending",
          metadata: {},
          is_deleted: false,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        }
      ]
    }
  ]


  return (
    <Screen style={$root} preset="fixed" >
      <SectionList
        sections={appointments}
        renderItem={AppointmentListItem}
        renderSectionHeader={({ section }) => <Text text={section.title} style={$sectionHeader} />}
        stickySectionHeadersEnabled
      />
    </Screen>
  )
})


// TODO: wrap in a watermelondb HOC
const AppointmentListItem = ({ item }: { item: Appointment }) => {
  const navigation = useNavigation()
  return (
    <Pressable onPress={() => {
      navigation.navigate("AppointmentView", { appointmentId: item.id })
    }}>
      <View style={$appointmentListItem}>
        <Text text={"John Doe"} size="md" />
        <Text text={format(item.timestamp, "h:mm a")} size="xs" />
        {/* Status */}
        <Text text={item.status} size="xs" />
      </View>
    </Pressable>
  )
}

const $root: ViewStyle = {
  flex: 1,
  padding: 10
}

const $sectionHeader: TextStyle = {
  fontSize: 18,
  marginTop: 18
}

const $appointmentListItem: ViewStyle = {
  padding: 8,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  marginHorizontal: 10,
  marginVertical: 5,
  marginBottom: 10,
}
