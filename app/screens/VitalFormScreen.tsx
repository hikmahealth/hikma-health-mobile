import { FC, useState, useMemo } from "react"
import { ViewStyle, TextStyle, ScrollView, Alert } from "react-native"
import { useSelector } from "@xstate/react"
import { Option } from "effect"

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { Radio } from "@/components/Toggle/Radio"
import { View } from "@/components/View"
import PatientVitals from "@/models/PatientVitals"
import { PatientStackScreenProps } from "@/navigators/PatientNavigator"
import { providerStore } from "@/store/provider"
import { spacing } from "@/theme/spacing"

interface VitalFormScreenProps extends PatientStackScreenProps<"VitalForm"> {}

interface VitalsState {
  systolicBp: string
  diastolicBp: string
  bpPosition: "sitting" | "standing" | "lying" | ""
  pulseRate: string
  temperature: string
  temperatureUnit: "celsius" | "fahrenheit"
  oxygenSaturation: string
  respiratoryRate: string
  painLevel: string
  waistCircumference: string
  heightCm: string
  weightKg: string
}

export const VitalFormScreen: FC<VitalFormScreenProps> = ({ route, navigation }) => {
  const { patientId } = route.params
  const providerId = useSelector(providerStore, (state) => state.context.id)

  const [vitals, setVitals] = useState<VitalsState>({
    systolicBp: "",
    diastolicBp: "",
    bpPosition: "",
    pulseRate: "",
    temperature: "",
    // setting to empty to show it was not interacted with
    // @ts-ignore
    temperatureUnit: "",
    oxygenSaturation: "",
    respiratoryRate: "",
    painLevel: "",
    waistCircumference: "",
    heightCm: "",
    weightKg: "",
  })

  const [errors, setErrors] = useState<Partial<Record<keyof VitalsState, string>>>({})

  // Calculate BMI when height and weight are available
  const bmi = useMemo(() => {
    const height = parseFloat(vitals.heightCm)
    const weight = parseFloat(vitals.weightKg)
    if (height > 0 && weight > 0) {
      const heightInMeters = height / 100
      return (weight / (heightInMeters * heightInMeters)).toFixed(1)
    }
    return null
  }, [vitals.heightCm, vitals.weightKg])

  const updateVital = (
    key: keyof VitalsState,
    value: string | "sitting" | "standing" | "lying" | "celsius" | "fahrenheit",
  ) => {
    setVitals((prev) => ({ ...prev, [key]: value }))
    // Clear error when user starts typing
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
  }

  const validateVitals = (): boolean => {
    const newErrors: Partial<Record<keyof VitalsState, string>> = {}

    // Blood pressure validation
    if (vitals.systolicBp) {
      const systolic = parseFloat(vitals.systolicBp)
      if (isNaN(systolic) || systolic < 70 || systolic > 250) {
        newErrors.systolicBp = "Systolic BP should be between 70-250 mmHg"
      }
    }

    if (vitals.diastolicBp) {
      const diastolic = parseFloat(vitals.diastolicBp)
      if (isNaN(diastolic) || diastolic < 40 || diastolic > 150) {
        newErrors.diastolicBp = "Diastolic BP should be between 40-150 mmHg"
      }
    }

    // If BP values are entered, position should be selected
    if ((vitals.systolicBp || vitals.diastolicBp) && !vitals.bpPosition) {
      newErrors.bpPosition = "Please select BP position"
    }

    // Pulse rate validation
    if (vitals.pulseRate) {
      const pulse = parseFloat(vitals.pulseRate)
      if (isNaN(pulse) || pulse < 30 || pulse > 250) {
        newErrors.pulseRate = "Pulse rate should be between 30-250 bpm"
      }
    }

    // Temperature validation
    if (vitals.temperature) {
      const temp = parseFloat(vitals.temperature)
      if (vitals.temperatureUnit === "celsius") {
        if (isNaN(temp) || temp < 30 || temp > 45) {
          newErrors.temperature = "Temperature should be between 30-45°C"
        }
      } else {
        if (isNaN(temp) || temp < 86 || temp > 113) {
          newErrors.temperature = "Temperature should be between 86-113°F"
        }
      }
    }

    // Oxygen saturation validation
    if (vitals.oxygenSaturation) {
      const o2 = parseFloat(vitals.oxygenSaturation)
      if (isNaN(o2) || o2 < 50 || o2 > 100) {
        newErrors.oxygenSaturation = "Oxygen saturation should be between 50-100%"
      }
    }

    // Respiratory rate validation
    if (vitals.respiratoryRate) {
      const rr = parseFloat(vitals.respiratoryRate)
      if (isNaN(rr) || rr < 5 || rr > 60) {
        newErrors.respiratoryRate = "Respiratory rate should be between 5-60 bpm"
      }
    }

    // Pain level validation
    if (vitals.painLevel) {
      const pain = parseFloat(vitals.painLevel)
      if (isNaN(pain) || pain < 0 || pain > 10) {
        newErrors.painLevel = "Pain level should be between 0-10"
      }
    }

    // Waist circumference validation
    if (vitals.waistCircumference) {
      const waist = parseFloat(vitals.waistCircumference)
      if (isNaN(waist) || waist < 40 || waist > 200) {
        newErrors.waistCircumference = "Waist circumference should be between 40-200 cm"
      }
    }

    // Height validation
    if (vitals.heightCm) {
      const height = parseFloat(vitals.heightCm)
      if (isNaN(height) || height < 50 || height > 250) {
        newErrors.heightCm = "Height should be between 50-250 cm"
      }
    }

    // Weight validation
    if (vitals.weightKg) {
      const weight = parseFloat(vitals.weightKg)
      if (isNaN(weight) || weight < 1 || weight > 300) {
        newErrors.weightKg = "Weight should be between 1-300 kg"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const save = async () => {
    if (!validateVitals()) {
      Alert.alert("Validation Error", "Please correct the errors before saving")
      return
    }

    // Convert temperature to celsius if needed
    let temperatureCelsius: number | null = null
    if (vitals.temperature) {
      const temp = parseFloat(vitals.temperature)
      if (vitals.temperatureUnit === "fahrenheit") {
        temperatureCelsius = ((temp - 32) * 5) / 9
      } else {
        temperatureCelsius = temp
      }
    }

    const vitalData: Omit<PatientVitals.T, "id" | "createdAt" | "updatedAt" | "deletedAt"> = {
      patientId: patientId,
      visitId: Option.none(), // TODO: Pass visitId if available from route params
      timestamp: new Date(),
      systolicBp: vitals.systolicBp ? Option.some(parseFloat(vitals.systolicBp)) : Option.none(),
      diastolicBp: vitals.diastolicBp ? Option.some(parseFloat(vitals.diastolicBp)) : Option.none(),
      bpPosition: vitals.bpPosition
        ? Option.some(vitals.bpPosition as PatientVitals.BPPosition)
        : Option.none(),
      pulseRate: vitals.pulseRate ? Option.some(parseFloat(vitals.pulseRate)) : Option.none(),
      temperatureCelsius: temperatureCelsius ? Option.some(temperatureCelsius) : Option.none(),
      oxygenSaturation: vitals.oxygenSaturation
        ? Option.some(parseFloat(vitals.oxygenSaturation))
        : Option.none(),
      respiratoryRate: vitals.respiratoryRate
        ? Option.some(parseFloat(vitals.respiratoryRate))
        : Option.none(),
      painLevel: vitals.painLevel ? Option.some(parseFloat(vitals.painLevel)) : Option.none(),
      waistCircumferenceCm: vitals.waistCircumference
        ? Option.some(parseFloat(vitals.waistCircumference))
        : Option.none(),
      heightCm: vitals.heightCm ? Option.some(parseFloat(vitals.heightCm)) : Option.none(),
      weightKg: vitals.weightKg ? Option.some(parseFloat(vitals.weightKg)) : Option.none(),
      bmi: bmi ? Option.some(parseFloat(bmi)) : Option.none(),
      heartRate: Option.none(), // Not collected in this form
      recordedByUserId: Option.some(providerId), // TODO: Get from current user context
      metadata: {},
      isDeleted: false,
    }

    try {
      const vitalId = await PatientVitals.DB.create(vitalData)
      console.log("Vitals saved with ID:", vitalId)

      Alert.alert("Success", "Vitals saved successfully", [
        { text: "OK", onPress: () => navigation.goBack() },
      ])
    } catch (error) {
      console.error("Error saving vitals:", error)
      Alert.alert("Error", "Failed to save vitals. Please try again.")
    }
  }

  return (
    <Screen style={$root} preset="scroll">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={$section}>
          {/* Blood Pressure Section */}
          <View mb={0}>
            <Text text="Blood Pressure" preset="formLabel" style={$label} />
            <View style={$bpRow}>
              <View style={$bpInput}>
                <TextField
                  placeholder="Systolic"
                  value={vitals.systolicBp}
                  onChangeText={(text) => updateVital("systolicBp", text)}
                  keyboardType="numeric"
                  helper={errors.systolicBp}
                  status={errors.systolicBp ? "error" : undefined}
                  label="Systolic (mmHg)"
                />
              </View>
              <Text text="/" style={$bpSeparator} />
              <View style={$bpInput}>
                <TextField
                  placeholder="Diastolic"
                  value={vitals.diastolicBp}
                  onChangeText={(text) => updateVital("diastolicBp", text)}
                  keyboardType="numeric"
                  helper={errors.diastolicBp}
                  status={errors.diastolicBp ? "error" : undefined}
                  label="Diastolic (mmHg)"
                />
              </View>
            </View>

            {/* BP Position Radio Group */}
            <View style={$radioGroup} mt={0} mb={10}>
              <Text text="BP Reading Position" preset="formLabel" style={$radioGroupLabel} />
              <Radio
                label="Sitting"
                value={vitals.bpPosition === "sitting"}
                onPress={() => updateVital("bpPosition", "sitting")}
              />
              <Radio
                label="Standing"
                value={vitals.bpPosition === "standing"}
                onPress={() => updateVital("bpPosition", "standing")}
              />
              <Radio
                label="Lying"
                value={vitals.bpPosition === "lying"}
                onPress={() => updateVital("bpPosition", "lying")}
              />
              {errors.bpPosition && <Text text={errors.bpPosition} size="xs" style={$errorText} />}
            </View>
          </View>

          {/* Pulse Rate */}
          <View mb={spacing.md} mt={20}>
            <TextField
              label="Pulse Rate (bpm)"
              placeholder="Enter pulse rate"
              value={vitals.pulseRate}
              onChangeText={(text) => updateVital("pulseRate", text)}
              keyboardType="numeric"
              helper={errors.pulseRate || ""}
              status={errors.pulseRate ? "error" : undefined}
            />
          </View>

          {/* Temperature */}
          <View mb={spacing.md}>
            <TextField
              label={`Temperature (°${vitals.temperatureUnit === "celsius" ? "C" : "F"})`}
              placeholder="Enter temperature"
              value={vitals.temperature}
              onChangeText={(text) => updateVital("temperature", text)}
              keyboardType="decimal-pad"
              helper={errors.temperature}
              status={errors.temperature ? "error" : undefined}
            />
            <View direction="row" pt={8}>
              <View flex={1}>
                <Radio
                  label="Celsius"
                  value={vitals.temperatureUnit === "celsius"}
                  onPress={() => updateVital("temperatureUnit", "celsius")}
                />
              </View>
              <View flex={1}>
                <Radio
                  label="Fahrenheit"
                  value={vitals.temperatureUnit === "fahrenheit"}
                  onPress={() => updateVital("temperatureUnit", "fahrenheit")}
                />
              </View>
            </View>
          </View>

          {/* Oxygen Saturation */}
          <View mb={spacing.md}>
            <TextField
              label="Oxygen Saturation (%)"
              placeholder="Enter oxygen saturation"
              value={vitals.oxygenSaturation}
              onChangeText={(text) => updateVital("oxygenSaturation", text)}
              keyboardType="numeric"
              status={errors.oxygenSaturation ? "error" : undefined}
            />
          </View>

          {/* Respiratory Rate */}
          <View mb={spacing.md}>
            <TextField
              label="Respiratory Rate (bpm)"
              placeholder="Enter respiratory rate"
              value={vitals.respiratoryRate}
              onChangeText={(text) => updateVital("respiratoryRate", text)}
              keyboardType="numeric"
              helper={errors.respiratoryRate || ""}
              status={errors.respiratoryRate ? "error" : undefined}
            />
          </View>

          {/* Pain Level */}
          <View mb={spacing.md}>
            <TextField
              label="Pain Level (0-10)"
              placeholder="Enter pain level"
              value={vitals.painLevel}
              onChangeText={(text) => updateVital("painLevel", text)}
              keyboardType="numeric"
              helper={errors.painLevel || "0 = No pain, 10 = Worst pain"}
              status={errors.painLevel ? "error" : undefined}
            />
          </View>

          {/* Anthropometric Measurements */}
          <Text text="Measurements" preset="formLabel" style={$sectionSubtitle} />

          {/* Height */}
          <View mb={spacing.md}>
            <TextField
              label="Height (cm)"
              placeholder="Enter height"
              value={vitals.heightCm}
              onChangeText={(text) => updateVital("heightCm", text)}
              keyboardType="numeric"
              helper={errors.heightCm || ""}
              status={errors.heightCm ? "error" : undefined}
            />
          </View>

          {/* Weight */}
          <View mb={spacing.md}>
            <TextField
              label="Weight (kg)"
              placeholder="Enter weight"
              value={vitals.weightKg}
              onChangeText={(text) => updateVital("weightKg", text)}
              keyboardType="decimal-pad"
              helper={errors.weightKg || ""}
              status={errors.weightKg ? "error" : undefined}
            />
          </View>

          {/* BMI Display */}
          {bmi && (
            <View style={$bmiDisplay}>
              <Text text="BMI:" preset="formLabel" />
              <Text text={` ${bmi} kg/m²`} preset="bold" />
            </View>
          )}

          {/* Waist Circumference */}
          <View mb={spacing.md}>
            <TextField
              label="Waist Circumference (cm)"
              placeholder="Enter waist circumference"
              value={vitals.waistCircumference}
              onChangeText={(text) => updateVital("waistCircumference", text)}
              keyboardType="numeric"
              helper={errors.waistCircumference || ""}
              status={errors.waistCircumference ? "error" : undefined}
            />
          </View>

          <View style={$buttonContainer}>
            <Button
              text="Cancel"
              preset="default"
              onPress={() => navigation.goBack()}
              style={$button}
            />
            <Button text="Save" preset="filled" onPress={save} style={$button} />
          </View>
        </View>
      </ScrollView>
    </Screen>
  )
}

const $root: ViewStyle = {
  flex: 1,
  backgroundColor: "#F5F5F5",
}

const $section: ViewStyle = {
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.lg,
}

const $sectionSubtitle: TextStyle = {
  marginTop: spacing.lg,
  marginBottom: spacing.md,
}

const $label: TextStyle = {
  marginBottom: spacing.xs,
}

const $bpRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: spacing.sm,
}

const $bpInput: ViewStyle = {
  flex: 1,
}

const $bpSeparator: TextStyle = {
  fontSize: 24,
  paddingHorizontal: spacing.xs,
  paddingTop: spacing.md,
}

const $radioGroup: ViewStyle = {
  marginTop: spacing.sm,
  gap: spacing.xs,
}

const $radioGroupLabel: TextStyle = {
  marginBottom: spacing.xs,
}

const $errorText: TextStyle = {
  color: "#D32F2F",
  marginTop: spacing.xs,
}

const $bmiDisplay: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  backgroundColor: "#E3F2FD",
  borderRadius: 8,
  marginBottom: spacing.md,
}

const $buttonContainer: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: spacing.xl,
  gap: spacing.md,
}

const $button: ViewStyle = {
  flex: 1,
}
