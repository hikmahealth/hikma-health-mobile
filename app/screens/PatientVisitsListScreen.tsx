import React, { FC, useEffect } from "react"
import { observer } from "mobx-react-lite"
import { Alert, Pressable, ViewStyle } from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { If, Screen, Text, View } from "app/components"
import { useDBPatientVisits } from "app/hooks/useDBPatientVisits"
import { FlashList } from "@shopify/flash-list"
import { translate } from "app/i18n"
import { format, isValid } from "date-fns"
import VisitModel from "app/db/model/Visit"
import { api } from "app/services/api"
import { SafeAreaView } from "react-native-safe-area-context"
import { LucideTrash2 } from "lucide-react-native"
import { colors } from "app/theme"
import { withObservables } from "@nozbe/watermelondb/react"
import ClinicModel from "app/db/model/Clinic"
// import { useNavigation } from "@react-navigation/native"
// import { useStores } from "app/models"

interface PatientVisitsListScreenProps extends AppStackScreenProps<"PatientVisitsList"> { }

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

    const onVisitPress = (visit: VisitModel) => {
      navigation.navigate("VisitEventsList", {
        patientId,
        visitId: visit.id,
        visitDate: visit.checkInTimestamp?.getTime(),
      })
    }

    const onDeleteVisit = (visitId: string) => {
      Alert.alert("Delete Visit", "Are you sure you want to delete this visit?", [
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
      ], { cancelable: true })
    }

    const renderItem = ({ item }: { item: VisitModel }) =>
      <PatientVisitItem
        visit={item}
        onPress={onVisitPress}
        onDelete={onDeleteVisit}
      />

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
        <FlashList data={patientVisits} contentContainerStyle={{ paddingHorizontal: 14 }} renderItem={renderItem} estimatedItemSize={137} />
      </SafeAreaView>
    )
  },
)


type PatientVisitItemProps = {
  visit: VisitModel
  clinic: ClinicModel
  onPress: (visit: VisitModel) => void
  onDelete: (visitId: string) => void
}


const enhanceVisitItem = withObservables(["visit"], ({ visit }) => ({
  visit, // shortcut for visit.observe
  clinic: visit.clinic,
}))

const PatientVisitItem: FC<PatientVisitItemProps> = enhanceVisitItem(({ visit, clinic, onPress, onDelete }: PatientVisitItemProps) => {
  return (
    <Pressable
      style={{ marginBottom: 32 }}
      testID="visitItem"
      onPress={() => onPress(visit)}
      onLongPress={() => onDelete(visit.id)}
    >
      <View style={{}}>
        <View direction="row" gap={10} justifyContent="space-between" alignItems="center">
          <Text style={{ fontSize: 18 }} text={format(visit.checkInTimestamp, "dd MMM yyyy")} />

          <Pressable onPress={() => onDelete(visit.id)}>
            <LucideTrash2 size={18} color={colors.palette.angry400} />
          </Pressable>
        </View>
        <View
          style={{
            marginVertical: 5,
            borderBottomColor: "#ccc",
            borderBottomWidth: 1,
          }}
        />
        <If condition={!!clinic}>
          <Text>
            {translate("clinic")}: {clinic.name}
          </Text>
        </If>
        <If condition={visit.checkInTimestamp && isValid(visit.checkInTimestamp)}>
          <Text>
            {translate("checkedIn")}: {format(visit.checkInTimestamp, "HH:mm a")}
          </Text>
        </If>
        <Text>
          {translate("provider")}: {visit.providerName}
        </Text>
      </View>
    </Pressable>
  )
})

const $root: ViewStyle = {
  flex: 1,
}
