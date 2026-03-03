import { FC } from "react"
import { Pressable, ViewStyle, TextStyle } from "react-native"
import { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { Option } from "effect"
import { PlusIcon } from "lucide-react-native"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { View } from "@/components/View"
import PatientProblem from "@/db/model/PatientProblems"
import { useDBPatientProblems } from "@/hooks/useDBPatientProblems"
import { useDataAccess } from "@/providers/DataAccessProvider"
import { useProviderPatientProblems } from "@/hooks/useProviderPatientProblems"
import { translate } from "@/i18n/translate"
import PatientProblems from "@/models/PatientProblems"
import { PatientNavigatorParamList, PatientStackScreenProps } from "@/navigators/PatientNavigator"
import { colors } from "@/theme/colors"

interface DiagnosisHistoryScreenProps extends PatientStackScreenProps<"DiagnosisHistory"> {}

export const DiagnosisHistoryScreen: FC<DiagnosisHistoryScreenProps> = ({ navigation, route }) => {
  const { patientId } = route.params
  const { isOnline } = useDataAccess()
  const offlineProblems = useDBPatientProblems(patientId)
  const onlineProblemsQuery = useProviderPatientProblems(isOnline ? patientId : null)
  const problems = isOnline ? (onlineProblemsQuery.data ?? []) : offlineProblems

  const openDiagnosisSearch = () => {
    navigation.navigate("DiagnosisSearch", { patientId })
  }

  return (
    <>
      <Screen style={$root} preset="scroll">
        <View style={$timelineContainer}>
          {problems.length === 0 ? (
            <View pt={40} alignItems="center">
              <Text
                text={translate("diagnosisHistory:noRecordedDiagnoses")}
                color={colors.textDim}
              />
            </View>
          ) : (
            problems.map((problem) => (
              <DiagnosisEntry key={problem.id} problem={problem} navigation={navigation} />
            ))
          )}
        </View>
      </Screen>
      <Pressable onPress={openDiagnosisSearch} style={$fab}>
        <PlusIcon color={"white"} size={20} style={$fabIcon} />
        <Text color="white" size="sm" text={translate("diagnosisHistory:newEntry")} />
      </Pressable>
    </>
  )
}

const statusColors: Record<string, string> = {
  active: colors.palette.primary500,
  remission: colors.palette.accent500,
  resolved: colors.palette.neutral500,
  unknown: colors.textDim,
}

function DiagnosisEntry({
  problem,
  navigation,
}: {
  problem: PatientProblem | PatientProblems.T
  navigation: NativeStackNavigationProp<PatientNavigatorParamList, "DiagnosisHistory">
}) {
  const formattedDate = problem.createdAt
    ? new Date(problem.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : ""

  // Handle both Option<Date> (domain type) and Date | undefined (WatermelonDB model)
  const rawOnset = problem.onsetDate
  const onsetDateValue =
    rawOnset && typeof rawOnset === "object" && "_tag" in rawOnset
      ? Option.getOrNull(rawOnset as Option.Option<Date>)
      : (rawOnset as Date | undefined)
  const onsetDateStr = onsetDateValue
    ? new Date(onsetDateValue).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null

  const statusColor = statusColors[problem.clinicalStatus] || colors.textDim

  return (
    <Pressable
      onPress={() => navigation.navigate("PatientDiagnosisEditor", { problemId: problem.id })}
    >
      <View p={12} mb={0} style={$entryCard}>
        {/* Date header */}
        <View mb={4}>
          <Text text={formattedDate} size="xs" style={$dateText} />
        </View>

        {/* Problem label and code */}
        <View mb={4}>
          <Text text={problem.problemLabel} size="sm" preset="bold" style={$labelText} />
          <Text
            text={`${problem.problemCodeSystem.toUpperCase()}: ${problem.problemCode}`}
            size="xs"
            style={$codeText}
          />
        </View>

        {/* Status and onset */}
        <View direction="row" justifyContent="space-between" alignItems="center">
          <View
            px={8}
            py={2}
            style={[
              $statusBadge,
              { backgroundColor: statusColor + "20", borderColor: statusColor },
            ]}
          >
            <Text
              text={
                problem.clinicalStatus.charAt(0).toUpperCase() + problem.clinicalStatus.slice(1)
              }
              size="xs"
              color={statusColor}
            />
          </View>
          {onsetDateStr && <Text text={`Onset: ${onsetDateStr}`} size="xs" style={$dateText} />}
        </View>
      </View>
    </Pressable>
  )
}

const $root: ViewStyle = {
  flex: 1,
  paddingHorizontal: 14,
}

const $timelineContainer: ViewStyle = {}

const $fab: ViewStyle = {
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

const $entryCard: ViewStyle = {
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

const $codeText: TextStyle = {
  color: colors.textDim,
}

const $statusBadge: ViewStyle = {
  borderRadius: 4,
  borderWidth: 1,
}
