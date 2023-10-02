import React from "react"
import { format } from "date-fns"
import { upperFirst } from "lodash"
import { useCallback } from "react"
import { TouchableOpacity, View, ViewStyle } from "react-native"
import { Avatar } from "react-native-paper"
import { i18n, translate } from "../i18n"
import { useLanguageStore } from "../stores/language"
import { primary } from "../styles/colors"
import { Patient } from "../types/Patient"
import { displayName, displayNameAvatar } from "../utils/patient"
import { ar, enUS, es } from 'date-fns/locale'
import { Text } from "./Text"
import { localeDate } from "../utils/formatDate"

type PatientListItemProps = {
  patient: Patient
  onPatientSelected: (patient: Patient) => void
}

export function PatientListItem(props: PatientListItemProps) {
  const { patient, onPatientSelected } = props
  const isRtl = useLanguageStore((state) => state.isRtl)

  // use callback function to call when the patient is pressed
  const handlePatientSelected = useCallback(() => {
    onPatientSelected(patient)
  }, [patient.id])

  return (
    <TouchableOpacity style={$patientItemContainer} testID="patientItem" onPress={handlePatientSelected}>
      <View style={[$cardContent, isRtl ? $rtlView : {}]}>
        <Avatar.Text
          style={{
            backgroundColor: primary,
          }}
          size={64}
          label={displayNameAvatar(patient)}
        />
        <View style={isRtl ? { marginRight: "3%", alignItems: "flex-end" } : { marginLeft: "3%" }}>
          <Text variant="titleLarge">{displayName(patient)}</Text>
          <View
            style={{
              marginVertical: 2,
              height: 1,
              backgroundColor: "#eee",
            }}
          />
          <Text
            testID="dob"
            style={{
              flexWrap: "wrap",
            }}
          >{`${translate("dob")}:  ${format(new Date(patient.dateOfBirth), "dd MMM yyyy")}`}</Text>
          <Text testID="sex">{`${translate("sex")}:  ${upperFirst(translate(patient.sex))}`}</Text>
          <Text testID="camp" style={{ flexWrap: "wrap" }} >{`${translate("camp")}:  ${patient.camp}`}</Text>
          <Text>{localeDate(patient.createdAt, "MMM dd, yyyy", {})}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const $cardContent: ViewStyle = {
  flex: 1,
  marginHorizontal: 10,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "flex-start",
}

const $rtlView: ViewStyle = {
  flexDirection: "row-reverse",
}

const $patientItemContainer: ViewStyle = {
  flex: 1,
  height: 100,
  width: "100%",
}
