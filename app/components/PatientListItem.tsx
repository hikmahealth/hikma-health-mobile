import * as React from "react"
import { Pressable, StyleProp, TextStyle, ViewStyle, Image } from "react-native"
import { observer } from "mobx-react-lite"
import { colors, typography } from "../theme"
import { Text } from "../components/Text"
import { View } from "../components/View"
import Patient from "../db/model/Patient"
import { displayName, displayNameAvatar, getInitials } from "../utils/patient"
import { useStores } from "../models"
import { TxKeyPath, translate } from "../i18n"
import { format, isValid } from "date-fns"
import { upperFirst } from "lodash"
import { localeDate } from "../utils/date"
import { Button } from "./Button"
import { withObservables } from "@nozbe/watermelondb/react"

export interface PatientListItemProps {
  /**
   * An optional style override useful for padding & margin.
   */
  style?: StyleProp<ViewStyle>
  /**
   * The patient to display
   */
  patient: Patient

  /**
   * Callback for when the patient is selected
   */
  onPatientSelected: (patientId: Patient["id"], patient: Patient) => void

  /*
  Callback for when the patient list item is long pressed
  */
  onPatientLongPress: (patientId: Patient["id"]) => void
}

const enhance = withObservables(["patient"], ({ patient }) => ({
  patient, // shortcut syntax for `patient: patient.observe()`
}))

/**
 * PatientListItem displays a patient in a list
 */
export const PatientListItem = enhance(
  observer(function PatientListItem(props: PatientListItemProps) {
    const { language } = useStores()
    const isRTL = language.isRTL
    const { style, patient, onPatientSelected, onPatientLongPress } = props
    const $styles = [$container, style]

    return (
      <Pressable
        onPress={() => onPatientSelected(patient.id, patient)}
        style={$styles}
        onLongPress={() => onPatientLongPress(patient.id)}
      >
        <View gap={20} direction={isRTL ? "row-reverse" : "row"}>
          <Avatar fullName={`${displayName(patient)}`} imageURL={patient.photoUrl} />
          <View>
            <Text textDecorationLine="underline" size="xl">
              {displayName(patient)}
            </Text>
            <Text
              text={`${translate("dob")}: ${
                isValid(new Date(patient.dateOfBirth))
                  ? format(new Date(patient.dateOfBirth), "dd MMM yyyy")
                  : ""
              }`}
            />
            <Text testID="sex">{`${translate("sex")}:  ${upperFirst(
              translate(patient.sex as TxKeyPath, { defaultValue: patient.sex || "" }),
            )}`}</Text>
            {/*<Text>{localeDate(patient.createdAt, "MMM dd, yyyy", {})}</Text>*/}
          </View>
        </View>
      </Pressable>
    )
  }),
)

/**
 * An Avatar component that would render an image if available or fallback to a text avatar.
 */
export function Avatar(props: { imageURL?: string; fullName: string; size?: number }) {
  const { imageURL, fullName, size } = props
  const $container = {
    ...$avatarContainer,
    ...(size && { height: size, width: size }),
  }
  return (
    <View style={$container}>
      {imageURL && imageURL.length > 0 ? (
        <Image
          source={{ uri: imageURL }}
          style={{ height: "100%", width: "100%", borderRadius: 100 }}
        />
      ) : (
        <Text color={"white"} size="lg">
          {getInitials(fullName)}
        </Text>
      )}
    </View>
  )
}

const $avatarContainer: ViewStyle = {
  height: 60,
  width: 60,
  borderRadius: 100,
  backgroundColor: colors.palette.primary500,
  justifyContent: "center",
  alignItems: "center",
}

const $container: ViewStyle = {
  flex: 1,
  paddingVertical: 10,
  width: "100%",
}
