import { FC, useEffect, useState } from "react"
import { Pressable, ViewStyle, TextStyle } from "react-native"
import { Q } from "@nozbe/watermelondb"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { Option } from "effect"
import {
  PlusIcon,
  PillIcon,
  ClockIcon,
  CalendarIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  PackageIcon,
  LucideFileCheck,
} from "lucide-react-native"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { View } from "@/components/View"
import database from "@/db"
import {
  compilePrescribedDrugs,
  enhancePrescribedDrugsItem,
  PrescribedDrug,
} from "@/db/enhancers/enhancePrescribedDrugsItem"
import { usePatientRecord } from "@/hooks/usePatientRecord"
import { translate } from "@/i18n/translate"
import DrugCatalogue from "@/models/DrugCatalogue"
import Patient from "@/models/Patient"
import Prescription from "@/models/Prescription"
import PrescriptionItem from "@/models/PrescriptionItem"
import { PharmacyNavigatorParamList } from "@/navigators/PharmacyNavigator"
import { colors } from "@/theme/colors"

interface PatientPrescriptionsListScreenProps
  extends NativeStackScreenProps<PharmacyNavigatorParamList, "PatientPrescriptionsList"> {}

/**
 * Hook to listen to patient prescriptions changes
 * @param patientId
 * @returns
 */
function useDBPatientPrescriptions(patientId: string) {
  const [prescriptions, setPrescriptions] = useState<Prescription.DB.T[]>([])
  useEffect(() => {
    const sub = database
      .get<Prescription.DB.T>("prescriptions")
      .query(Q.where("patient_id", patientId), Q.sortBy("updated_at", "desc"))
      .observe()
      .subscribe((prescriptions) => {
        setPrescriptions(prescriptions)
      })
    return () => sub.unsubscribe()
  }, [patientId])
  return {
    prescriptions,
  }
}

export const PatientPrescriptionsListScreen: FC<PatientPrescriptionsListScreenProps> = ({
  route,
  navigation,
}) => {
  const { patientId } = route.params

  const { patient } = usePatientRecord(patientId)

  const patientRecord = Option.match(patient, {
    onNone: () => ({ givenName: "", surname: "" }),
    onSome: (patient) => patient,
  })

  const patientName = Patient.displayName(patientRecord)

  const { prescriptions } = useDBPatientPrescriptions(patientId)

  const openPrescriptionForm = () => {
    navigation.navigate("PrescriptionEditorForm", {
      patientId,
      visitId: undefined,
      prescriptionId: undefined,
      shouldCreateNewVisit: false,
    })
  }

  const openPrescriptionDetails = (prescriptionId: string) => {
    navigation.navigate("PrescriptionView", { prescriptionId })
  }

  return (
    <>
      <Screen style={$root} preset="scroll">
        {/* Patient Header */}
        <View style={$patientHeader}>
          <Text text={patientName} preset="heading" size="md" />
          <Text
            text={`${prescriptions.filter((p) => p.status === Prescription.Status.PENDING).length} ${translate("prescriptions:pendingPrescriptions")}`}
            size="sm"
            style={$subHeaderText}
          />
        </View>

        {/* Prescriptions List */}
        <View style={$prescriptionsContainer}>
          {prescriptions.length === 0 ? (
            <View style={$emptyState}>
              <PillIcon size={48} color={colors.textDim} />
              <Text
                text={translate("prescriptions:noPrescriptions")}
                size="md"
                style={$emptyStateText}
              />
            </View>
          ) : (
            prescriptions.map((prescription) => (
              <PrescriptionCard
                key={prescription.id}
                prescription={prescription as Prescription.DB.T}
                onPress={() => openPrescriptionDetails(prescription.id!)}
              />
            ))
          )}
        </View>
      </Screen>

      {/* Floating Action Button */}
      <Pressable
        testID="new-patient-prescription"
        onPress={openPrescriptionForm}
        style={$newPrescriptionFAB}
      >
        <PlusIcon color={"white"} size={20} style={$fabIcon} />
        <Text color="white" size="sm" text={translate("prescriptions:newPrescription")} />
      </Pressable>
    </>
  )
}

/**
 * Prescription card component
 */
const PrescriptionCard = enhancePrescribedDrugsItem(
  ({
    prescription,
    prescriptionItems,
    drugs,
    onPress,
  }: {
    prescription: Prescription.DB.T
    prescriptionItems: PrescriptionItem.DB.T[] | null
    drugs: DrugCatalogue.DB.T[] | null
    onPress: () => void
  }) => {
    const formattedPrescribedDate = prescription.prescribedAt?.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })

    const formattedExpirationDate = prescription.expirationDate?.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })

    // Get status icon and style
    const getStatusDisplay = () => {
      switch (prescription.status) {
        case Prescription.Status.PENDING:
          return {
            icon: <ClockIcon size={16} color={colors.palette.accent500} />,
            style: $pendingStatus,
            text: translate("prescriptions:pending"),
          }
        case Prescription.Status.PREPARED:
          return {
            icon: <LucideFileCheck size={16} color={colors.palette.accent500} />,
            style: $preparedStatus,
            text: translate("prescriptions:prepared"),
          }
        case Prescription.Status.PICKED_UP:
          return {
            icon: <CheckCircleIcon size={16} color={colors.palette.success500} />,
            style: $filledStatus,
            text: translate("prescriptions:filled"),
          }
        case Prescription.Status.PARTIALLY_PICKED_UP:
          return {
            icon: <PackageIcon size={16} color={colors.palette.angry500} />,
            style: $partialStatus,
            text: translate("prescriptions:partiallyFilled"),
          }
        case Prescription.Status.CANCELLED:
          return {
            icon: <XCircleIcon size={16} color={colors.error} />,
            style: $cancelledStatus,
            text: translate("prescriptions:cancelled"),
          }
        case Prescription.Status.EXPIRED:
          return {
            icon: <AlertCircleIcon size={16} color={colors.error} />,
            style: $expiredStatus,
            text: translate("prescriptions:expired"),
          }
        default:
          return {
            icon: null,
            style: $defaultStatus,
            text: prescription.status,
          }
      }
    }

    const getPriorityDisplay = () => {
      switch (prescription.priority) {
        case Prescription.Priority.EMERGENCY:
          return { style: $urgentPriority, text: translate("prescriptions:urgent") }
        case Prescription.Priority.HIGH:
          return { style: $highPriority, text: translate("prescriptions:high") }
        case Prescription.Priority.NORMAL:
          return { style: $routinePriority, text: translate("prescriptions:normal") }
        case Prescription.Priority.LOW:
          return { style: $lowPriority, text: translate("prescriptions:low") }
        default:
          return { style: $routinePriority, text: prescription.priority }
      }
    }

    const statusDisplay = getStatusDisplay()
    const priorityDisplay = getPriorityDisplay()

    const prescribedDrugs = compilePrescribedDrugs(prescriptionItems || [], drugs || [])

    return (
      <Pressable onPress={onPress} style={$prescriptionCard}>
        {/* Header with status and priority */}
        <View direction="row" justifyContent="space-between" alignItems="flex-start" mb={8}>
          <View flex={1}>
            <View direction="row" alignItems="center" gap={8}>
              {statusDisplay.icon}
              <Text text={statusDisplay.text} size="sm" preset="bold" style={statusDisplay.style} />
            </View>
            <View direction="row" alignItems="center" gap={8} mt={4}>
              <View style={[priorityDisplay.style, $priorityBadge]}>
                <Text text={priorityDisplay.text} size="xs" color="white" />
              </View>
              <Text text={`Rx# ${prescription.id?.slice(-6)}`} size="xs" style={$rxNumber} />
            </View>
          </View>
        </View>

        {/* Dates */}
        <View gap={4} mb={8}>
          <View direction="row" alignItems="center" gap={8}>
            <CalendarIcon size={14} color={colors.textDim} />
            <Text
              text={`${translate("prescriptions:prescribed")}: ${formattedPrescribedDate}`}
              size="sm"
              style={$detailText}
            />
          </View>
          {prescription.filledAt && (
            <View direction="row" alignItems="center" gap={8}>
              <CheckCircleIcon size={14} color={colors.palette.success500} />
              <Text
                text={`${translate("prescriptions:filled")}: ${prescription.filledAt.toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  },
                )}`}
                size="sm"
                style={$detailText}
              />
            </View>
          )}
          <View direction="row" alignItems="center" gap={8}>
            <AlertCircleIcon size={14} color={colors.palette.accent500} />
            <Text
              text={`${translate("prescriptions:expires")}: ${formattedExpirationDate}`}
              size="sm"
              style={$detailText}
            />
          </View>
        </View>

        {/* Prescription Items */}
        <View style={$itemsSection}>
          <Text
            text={translate("prescriptions:medications")}
            size="sm"
            preset="bold"
            style={$sectionTitle}
          />
          {prescribedDrugs.map((presc) => (
            <PrescriptionItemEntry key={presc.item.id} prescription={presc} />
          ))}
        </View>

        {/* Notes */}
        {prescription.notes && prescription.notes.length > 0 && (
          <View mt={8} p={8} style={$notesSection}>
            <Text
              text={`${translate("prescriptions:notes")}: ${prescription.notes}`}
              size="sm"
              style={$notesText}
            />
          </View>
        )}
      </Pressable>
    )
  },
)

/**
 * Prescription item component
 */
const PrescriptionItemEntry = ({ prescription }: { prescription: PrescribedDrug }) => {
  const drugName = `${prescription.drug?.brandName} (${prescription.drug?.genericName})`

  return (
    <View style={$itemEntry}>
      <View direction="row" justifyContent="space-between" alignItems="flex-start">
        <View flex={1}>
          <Text text={drugName} size="sm" preset="bold" style={$drugName} />
          <Text text={prescription.item.dosageInstructions} size="xs" style={$dosageInstructions} />
        </View>
        <View alignItems="flex-end">
          <Text
            text={`${prescription.item.quantityDispensed}/${prescription.item.quantityPrescribed}`}
            size="xs"
            style={$quantityText}
          />
          {prescription.item.refillsAuthorized > 0 && (
            <Text
              text={`${translate("prescriptions:refills")}: ${prescription.item.refillsUsed}/${prescription.item.refillsAuthorized}`}
              size="xs"
              style={$refillText}
            />
          )}
        </View>
      </View>
    </View>
  )
}

// Styles
const $root: ViewStyle = {
  flex: 1,
  paddingHorizontal: 14,
}

const $patientHeader: ViewStyle = {
  paddingVertical: 16,
  borderBottomWidth: 1,
  borderBottomColor: colors.separator,
  marginBottom: 8,
}

const $subHeaderText: TextStyle = {
  color: colors.textDim,
  marginTop: 4,
}

const $prescriptionsContainer: ViewStyle = {
  paddingVertical: 8,
}

const $prescriptionCard: ViewStyle = {
  padding: 16,
  marginBottom: 12,
  backgroundColor: colors.background,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.border,
  shadowColor: colors.palette.neutral800,
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 1,
}

const $priorityBadge: ViewStyle = {
  paddingHorizontal: 8,
  paddingVertical: 2,
  borderRadius: 4,
}

const $urgentPriority: ViewStyle = {
  backgroundColor: colors.error,
}

const $highPriority: ViewStyle = {
  backgroundColor: colors.palette.accent500,
}

const $routinePriority: ViewStyle = {
  backgroundColor: colors.palette.primary500,
}

const $lowPriority: ViewStyle = {
  backgroundColor: colors.palette.neutral500,
}

const $rxNumber: TextStyle = {
  color: colors.textDim,
}

const $pendingStatus: TextStyle = {
  color: colors.palette.accent500,
}
const $preparedStatus: TextStyle = {
  color: colors.palette.success500,
}

const $filledStatus: TextStyle = {
  color: colors.palette.success500,
}

const $partialStatus: TextStyle = {
  color: colors.palette.angry500,
}

const $cancelledStatus: TextStyle = {
  color: colors.error,
}

const $expiredStatus: TextStyle = {
  color: colors.error,
}

const $defaultStatus: TextStyle = {
  color: colors.textDim,
}

const $detailText: TextStyle = {
  color: colors.text,
}

const $itemsSection: ViewStyle = {
  borderTopWidth: 1,
  borderTopColor: colors.separator,
  paddingTop: 8,
}

const $sectionTitle: TextStyle = {
  color: colors.text,
  marginBottom: 8,
}

const $itemEntry: ViewStyle = {
  paddingVertical: 6,
  paddingHorizontal: 8,
  backgroundColor: colors.palette.neutral100,
  borderRadius: 4,
  marginBottom: 4,
}

const $drugName: TextStyle = {
  color: colors.text,
}

const $dosageInstructions: TextStyle = {
  color: colors.textDim,
  marginTop: 2,
}

const $quantityText: TextStyle = {
  color: colors.text,
}

const $refillText: TextStyle = {
  color: colors.textDim,
  marginTop: 2,
}

const $notesSection: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 4,
}

const $notesText: TextStyle = {
  color: colors.text,
  fontStyle: "italic",
}

const $emptyState: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: 60,
}

const $emptyStateText: TextStyle = {
  color: colors.textDim,
  marginTop: 16,
  textAlign: "center",
}

const $newPrescriptionFAB: ViewStyle = {
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
