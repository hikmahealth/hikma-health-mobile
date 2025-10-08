import { FC } from "react"
import { Pressable, ViewStyle, TextStyle } from "react-native"
import { PlusIcon } from "lucide-react-native"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { View } from "@/components/View"
import { useDBVitals } from "@/hooks/useDBVitals"
import { translate } from "@/i18n/translate"
import PatientVitals from "@/models/PatientVitals"
import { PatientStackScreenProps } from "@/navigators/PatientNavigator"
import { colors } from "@/theme/colors"
// import { useNavigation } from "@react-navigation/native"

interface VitalHistoryScreenProps extends PatientStackScreenProps<"VitalHistory"> {}

export const VitalHistoryScreen: FC<VitalHistoryScreenProps> = ({ navigation, route }) => {
  const { patientId } = route.params
  const patientVitals = useDBVitals(patientId)
  const openEventForm = () => {
    navigation.navigate("VitalForm", { patientId })
  }

  return (
    <>
      <Screen style={$root} preset="scroll">
        {/*<View style={$chartContainer}>
          <Text text="vitalHistory" />
        </View>*/}

        <View style={$vitalTimelineContainer}>
          {patientVitals.map((vital) => (
            <VitalEntry key={vital.id} vital={vital} />
          ))}
        </View>
      </Screen>
      <Pressable onPress={openEventForm} style={$newVisitFAB}>
        <PlusIcon color={"white"} size={20} style={$fabIcon} />
        <Text color="white" size="sm" text={translate("vitalHistory:newEntry")} />
      </Pressable>
    </>
  )
}

/**
 * Vital historical entry
 *
 */
function VitalEntry({ vital }: { vital: PatientVitals.DB.T }) {
  const formattedDate = new Date(vital.timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  // Helper to get value from Option
  const getValue = (opt: any) => {
    if (opt && typeof opt === "object" && "_tag" in opt) {
      return opt._tag === "Some" ? opt.value : null
    }
    return opt
  }

  const systolic = getValue(vital.systolicBp)
  const diastolic = getValue(vital.diastolicBp)
  const bpPosition = getValue(vital.bpPosition)
  const pulseRate = getValue(vital.pulseRate)
  const temperature = getValue(vital.temperatureCelsius)
  const oxygenSat = getValue(vital.oxygenSaturation)
  const respRate = getValue(vital.respiratoryRate)
  const painLevel = getValue(vital.painLevel)
  const height = getValue(vital.heightCm)
  const weight = getValue(vital.weightKg)
  const bmi = getValue(vital.bmi)
  const waist = getValue(vital.waistCircumferenceCm)

  // Determine color styles based on values
  const oxygenSatColor = oxygenSat && oxygenSat < 95 ? $alertText : $valueText
  const painLevelColor = painLevel && painLevel > 7 ? $alertText : $valueText
  const bmiColor = bmi
    ? bmi < 18.5 || bmi > 30
      ? $alertText
      : bmi > 25
        ? $warningText
        : $valueText
    : $valueText

  return (
    <View p={12} mb={12} style={$vitalEntryCard}>
      {/* Date Header */}
      <View mb={8}>
        <Text text={formattedDate} size="xs" style={$dateText} />
      </View>

      {/* Vital Readings Grid */}
      <View gap={8}>
        {/* Blood Pressure */}
        {(systolic || diastolic) && (
          <View direction="row" justifyContent="space-between" alignItems="center">
            <Text text={translate("common:bloodPressure")} size="sm" style={$labelText} />
            <View alignItems="flex-end">
              <Text
                text={`${systolic || "--"}/${diastolic || "--"} mmHg`}
                size="sm"
                preset="bold"
                style={$valueText}
              />
              {bpPosition && <Text text={`(${bpPosition})`} size="xs" style={$secondaryText} />}
            </View>
          </View>
        )}

        {/* Pulse Rate */}
        {pulseRate && (
          <View direction="row" justifyContent="space-between" alignItems="center">
            <Text text={translate("common:pulseRate")} size="sm" style={$labelText} />
            <Text text={`${pulseRate} bpm`} size="sm" preset="bold" style={$valueText} />
          </View>
        )}

        {/* Temperature */}
        {temperature && (
          <View direction="row" justifyContent="space-between" alignItems="center">
            <Text text={translate("common:temperature")} size="sm" style={$labelText} />
            <Text
              text={`${temperature.toFixed(1)}°C / ${((temperature * 9) / 5 + 32).toFixed(1)}°F`}
              size="sm"
              preset="bold"
              style={$valueText}
            />
          </View>
        )}

        {/* Oxygen Saturation */}
        {oxygenSat && (
          <View direction="row" justifyContent="space-between" alignItems="center">
            <Text text={translate("common:oxygenSaturation")} size="sm" style={$labelText} />
            <Text text={`${oxygenSat}%`} size="sm" preset="bold" style={oxygenSatColor} />
          </View>
        )}

        {/* Respiratory Rate */}
        {respRate && (
          <View direction="row" justifyContent="space-between" alignItems="center">
            <Text text={translate("common:respiratoryRate")} size="sm" style={$labelText} />
            <Text text={`${respRate} bpm`} size="sm" preset="bold" style={$valueText} />
          </View>
        )}

        {/* Pain Level */}
        {painLevel !== null && painLevel !== undefined && (
          <View direction="row" justifyContent="space-between" alignItems="center">
            <Text text={translate("common:painLevel")} size="sm" style={$labelText} />
            <Text text={`${painLevel}/10`} size="sm" preset="bold" style={painLevelColor} />
          </View>
        )}

        {/* Anthropometric Measurements Section */}
        {(height || weight || bmi || waist) && (
          <>
            {/*<View style={$divider} />*/}

            {/* Height */}
            {height && (
              <View direction="row" justifyContent="space-between" alignItems="center">
                <Text text={translate("common:height")} size="sm" style={$labelText} />
                <Text text={`${height} cm`} size="sm" preset="bold" style={$valueText} />
              </View>
            )}

            {/* Weight */}
            {weight && (
              <View direction="row" justifyContent="space-between" alignItems="center">
                <Text text={translate("common:weight")} size="sm" style={$labelText} />
                <Text text={`${weight} kg`} size="sm" preset="bold" style={$valueText} />
              </View>
            )}

            {/* BMI */}
            {bmi && (
              <View direction="row" justifyContent="space-between" alignItems="center">
                <Text text={translate("common:bmi")} size="sm" style={$labelText} />
                <Text text={`${bmi.toFixed(1)} kg/m²`} size="sm" preset="bold" style={bmiColor} />
              </View>
            )}

            {/* Waist Circumference */}
            {waist && (
              <View direction="row" justifyContent="space-between" alignItems="center">
                <Text text={translate("common:waistCircumference")} size="sm" style={$labelText} />
                <Text text={`${waist} cm`} size="sm" preset="bold" style={$valueText} />
              </View>
            )}
          </>
        )}
      </View>
    </View>
  )
}

const $root: ViewStyle = {
  flex: 1,
  paddingHorizontal: 14,
}

const $chartContainer: ViewStyle = {
  height: 200,
  backgroundColor: colors.palette.neutral300,
}

const $newVisitFAB: ViewStyle = {
  display: "flex",
  flexDirection: "row",
  position: "absolute",
  bottom: 60,
  right: 24,
  elevation: 4,
  zIndex: 100,
  borderRadius: 10,
  padding: 14,
  backgroundColor: colors.palette.primary500,
  justifyContent: "center",
  alignItems: "center",
}

const $fabIcon: ViewStyle = {
  marginRight: 10,
}

const $vitalTimelineContainer: ViewStyle = {
  // padding: 14,
}

const $vitalEntryCard: ViewStyle = {
  // backgroundColor: colors.background,
  // borderRadius: 8,
  // elevation: 2,
  // shadowColor: colors.palette.neutral800,
  // shadowOffset: { width: 0, height: 2 },
  // shadowOpacity: 0.1,
  // shadowRadius: 3,
  borderBottomColor: colors.palette.neutral300,
  borderBottomWidth: 1,
  paddingVertical: 16,
}

const $dateText: TextStyle = {
  color: colors.textDim,
}

const $labelText: TextStyle = {
  color: colors.text,
}

const $valueText: TextStyle = {
  color: colors.palette.neutral900,
}

const $secondaryText: TextStyle = {
  color: colors.textDim,
}

const $alertText: TextStyle = {
  color: colors.error,
}

const $warningText: TextStyle = {
  color: colors.palette.accent500,
}

const $divider: ViewStyle = {
  borderTopWidth: 1,
  borderTopColor: colors.separator,
  marginTop: 4,
}
