import { FC } from "react"
import { Alert, ViewStyle } from "react-native"
import { LegendList } from "@legendapp/list"
import { NativeStackScreenProps } from "@react-navigation/native-stack"

import { PatientVisitItem } from "@/components/PatientVisitItem"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import VisitModel from "@/db/model/Visit"
import { useDBPatientVisits } from "@/hooks/useDBPatientVisits"
import type { AppStackScreenProps } from "@/navigators/AppNavigator"
import { PatientNavigatorParamList } from "@/navigators/PatientNavigator"

interface PatientVisitsListScreenProps
  extends NativeStackScreenProps<PatientNavigatorParamList, "PatientVisitsList"> {}

export const PatientVisitsListScreen: FC<PatientVisitsListScreenProps> = ({
  navigation,
  route,
}) => {
  const { patientId } = route.params

  const patientVisits = useDBPatientVisits(patientId)

  const renderItem = ({ item }: { item: VisitModel }) => (
    <PatientVisitItem visit={item} onPress={onVisitPress} onDelete={onDeleteVisit} />
  )

  console.log("PatientVisitsListScreen", patientVisits)

  const onVisitPress = (visit: VisitModel) => {
    navigation.navigate("VisitEventsList", {
      patientId,
      visitId: visit.id,
      visitTimestamp: visit.checkInTimestamp?.getTime() || undefined,
    })
  }

  const onDeleteVisit = (visitId: string) => {
    // FIXME: Add support for permissions in deleting visits (and all other events really)
    return Alert.alert(
      "Not allowed",
      "Deleting visits is currently not allowed",
      [
        {
          text: "OK",
          onPress: () => console.log("OK Pressed"),
        },
      ],
      { cancelable: true },
    )

    Alert.alert(
      "Delete Visit",
      "Are you sure you want to delete this visit?",
      [
        {
          text: "Cancel",
          onPress: () => console.log("Cancel Pressed"),
          style: "cancel",
        },
        {
          text: "Confirm",
          onPress: () => {
            api.deleteVisit(visitId).catch((error) => {
              console.error(error)
              Alert.alert("Error", "There was an error deleting this visit. Please try again")
            })
          },
        },
      ],
      { cancelable: true },
    )
  }

  return (
    <LegendList
      data={patientVisits}
      contentContainerStyle={{ paddingHorizontal: 14 }}
      renderItem={renderItem}
      recycleItems={false}
      estimatedItemSize={137}
    />
  )
}

const $root: ViewStyle = {
  flex: 1,
}
