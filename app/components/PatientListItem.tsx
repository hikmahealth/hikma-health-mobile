import { memo, useMemo, useCallback } from "react"
import { StyleProp, Pressable, ViewStyle, Image, ImageStyle } from "react-native"
import { withObservables } from "@nozbe/watermelondb/react"
import { format, isValid } from "date-fns"
import { upperFirst } from "es-toolkit/compat"

import { Text } from "@/components/Text"
import { View } from "@/components/View"
import { TxKeyPath } from "@/i18n"
import { translate } from "@/i18n/translate"
import Patient from "@/models/Patient"
import { colors } from "@/theme/colors"
import { localeDate, parseYYYYMMDD } from "@/utils/date"

export interface PatientListItemProps {
  /**
   * An optional style override useful for padding & margin.
   */
  style?: StyleProp<ViewStyle>
  /**
   * The patient to display
   */
  patient: Patient.DBPatient

  /**
   * Callback for when the patient is selected
   */
  onPatientSelected: (patientId: Patient.T["id"], patient: Patient.T) => void

  /*
  Callback for when the patient list item is long pressed
  */
  onPatientLongPress: (patientId: Patient.T["id"]) => void

  /**
   * Whether the list item is in RTL mode
   */
  isRTL?: boolean
}

const enhance = withObservables(["patient"], ({ patient }) => ({
  patient, // shortcut syntax for `patient: patient.observe()`
}))

/**
 * Memoized Avatar component that only re-renders when props change
 */
const AvatarMemo = memo(
  function AvatarComponent(props: { imageURL?: string; patient: Patient.T; size?: number }) {
    const { imageURL, patient, size } = props

    const $container = useMemo(
      () => ({
        ...$avatarContainer,
        ...(size && { height: size, width: size }),
      }),
      [size],
    )

    const avatarText = useMemo(
      () => Patient.displayNameAvatar(patient as Patient.T),
      [patient.givenName, patient.surname],
    )

    return (
      <View style={$container}>
        {imageURL && imageURL.length > 0 ? (
          <Image source={{ uri: imageURL }} style={$imageStyle} />
        ) : (
          <Text color={"white"} size="lg">
            {avatarText}
          </Text>
        )}
      </View>
    )
  },
  (prevProps, nextProps) => {
    // Custom comparison function for memo
    return (
      prevProps.imageURL === nextProps.imageURL &&
      prevProps.size === nextProps.size &&
      prevProps.patient.id === nextProps.patient.id &&
      prevProps.patient.givenName === nextProps.patient.givenName &&
      prevProps.patient.surname === nextProps.patient.surname
    )
  },
)

export const Avatar = AvatarMemo

/**
 */
const PatientListItemInner = memo(
  function PatientListItemComponent(props: PatientListItemProps) {
    const { style, patient: dbPatient, onPatientSelected, onPatientLongPress, isRTL } = props
    const $styles = useMemo(() => [$container, style], [style])

    // Convert DB patient to domain model once
    const patient = useMemo(() => Patient.DB.fromDB(dbPatient), [dbPatient])

    // Memoize expensive computations
    const displayName = useMemo(() => Patient.displayName(patient), [patient])

    const formattedDob = useMemo(() => {
      // if (!patient.dateOfBirth) return ""
      // const date = parseYYYYMMDD(patient.dateOfBirth, "")
      // return isValid(date) ? format(date, "dd MMM yyyy") : ""
      return localeDate(patient.dateOfBirth, "dd MMM yyyy")
    }, [patient.dateOfBirth])

    const sexDisplay = useMemo(() => {
      if (!patient.sex) return ""
      return upperFirst(translate(patient.sex as TxKeyPath, { defaultValue: patient.sex }))
    }, [patient.sex])

    // Memoize callbacks to prevent re-renders in child components
    const handlePress = useCallback(() => {
      onPatientSelected(patient.id, patient)
    }, [patient, onPatientSelected])

    const handleLongPress = useCallback(() => {
      onPatientLongPress(patient.id)
    }, [patient.id, onPatientLongPress])

    // Pre-compute translation keys
    const dobLabel = useMemo(() => translate("common:dob"), [])
    const sexLabel = useMemo(() => translate("common:sex"), [])

    const viewDirection = useMemo(() => (isRTL ? "row-reverse" : "row"), [isRTL])

    return (
      <Pressable
        testID={`patientListItem:${patient.id}`}
        onPress={handlePress}
        style={$styles}
        onLongPress={handleLongPress}
      >
        <View gap={20} direction={viewDirection}>
          <AvatarMemo patient={patient} />
          <View>
            <Text textDecorationLine="underline" size="xl">
              {displayName}
            </Text>

            <Text>{`${dobLabel}: ${formattedDob}`}</Text>

            <Text testID="sex">{`${sexLabel}: ${sexDisplay}`}</Text>
          </View>
        </View>
      </Pressable>
    )
  },
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    // Only re-render if patient data or callbacks change
    return (
      prevProps.patient === nextProps.patient &&
      prevProps.onPatientSelected === nextProps.onPatientSelected &&
      prevProps.onPatientLongPress === nextProps.onPatientLongPress &&
      prevProps.isRTL === nextProps.isRTL &&
      prevProps.style === nextProps.style
    )
  },
)

/**
 * PatientListItem displays a patient in a list
 */
export const PatientListItem = enhance(PatientListItemInner)

// Styles moved to constants to prevent recreation
const $imageStyle: ImageStyle = {
  height: "100%",
  width: "100%",
  borderRadius: 100,
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
