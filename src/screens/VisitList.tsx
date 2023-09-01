import { Q } from "@nozbe/watermelondb"
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
import { VitalsMetadata } from "./VitalsForm"
import UserModel from "../db/model/User"
import { format } from "date-fns"
import database from "../db"

type Props = NativeStackScreenProps<PatientFlowParamList, "VisitList">

export function VisitList(props: Props) {
  const { route, navigation } = props
  const { patientId, patient } = route.params


  const [patientVisits, setPatientVisits] = useState<Visit[]>([])

  const fetchPatientData = () => {
    database
      .get<VisitModel>("visits")
      .query(Q.and(Q.where("patient_id", patientId), Q.where("is_deleted", false)))
      .fetch()
      .then((res) => {
        setPatientVisits(res)
      })
      .catch((error) => {
        Alert.alert("Error", "Something went wrong. Please try again.")
        console.error(error)
      })
  }

  useEffect(() => {
    setTimeout(() => {
      fetchPatientData()
    }, 100)

  }, [])

  // Update the header title when the patientVisits array changes
  useEffect(() => {
        navigation.setOptions({ title:`Patient Visits (${patientVisits.length})` })
  }, [patientVisits.length])

  const keyExtractor = (item: any, index: number) => index.toString()

  const renderItem = ({ item }: { item: Visit }) => (
    <TouchableOpacity
      style={{}}
      onPress={() =>
        props.navigation.navigate("EventList", {
          patient,
          visit: item,
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
              deleteVisit(item.id).then((_) => {
                setPatientVisits((visits) => visits.filter((v) => v.id !== item.id))
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

  console.log("patientVisits", patientVisits)

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

type VitalsDisplayProps = {
  metadataObj: VitalsMetadata
}

export const VitalsDisplay = (props: VitalsDisplayProps) => {
  const { metadataObj } = props
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
      }}
    >
      <Text style={{ width: "50%" }}>HR: {metadataObj.heartRate} BPM</Text>
      <Text style={{ width: "50%" }}>
        BP: {metadataObj.systolic}/{metadataObj.diastolic}
      </Text>
      <Text style={{ width: "50%" }}>Sats: {metadataObj.oxygenSaturation}%</Text>
      <Text style={{ width: "50%" }}>Temp: {metadataObj.temperature} °C</Text>
      <Text style={{ width: "50%" }}>RR: {metadataObj.respiratoryRate}</Text>
      <Text style={{ width: "50%" }}>Weight: {metadataObj.weight} kg</Text>
      <Text style={{ width: "50%" }}>BG: {metadataObj.bloodGlucose}</Text>
    </View>
  )
}
