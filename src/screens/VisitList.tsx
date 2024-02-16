import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useEffect, useState } from "react"
import { View, Alert, FlatList, TouchableOpacity } from "react-native"
import { Text } from "../components/Text"
import { Screen } from "../components/Screen"
import { deleteVisit } from "../db/api"
import VisitModel from "../db/model/Visit"
import { translate } from "../i18n"
import { PatientFlowParamList } from "../navigators/PatientFlowNavigator"
import { Visit } from "../types"
import { displayName } from "../utils/patient"
import UserModel from "../db/model/User"
import { format } from "date-fns"
import database from "../db"
import { useDBPatientVisits } from "../hooks/useDBPatientVisits"

type Props = NativeStackScreenProps<PatientFlowParamList, "VisitList">

export function VisitList(props: Props) {
  const { route, navigation } = props
  const { patientId, patient } = route.params

  const patientVisits = useDBPatientVisits(patientId)


  // Update the header title when the patientVisits array changes
  useEffect(() => {
    navigation.setOptions({ title: `Patient Visits (${patientVisits.length})` })
  }, [patientVisits.length])

  const keyExtractor = (item: any, index: number) => index.toString()

  const renderItem = ({ item }: { item: VisitModel }) => (
    <TouchableOpacity
      style={{}}
      testID="visitItem"
      onPress={() =>
        props.navigation.navigate("EventList", {
          patient,
          visitId: item.id,
          visitCheckInTimestamp: item.checkInTimestamp?.getTime()
        })
      }
      onLongPress={() =>
        Alert.alert("Delete Visit", "Are you sure you want to delete this visit?", [
          {
            text: "Cancel",
            onPress: () => console.log("Cancel Pressed"),
            style: "cancel",
          },
          {
            text: "Confirm",
            onPress: () => {
              deleteVisit(item.id).catch(error => {
                console.error(error)
                Alert.alert("Error", "There was an error deleting this visit. Please try again")
              })
            },
          },
        ])
      }
    >
      <View style={{}}>
        <View style={{ margin: 10 }}>
          <Text style={{ fontSize: 18 }}>{displayName(patient)}</Text>
          <View
            style={{
              marginVertical: 5,
              borderBottomColor: "#ccc",
              borderBottomWidth: 1,
            }}
          />
          <Text>
            {translate("provider")}: {item.providerName}
          </Text>
          <Text>{`${translate("visitDate")}: ${format(item.checkInTimestamp, "dd MMM yyyy")}`}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )

  return (
    <Screen preset="fixed">
      <FlatList
        keyExtractor={keyExtractor}
        data={patientVisits}
        renderItem={(item) => renderItem(item)}
      />
    </Screen>
  )
}

