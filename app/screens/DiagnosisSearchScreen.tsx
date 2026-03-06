import { FC, useState } from "react"
import { Pressable, ViewStyle, TextStyle, ScrollView, Alert } from "react-native"
import MiniSearch, { SearchResult } from "minisearch"
import { useSelector } from "@xstate/react"
import { Option } from "effect"

import Toast from "react-native-root-toast"

import { Button } from "@/components/Button"
import { DatePickerButton } from "@/components/DatePicker"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { Radio } from "@/components/Toggle/Radio"
import { View } from "@/components/View"
import icd11Xs from "@/data/icd11-xs"
import { useDebounce } from "@/hooks/useDebounce"
import { usePermissionGuard } from "@/hooks/usePermissionGuard"
import { useCreateProblem } from "@/hooks/useCreateProblem"
import PatientProblems from "@/models/PatientProblems"
import { PatientStackScreenProps } from "@/navigators/PatientNavigator"
import { providerStore } from "@/store/provider"
import { colors } from "@/theme/colors"
import { spacing } from "@/theme/spacing"
import { translate } from "@/i18n/translate"

const miniSearch = new MiniSearch({
  fields: ["desc", "code"],
  storeFields: ["desc", "code"],
  idField: "code",
  searchOptions: {
    fuzzy: 1,
    boost: {
      desc: 5,
      code: 1,
    },
  },
})

miniSearch.addAll(icd11Xs)

type SelectedDiagnosis = { code: string; label: string }

interface DiagnosisSearchScreenProps extends PatientStackScreenProps<"DiagnosisSearch"> {}

export const DiagnosisSearchScreen: FC<DiagnosisSearchScreenProps> = ({ navigation, route }) => {
  const { patientId } = route.params
  const providerId = useSelector(providerStore, (state) => state.context.id)
  const { can } = usePermissionGuard()
  const createProblemMutation = useCreateProblem()

  // Step 1: search, Step 2: details form
  const [selected, setSelected] = useState<SelectedDiagnosis | null>(null)

  if (selected) {
    return (
      <DiagnosisDetailsForm
        diagnosis={selected}
        patientId={patientId}
        providerId={providerId}
        canCreateDiagnosis={can("diagnosis:create")}
        createProblemMutation={createProblemMutation}
        onBack={() => setSelected(null)}
        onSaved={() => navigation.goBack()}
      />
    )
  }

  return <DiagnosisSearchStep onSelect={setSelected} />
}

// ---------------------------------------------------------------------------
// Step 1: Search
// ---------------------------------------------------------------------------

function DiagnosisSearchStep({ onSelect }: { onSelect: (diagnosis: SelectedDiagnosis) => void }) {
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedQuery = useDebounce(searchQuery, 400)
  const searchResults = debouncedQuery.length > 0 ? miniSearch.search(debouncedQuery) : []

  return (
    <Screen style={$root} preset="scroll">
      <View px={14} pt={10}>
        <TextField
          placeholder={translate("diagnosisSearch:searchPlaceholder")}
          onChangeText={setSearchQuery}
          value={searchQuery}
          autoFocus
        />

        {searchResults.slice(0, 10).map((result) => (
          <Pressable
            key={result.code}
            onPress={() => onSelect({ code: result.code, label: result.desc })}
          >
            <View my={6} py={10} px={14} style={$resultItem}>
              <Text size="md" text={`${result.desc} (${result.code})`} />
            </View>
          </Pressable>
        ))}

        {searchQuery.length > 0 && (
          <Pressable onPress={() => onSelect({ code: "custom", label: searchQuery })}>
            <View my={6} py={10} px={14} style={$resultItem}>
              <Text size="md" text={`+ Create "${searchQuery}"`} />
            </View>
          </Pressable>
        )}

        {debouncedQuery.length > 0 && searchResults.length === 0 && (
          <View pt={20} alignItems="center">
            <Text
              text="No results found. You can create a custom diagnosis above."
              color={colors.textDim}
              size="sm"
            />
          </View>
        )}
      </View>
    </Screen>
  )
}

// ---------------------------------------------------------------------------
// Step 2: Details form
// ---------------------------------------------------------------------------

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

function DiagnosisDetailsForm({
  diagnosis,
  patientId,
  providerId,
  canCreateDiagnosis,
  createProblemMutation,
  onBack,
  onSaved,
}: {
  diagnosis: SelectedDiagnosis
  patientId: string
  providerId: string
  canCreateDiagnosis: boolean
  createProblemMutation: ReturnType<typeof useCreateProblem>
  onBack: () => void
  onSaved: () => void
}) {
  const [clinicalStatus, setClinicalStatus] = useState<PatientProblems.ClinicalStatus>("active")
  const [verificationStatus, setVerificationStatus] =
    useState<PatientProblems.VerificationStatus>("provisional")
  const [severityScore, setSeverityScore] = useState("")
  const [onsetDate, setOnsetDate] = useState<Date>(new Date())
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [showEndDate, setShowEndDate] = useState(false)
  const [saving, setSaving] = useState(false)

  const validateAndSave = async () => {
    if (!canCreateDiagnosis) {
      return Toast.show("You do not have permission to create diagnoses", {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
      })
    }
    // Validate severity score if provided
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

      await createProblemMutation.mutateAsync({
        patientId,
        visitId: Option.none(),
        problemCodeSystem: "icd11",
        problemCode: diagnosis.code,
        problemLabel: diagnosis.label,
        clinicalStatus,
        verificationStatus,
        severityScore: Option.fromNullable(score),
        onsetDate: Option.some(onsetDate),
        endDate: Option.fromNullable(endDate),
        recordedByUserId: Option.some(providerId),
        metadata: {},
        isDeleted: false,
      })

      onSaved()
    } catch (error) {
      console.error("Error saving diagnosis:", error)
      Alert.alert("Error", "Failed to save diagnosis. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen style={$root} preset="scroll">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={$formContainer}>
          {/* Selected diagnosis header */}
          <View mb={spacing.md} style={$selectedHeader}>
            <Text text={diagnosis.label} size="lg" preset="bold" />
            <Text text={diagnosis.code} size="sm" color={colors.textDim} />
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
            <Button text="Back" preset="default" onPress={onBack} style={$button} />
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

const $resultItem: ViewStyle = {
  backgroundColor: colors.palette.neutral300,
  borderRadius: 8,
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
