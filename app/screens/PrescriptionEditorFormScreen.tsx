import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { observer } from "mobx-react-lite"
import { Pressable, ViewStyle } from "react-native"
import { AppStackScreenProps } from "../navigators"
import {
  Button,
  If,
  MedicationEditor,
  MedicationsFormItem,
  Screen,
  Text,
  TextField,
  Toggle,
  View,
} from "../components"
import {
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet"
import { MedicationEntry, PrescriptionItem, priorityValues, statusValues } from "../types"
import { useImmer } from "use-immer"
import { LucidePlus } from "lucide-react-native"
import { colors } from "../theme"
import PrescriptionModel, {
  PrescriptionPriority,
  PrescriptionStatus,
} from "../db/model/Prescription"
import { upperFirst } from "lodash"
import { DatePickerButton } from "../components/DatePicker"
import { useStores } from "../models"
import Toast from "react-native-root-toast"
import { api } from "../services/api"
import { CommonActions } from "@react-navigation/native"
import database from "../db"
import * as Sentry from "@sentry/react-native"
import { Q } from "@nozbe/watermelondb"
import { usePatientVisitPrescriptions } from "../hooks/usePatientVisitPrescriptions"
import { useDBClinicsList } from "../hooks/useDBClinicsList"
import { $pickerContainer } from "./AppointmentEditorFormScreen"
import { Picker } from "@react-native-picker/picker"
import { addWeeks } from "date-fns"
import medicationsList from "../data/medicationsList"

// export type MedicationEntry = {
//   id: string
//   name: string
//   route: MedicineRoute
//   form: MedicineForm
//   frequency: number
//   intervals: number
//   dose: number
//   doseUnits: DoseUnit
//   duration: number
//   durationUnits: DurationUnit
// }

// export type PrescriptionItem = MedicationEntry & {
//   medicationId: string
//   quantity: number,
//   status: 'pending' | 'filled' | 'partially-filled' | 'cancelled'
//   notes: string
//   filledAt: Date | null
//   filledByUserId: string | null
// }

// @text("patient_id") patientId!: string
// @text("provider_id") providerId!: string
// @text("filled_by") filledBy!: string // doctor, nurse, pharmacist, other
// @text("clinic_id") clinicId!: string
// @text("visit_id") visitId?: string
// @text("priority") priority!: PrescriptionPriority // high, low, normal, emergency
// @text("status") status!: PrescriptionStatus
// @json("items", sanitizeItems) items!: PrescriptionItem[]

// @date("expiration_date") expirationDate!: Date
// @date("prescribed_at") prescribedAt!: Date
// @date("filled_at") filledAt?: Date

type PrescriptionDetails = {
  priority: PrescriptionPriority
  status: PrescriptionStatus
  filledBy: string | null
  expirationDate: Date
  prescribedAt: Date
  notes: string
  filledAt?: Date | null
}

export type PrescriptionForm = {
  items: PrescriptionItem[]
  metadata: Record<string, any>
  patientId: string
  providerId: string
  pickupClinicId?: string | null
  visitId: string | null
  priority: PrescriptionPriority
  status: PrescriptionStatus
  filledBy: string | null
  expirationDate: Date
  prescribedAt: Date
  notes: string
  filledAt?: Date | null
}

interface PrescriptionEditorFormScreenProps extends AppStackScreenProps<"PrescriptionEditorForm"> {}

export const PrescriptionEditorFormScreen: FC<PrescriptionEditorFormScreenProps> = observer(
  function PrescriptionEditorFormScreen({ route, navigation }) {
    // Pull in one of our MST stores
    const { provider } = useStores()
    const { clinics, isLoading: isLoadingClinics } = useDBClinicsList()

    console.log("RENDER")

    const { visitId, patientId, visitDate } = route.params
    const { prescriptions, isLoading: isLoadingPrescriptions } = usePatientVisitPrescriptions(
      patientId,
      visitId,
    )
    const [medicines, setMedicines] = useImmer<PrescriptionItem[]>([])
    const [activeMedicine, setActiveMedicine] = useImmer<PrescriptionItem | null>(null)
    const [pickupClinicId, setPickupClinicId] = useState<string | null>(null)
    const [prescriptionDetails, setPrescriptionDetails] = useImmer<PrescriptionDetails>({
      priority: "normal",
      status: "pending",
      filledBy: null,
      expirationDate: addWeeks(new Date(), 2),
      prescribedAt: new Date(),
      filledAt: null,
      notes: "",
    })

    const currentPrescriptionId: string | null = prescriptions[0]?.id || null

    useEffect(() => {
      if (prescriptions.length > 0) {
        const latestPrescription = prescriptions[0]

        setMedicines(latestPrescription.items)
        setPrescriptionDetails({
          priority: latestPrescription.priority,
          status: latestPrescription.status,
          filledBy: latestPrescription.filledBy || null,
          expirationDate: latestPrescription.expirationDate,
          prescribedAt: latestPrescription.prescribedAt,
          filledAt: latestPrescription.filledAt,
          notes: latestPrescription.notes || "",
        })
        setPickupClinicId(latestPrescription.pickupClinicId || null)
      }
    }, [prescriptions])

    const [isLoading, setIsLoading] = useState(false)

    const bottomSheetModalRef = useRef<BottomSheetModal>(null)

    const snapPoints = useMemo(() => ["100%", "100%"], [])

    const handleSheetChanges = useCallback((index: number) => {
      console.log("handleSheetChanges", index)
    }, [])

    const openMedicationEditor = (medication?: PrescriptionItem) => {
      setActiveMedicine(medication || null)
      bottomSheetModalRef.current?.present()
    }

    /** Helper to update the prescription details */
    const updatePrescriptionDetails = (details: Partial<PrescriptionDetails>) => {
      setPrescriptionDetails((draft) => {
        Object.keys(details).forEach((key) => {
          const value = details[key as keyof PrescriptionDetails]
          switch (key) {
            case "priority":
            case "status":
            case "notes":
            case "filledBy":
              if (typeof value === "string") {
                draft[key] = value as never
              }
              break
            case "expirationDate":
            case "prescribedAt":
            case "filledAt":
              if (value instanceof Date || value === null) {
                draft[key] = value as never
              } else if (typeof value === "string" || typeof value === "number") {
                const date = new Date(value)
                if (!isNaN(date.getTime())) {
                  draft[key] = date as never
                }
              }
              break
          }
        })
      })
    }

    const saveMedication = (medication: MedicationEntry) => {
      setMedicines((meds) => {
        const index = meds.findIndex((m) => m.id === medication.id)
        if (index === -1) {
          meds.push(convertMedicationToPrescription(medication))
        } else {
          meds[index] = convertMedicationToPrescription(medication)
        }
      })
      bottomSheetModalRef.current?.dismiss()
    }
    const medicineOptions: string[] = medicationsList.map((med) => med.name)

    const savePrescription = () => {
      // do not save if no medicines
      if (medicines.length === 0) {
        return Toast.show("Please add at least one medication to the prescription.", {
          position: Toast.positions.BOTTOM,
          containerStyle: {
            marginBottom: 100,
          },
        })
      }

      if (!patientId || !provider.id || !provider.clinic_id) {
        return Toast.show("The prescription has an issue with its patient, provider, or clinic.", {
          position: Toast.positions.BOTTOM,
          containerStyle: {
            marginBottom: 100,
          },
        })
      }

      setIsLoading(true)
      const prescription: PrescriptionForm = {
        ...prescriptionDetails,
        pickupClinicId,
        items: medicines,
        patientId,
        providerId: provider.id,
        visitId: visitId || null,
        metadata: {},
      }

      const apiCall = currentPrescriptionId
        ? api.updatePrescription(currentPrescriptionId, prescription, provider)
        : api.createPrescription(prescription, provider)

      apiCall
        .then((res) => {
          Toast.show("✅ Prescription saved successfully", {
            position: Toast.positions.BOTTOM,
            containerStyle: {
              marginBottom: 100,
            },
          })
          // React-Navigation 6 shortcut to passing a parameter to the previous screen
          // here we pop the screen and pass the visit ID to the previous screen
          navigation.dispatch((state) => {
            const prevRoute = state.routes[state.routes.length - 2]
            return CommonActions.navigate({
              name: prevRoute.name,
              params: {
                ...prevRoute.params,
                visitId: res.visitId,
              },
              merge: true,
            })
          })
        })
        .catch((err) => {
          console.log("error creating prescription", err)
          Toast.show("❌ Error saving prescription", {
            position: Toast.positions.BOTTOM,
            containerStyle: {
              marginBottom: 100,
            },
          })
        })
        .finally(() => {
          setIsLoading(false)
        })
    }

    // Memoize the MedicationsFormItem component
    const MemoizedMedicationsFormItem = useMemo(
      () => (
        <MedicationsFormItem
          openMedicationEditor={openMedicationEditor}
          deleteEntry={(med) => {
            setMedicines((meds) => meds.filter((m) => m.id !== med))
          }}
          value={medicines}
          onEditEntry={(med) => openMedicationEditor(convertMedicationToPrescription(med))}
          viewOnly={false}
        />
      ),
      [medicines, openMedicationEditor],
    )

    if (isLoadingPrescriptions) {
      return <Text text="Loading prescriptions..." />
    }

    return (
      <BottomSheetModalProvider>
        <Screen style={$root} preset="scroll">
          {/* <MedicationsFormItem
            openMedicationEditor={openMedicationEditor}
            deleteEntry={(med) => {
              setMedicines((meds) => meds.filter((m) => m.id !== med))
            }}
            value={medicines}
            onEditEntry={(med) => openMedicationEditor(convertMedicationToPrescription(med))}
            viewOnly={false}
          /> */}

          {MemoizedMedicationsFormItem}

          <View gap={16}>
            <View>
              <Pressable style={$addMedicationButton} onPress={() => openMedicationEditor()}>
                <View direction="row" alignItems="center" gap={8}>
                  <LucidePlus color={colors.palette.primary500} size={20} />
                  <Text color={colors.palette.primary500} textDecorationLine="underline">
                    Add Medication
                  </Text>
                </View>
              </Pressable>
            </View>

            <View gap={4}>
              <Text preset="formLabel">Priority</Text>
              <View gap={10}>
                {priorityValues.map((priority) => (
                  <Toggle
                    key={priority}
                    label={upperFirst(priority.replaceAll("-", " "))}
                    variant="radio"
                    labelStyle={{ fontSize: 14 }}
                    value={prescriptionDetails.priority === priority}
                    onValueChange={(value) =>
                      updatePrescriptionDetails({
                        priority: value ? priority : prescriptionDetails.priority,
                      })
                    }
                  />
                ))}
              </View>
            </View>

            <View gap={4}>
              <Text preset="formLabel">Status</Text>
              <View gap={10}>
                {statusValues.map((status) => (
                  <Toggle
                    label={upperFirst(status.replaceAll("-", " "))}
                    key={status}
                    variant="radio"
                    labelStyle={{ fontSize: 14 }}
                    value={prescriptionDetails.status === status}
                    onValueChange={(value) =>
                      updatePrescriptionDetails({
                        status: value ? status : prescriptionDetails.status,
                      })
                    }
                  />
                ))}
              </View>
            </View>

            <View gap={4}>
              <Text preset="formLabel">Pickup Clinic</Text>
              <View style={$pickerContainer}>
                <Picker
                  selectedValue={pickupClinicId}
                  onValueChange={(value) => setPickupClinicId(value)}
                >
                  {clinics.map((c) => (
                    <Picker.Item key={c.id} label={c.name} value={c.id} />
                  ))}
                </Picker>
              </View>
            </View>

            <View gap={0}>
              <Text preset="formLabel">Prescribed Date</Text>
              <DatePickerButton
                date={prescriptionDetails.prescribedAt}
                onDateChange={(value) => updatePrescriptionDetails({ prescribedAt: value })}
              />
            </View>

            <View gap={0}>
              <Text preset="formLabel">Prescription Expires On</Text>
              <DatePickerButton
                date={prescriptionDetails.expirationDate}
                onDateChange={(value) => updatePrescriptionDetails({ expirationDate: value })}
              />
            </View>

            <View gap={0}>
              <TextField
                label="Notes"
                value={prescriptionDetails.notes}
                multiline
                numberOfLines={6}
                onChangeText={(value) => updatePrescriptionDetails({ notes: value })}
              />
            </View>
          </View>

          <View mt={24}>
            <Button onPress={savePrescription}>
              {isLoading ? "Saving..." : "Save Prescription"}
            </Button>
          </View>

          <View style={{ height: 60 }} mb={20} />
        </Screen>
        <BottomSheetModal
          ref={bottomSheetModalRef}
          index={1}
          snapPoints={snapPoints}
          onChange={handleSheetChanges}
        >
          <BottomSheetScrollView style={{}}>
            <MedicationEditor
              medication={
                activeMedicine ? convertPrescriptionToMedication(activeMedicine) : undefined
              }
              medicineOptions={medicineOptions}
              onSubmit={saveMedication}
            />
          </BottomSheetScrollView>
        </BottomSheetModal>
      </BottomSheetModalProvider>
    )
  },
)

/**
 * Helper function that converts a MedicationEntry to a PrescriptionItem
 * @param med
 * @returns
 */
const convertMedicationToPrescription = (
  med: MedicationEntry,
  medicationId: string = "",
): PrescriptionItem => {
  return {
    ...med,
    // Additional fields specific to PrescriptionItem
    medicationId,
    quantity: 0, // Default value, adjust as needed
    status: "pending" as const, // Default status
    priority: "normal" as const, // Default priority
    filledAt: null,
    filledByUserId: null,
  }
}

/**
 * Helper function that converts a PrescriptionItem to a MedicationEntry
 * @param prescriptionItem
 * @returns
 */
const convertPrescriptionToMedication = (prescriptionItem: PrescriptionItem): MedicationEntry => {
  const { medicationId, quantity, status, notes, filledAt, filledByUserId, ...medicationFields } =
    prescriptionItem

  return {
    ...medicationFields,
    id: medicationFields.id || "", // Ensure id is always a string
  }
}

const $root: ViewStyle = {
  flex: 1,
  padding: 16,
}

const $addMedicationButton: ViewStyle = {
  padding: 8,
  borderRadius: 8,
}
