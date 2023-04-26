import { useEffect, useState } from "react"
import { Alert, TextStyle, View, ViewStyle } from "react-native"
import { Button, IconButton, MD3Colors, TextInput } from "react-native-paper"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"
import { Text } from "./Text"
import { If } from "./If.tsx"
import { getLatestPatientEventByType, createEvent, createVisit } from "../db/api"
import { translate } from "../i18n"
import { useProviderStore } from "../stores/provider"

type Props = {
  patientId: string
}

type ViewMode = "view" | "edit"

export const PatientSummary = ({ patientId }: Props) => {
  const [patientSummary, setPatientSummary] = useState<string>("")
  const [clinic, provider] = useProviderStore((store) => [store.clinic, store.provider])

  const [viewMode, setViewMode] = useState<ViewMode>("view")

  const fetchPatientData = async () => {
    const latestEvent = await getLatestPatientEventByType(patientId, "Patient Summary")

    if (latestEvent.length > 0) setPatientSummary(latestEvent)
  }

  const savePatientSummary = async () => {
    console.warn(provider, clinic)
    if (provider === null || clinic === null) return
    try {
      const visit = await createVisit({
        patientId,
        checkInTimestamp: new Date().getTime(),
        clinicId: clinic?.id,
        providerId: provider?.id,
        isDeleted: false,
      })
      await createEvent({
        patientId: patientId,
        visitId: visit.id,
        eventType: "Patient Summary",
        isDeleted: false,
        eventMetadata: JSON.stringify(patientSummary),
      })
      setViewMode("view")
    } catch (error) {
      Alert.alert("Error", "Failed to save patient summary")
      console.error(error)
    }
  }

  const toggleViewMode = (mode: ViewMode) => () => setViewMode(mode)

  useEffect(() => {
    setTimeout(() => {
      fetchPatientData()
    }, 100)
  }, [])

  return (
    <View style={$container}>
      <View style={$row}>
        <Text style={$summaryHeading} variant="bodyLarge">
          {translate("patientSummary")}
          {/* <Icon name="pencil" size={24} /> */}
        </Text>
        {viewMode === "view" ? (
          <IconButton
            onPress={toggleViewMode("edit")}
            icon={"pencil"}
            size={20}
            iconColor={MD3Colors.primary20}
          />
        ) : (
          <IconButton
            onPress={toggleViewMode("view")}
            icon={"close"}
            size={20}
            iconColor={MD3Colors.primary20}
          />
        )}
      </View>

      <If condition={viewMode === "view"}>
        <Text style={{}}>
          {patientSummary.length > 0 ? patientSummary : translate("noContent")}
        </Text>
      </If>

      <If condition={viewMode === "edit"}>
        <TextInput
          mode="outlined"
          numberOfLines={4}
          multiline
          value={patientSummary}
          onChangeText={(t) => setPatientSummary(t)}
        />
        <Button onPress={savePatientSummary} mode="text">
          Save
        </Button>
      </If>
    </View>
  )
}

const $row: ViewStyle = {
  flexDirection: "row",
  alignItems: "baseline",
}

const $container: ViewStyle = {
  paddingVertical: 8,
}

const $summaryHeading: TextStyle = {
  textDecorationLine: "underline",
}
