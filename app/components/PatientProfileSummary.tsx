import { FC } from "react"
import { StyleProp, TextStyle, ViewStyle } from "react-native"
import { format, isValid } from "date-fns"
import { upperFirst } from "es-toolkit/compat"

import { Text } from "@/components/Text"
import { View } from "@/components/View"
import { TxKeyPath } from "@/i18n"
import { translate } from "@/i18n/translate"
import Patient from "@/models/Patient"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { localeDate, parseYYYYMMDD } from "@/utils/date"

import { Avatar } from "./PatientListItem"

/**
 * Patient profile summary component
 */
export type PatientProfileSummaryProps = {
  /**
   * An optional style override useful for padding & margin.
   */
  style?: StyleProp<ViewStyle>

  /**
   * The patient to display
   */
  patient: Patient.T

  /**
   * Callback to handle edit action
   */
  onPressEdit: () => void
}

export const PatientProfileSummary: FC<PatientProfileSummaryProps> = ({ patient, onPressEdit }) => {
  return (
    <View alignItems="center">
      <View direction="row" justifyContent="center" pb={10}>
        <Avatar size={80} patient={patient} />
      </View>
      <View>
        <Text align="center" textDecorationLine="underline" size="xl">
          {Patient.displayName(patient)}
        </Text>
        <Text align="center" testID="sex">{`${translate("common:sex")}:  ${upperFirst(
          translate(patient.sex as TxKeyPath, { defaultValue: patient.sex || "" }),
        )}`}</Text>
        <Text
          align="center"
          text={`${translate("common:dob")}: ${localeDate(patient.dateOfBirth, "dd MMM yyyy")}`}
        />

        <Text align="center">Registered: {localeDate(patient.createdAt, "dd MMM yyyy", {})}</Text>
      </View>
    </View>
  )
}
