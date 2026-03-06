import { FC, useEffect, useState } from "react"
import { Pressable, ViewStyle, TextStyle, ScrollView, Alert } from "react-native"
import { Option } from "effect"

import Toast from "react-native-root-toast"

import { Button } from "@/components/Button"
import { DatePickerButton } from "@/components/DatePicker"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { Radio } from "@/components/Toggle/Radio"
import { View } from "@/components/View"
import database from "@/db"
import PatientProblemModel from "@/db/model/PatientProblems"
import { usePermissionGuard } from "@/hooks/usePermissionGuard"
import { useUpdateProblem } from "@/hooks/useUpdateProblem"
import { useDataAccess } from "@/providers/DataAccessProvider"
import PatientProblems from "@/models/PatientProblems"
import { PatientStackScreenProps } from "@/navigators/PatientNavigator"
import { colors } from "@/theme/colors"
import { spacing } from "@/theme/spacing"

const CLINICAL_STATUSES: PatientProblems.ClinicalStatus[] = [
  "active",
  "remission",
  "resolved",
  "unknown",
]

const VERIFICATION_STATUSES: PatientProblems.VerificationStatus[] = [
  "provisional",
  "confirmed",
  "refuted",
  "unconfirmed",
]

const clinicalStatusLabels: Record<PatientProblems.ClinicalStatus, string> = {
  active: "Active",
  remission: "Remission",
  resolved: "Resolved",
  unknown: "Unknown",
}

const verificationStatusLabels: Record<PatientProblems.VerificationStatus, string> = {
  provisional: "Provisional",
  confirmed: "Confirmed",
  refuted: "Refuted",
  unconfirmed: "Unconfirmed",
}

interface PatientDiagnosisEditorScreenProps
  extends PatientStackScreenProps<"PatientDiagnosisEditor"> {}

export const PatientDiagnosisEditorScreen: FC<PatientDiagnosisEditorScreenProps> = ({
  navigation,
  route,
}) => {
  const { problemId } = route.params
  const { can } = usePermissionGuard()
  const { isOnline, provider } = useDataAccess()
  const updateProblemMutation = useUpdateProblem()

  const [loading, setLoading] = useState(true)
  const [problemLabel, setProblemLabel] = useState("")
  const [problemCode, setProblemCode] = useState("")
  const [clinicalStatus, setClinicalStatus] = useState<PatientProblems.ClinicalStatus>("active")
  const [verificationStatus, setVerificationStatus] =
    useState<PatientProblems.VerificationStatus>("provisional")
  const [severityScore, setSeverityScore] = useState("")
  const [onsetDate, setOnsetDate] = useState<Date>(new Date())
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [showEndDate, setShowEndDate] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadProblem = async () => {
      try {
        if (isOnline) {
          const result = await provider.problems.getById(problemId)
          if (!result.ok || !result.data) {
            throw new Error("Problem not found")
          }
          const record = result.data
          setProblemLabel(record.problemLabel)
          setProblemCode(record.problemCode)
          setClinicalStatus(record.clinicalStatus)
          setVerificationStatus(record.verificationStatus)
          setSeverityScore(
            Option.isSome(record.severityScore) ? String(record.severityScore.value) : "",
          )
          const onset = Option.getOrNull(record.onsetDate)
          if (onset) setOnsetDate(new Date(onset))
          const end = Option.getOrNull(record.endDate)
          if (end) {
            setEndDate(new Date(end))
            setShowEndDate(true)
          }
        } else {
          const record = await database
            .get<PatientProblemModel>("patient_problems")
            .find(problemId)
          setProblemLabel(record.problemLabel)
          setProblemCode(record.problemCode)
          setClinicalStatus(record.clinicalStatus as PatientProblems.ClinicalStatus)
          setVerificationStatus(record.verificationStatus as PatientProblems.VerificationStatus)
          setSeverityScore(record.severityScore != null ? String(record.severityScore) : "")
          if (record.onsetDate) setOnsetDate(new Date(record.onsetDate))
          if (record.endDate) {
            setEndDate(new Date(record.endDate))
            setShowEndDate(true)
          }
        }
        setLoading(false)
      } catch (err) {
        console.error("Error loading diagnosis:", err)
        Alert.alert("Error", "Could not load diagnosis.")
        navigation.goBack()
      }
    }
    loadProblem()
  }, [problemId, isOnline])

  const validateAndSave = async () => {
    if (!can("diagnosis:edit")) {
      return Toast.show("You do not have permission to edit diagnoses", {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
      })
    }
    if (severityScore) {
      const score = parseInt(severityScore, 10)
      if (isNaN(score) || score < 1 || score > 10) {
        Alert.alert("Validation Error", "Severity score must be between 1 and 10.")
        return
      }
    }

    if (saving) return
    setSaving(true)

    try {
      const score = severityScore ? parseInt(severityScore, 10) : null

      await updateProblemMutation.mutateAsync({
        id: problemId,
        data: {
          clinicalStatus,
          verificationStatus,
          severityScore: Option.fromNullable(score),
          onsetDate: Option.some(onsetDate),
          endDate: Option.fromNullable(endDate),
        },
      })

      navigation.goBack()
    } catch (error) {
      console.error("Error updating diagnosis:", error)
      Alert.alert("Error", "Failed to update diagnosis. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Screen style={$root}>
        <View pt={40} alignItems="center">
          <Text text="Loading..." color={colors.textDim} />
        </View>
      </Screen>
    )
  }

  return (
    <Screen style={$root} preset="scroll">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={$formContainer}>
          {/* Diagnosis header (read-only) */}
          <View mb={spacing.md} style={$selectedHeader}>
            <Text text={problemLabel} size="lg" preset="bold" />
            <Text text={problemCode} size="sm" color={colors.textDim} />
          </View>

          {/* Clinical Status */}
          <View mb={spacing.md}>
            <Text text="Clinical Status" preset="formLabel" style={$label} />
            <View style={$radioGroup}>
              {CLINICAL_STATUSES.map((status) => (
                <Radio
                  key={status}
                  label={clinicalStatusLabels[status]}
                  value={clinicalStatus === status}
                  onPress={() => setClinicalStatus(status)}
                />
              ))}
            </View>
          </View>

          {/* Verification Status */}
          <View mb={spacing.md}>
            <Text text="Verification Status" preset="formLabel" style={$label} />
            <View style={$radioGroup}>
              {VERIFICATION_STATUSES.map((status) => (
                <Radio
                  key={status}
                  label={verificationStatusLabels[status]}
                  value={verificationStatus === status}
                  onPress={() => setVerificationStatus(status)}
                />
              ))}
            </View>
          </View>

          {/* Severity Score */}
          <View mb={spacing.md}>
            <TextField
              label="Severity Score (1-10)"
              placeholder="Optional"
              value={severityScore}
              onChangeText={setSeverityScore}
              keyboardType="numeric"
            />
          </View>

          {/* Onset Date */}
          <View mb={spacing.md}>
            <Text text="Onset Date" preset="formLabel" style={$label} />
            <DatePickerButton
              date={onsetDate}
              onDateChange={setOnsetDate}
              maximumDate={new Date()}
            />
          </View>

          {/* End Date (optional) */}
          <View mb={spacing.md}>
            <Pressable
              onPress={() => {
                if (showEndDate) {
                  setEndDate(null)
                  setShowEndDate(false)
                } else {
                  setEndDate(new Date())
                  setShowEndDate(true)
                }
              }}
            >
              <Text
                text={showEndDate ? "Remove End Date" : "+ Add End Date"}
                color={colors.palette.primary500}
                textDecorationLine="underline"
              />
            </Pressable>
            {showEndDate && endDate && (
              <View mt={spacing.xs}>
                <DatePickerButton
                  date={endDate}
                  onDateChange={setEndDate}
                  minimumDate={onsetDate}
                  maximumDate={new Date()}
                />
              </View>
            )}
          </View>

          {/* Action buttons */}
          <View style={$buttonContainer}>
            <Button
              text="Cancel"
              preset="default"
              onPress={() => navigation.goBack()}
              style={$button}
            />
            <Button
              text="Save"
              preset="filled"
              onPress={validateAndSave}
              style={$button}
              disabled={saving}
            />
          </View>
        </View>
      </ScrollView>
    </Screen>
  )
}

const $root: ViewStyle = {
  flex: 1,
}

const $formContainer: ViewStyle = {
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.lg,
}

const $selectedHeader: ViewStyle = {
  paddingBottom: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral300,
}

const $label: TextStyle = {
  marginBottom: spacing.xs,
}

const $radioGroup: ViewStyle = {
  gap: spacing.xs,
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
