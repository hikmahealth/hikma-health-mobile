import React, { FC, useEffect } from "react"
import { observer } from "mobx-react-lite"
import { Alert, Pressable, ViewStyle } from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text, View } from "app/components"
import { useDBPatientVisits } from "app/hooks/useDBPatientVisits"
import { FlashList } from "@shopify/flash-list"
import { displayName } from "app/utils/patient"
import { translate } from "app/i18n"
import { format } from "date-fns"
import { usePatientRecord } from "app/hooks/usePatientRecord"
import VisitModel from "app/db/model/Visit"
import { api } from "app/services/api"
import { SafeAreaView } from "react-native-safe-area-context"
// import { useNavigation } from "@react-navigation/native"
// import { useStores } from "app/models"

interface PatientVisitsListScreenProps extends AppStackScreenProps<"PatientVisitsList"> {}

export const PatientVisitsListScreen: FC<PatientVisitsListScreenProps> = observer(
  function PatientVisitsListScreen({ route, navigation }) {
    // Pull in one of our MST stores
    // const { someStore, anotherStore } = useStores()

    // Pull in navigation via hook
    // const navigation = useNavigation()
    const { patientId } = route.params
    // const patient = usePatientRecord(patientId)
    const patientVisits = useDBPatientVisits(patientId)

    // Update the header title when the patientVisits array changes
    useEffect(() => {
      navigation.setOptions({ title: `Patient Visits (${patientVisits.length})` })
    }, [patientVisits.length])

    const renderItem = ({ item }: { item: VisitModel }) => (
      <Pressable
        style={{}}
        testID="visitItem"
        onPress={() =>
          navigation.navigate("VisitEventsList", {
            patientId,
            visitId: item.id,
            visitDate: item.checkInTimestamp?.getTime(),
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
                api.deleteVisit(item.id).catch((error) => {
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
            <Text style={{ fontSize: 18 }} text={item.providerName} />
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
            <Text>{`${translate("visitDate")}: ${format(
              item.checkInTimestamp,
              "dd MMM yyyy",
            )}`}</Text>
          </View>
        </View>
      </Pressable>
    )

    if (patientVisits.length === 0) {
      return (
        <Screen preset="fixed">
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Text text="No visits found" />
          </View>
        </Screen>
      )
    }

    return (
      <SafeAreaView style={$root}>
        <FlashList data={patientVisits} renderItem={renderItem} estimatedItemSize={101} />
      </SafeAreaView>
    )
  },
)

const $root: ViewStyle = {
  flex: 1,
}
