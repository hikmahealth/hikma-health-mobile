import { FC, useEffect, useState } from "react"
import { Alert, Pressable, ViewStyle } from "react-native"
import { Q } from "@nozbe/watermelondb"
import { withObservables } from "@nozbe/watermelondb/react"
import { catchError, of as of$ } from "@nozbe/watermelondb/utils/rx"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useSelector } from "@xstate/react"
import { LucideCheck, LucideX } from "lucide-react-native"
import Toast from "react-native-root-toast"

import { Button } from "@/components/Button"
import { If } from "@/components/If"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Radio } from "@/components/Toggle/Radio"
import { View } from "@/components/View"
import database from "@/db"
import DrugCatalogue from "@/models/DrugCatalogue"
import Patient from "@/models/Patient"
import Prescription from "@/models/Prescription"
import PrescriptionItem from "@/models/PrescriptionItem"
import type { AppStackScreenProps } from "@/navigators/AppNavigator"
import { PharmacyNavigatorParamList } from "@/navigators/PharmacyNavigator"
import { providerStore } from "@/store/provider"
import { colors } from "@/theme/colors"
import { useAppTheme } from "@/theme/context"
import { calculateAge } from "@/utils/date"
import { getPrescriptionItemStatusColor } from "@/utils/misc"
import { enhancePrescribedDrugsItem } from "@/db/enhancers/enhancePrescribedDrugsItem"
// import { useNavigation } from "@react-navigation/native"

interface PrescriptionViewScreenProps
  extends NativeStackScreenProps<PharmacyNavigatorParamList, "PrescriptionView"> {}

export const PrescriptionViewScreen: FC<PrescriptionViewScreenProps> = ({ route, navigation }) => {
  const { prescriptionId } = route.params
  const { theme } = useAppTheme()
  const [key, setKey] = useState<string>(Math.random().toString())
  const providerId = useSelector(providerStore, (state) => state.context.id)
  const [prescription, setPrescription] = useState<Prescription.DB.T | null>(null)
  const [patient, setPatient] = useState<Patient.DB.T | null>(null)

  useEffect(() => {
    const prescriptionSub = database
      .get<Prescription.DB.T>(Prescription.DB.table_name)
      .findAndObserve(prescriptionId)
      .pipe(catchError(() => of$(null)))
      .subscribe((prescription) => {
        setPrescription(prescription)
      })

    return () => {
      prescriptionSub?.unsubscribe()
    }
  }, [prescriptionId])

  useEffect(() => {
    if (!prescription) return

    const patientSub = database
      .get<Patient.DB.T>(Patient.DB.table_name)
      .findAndObserve(prescription.patientId)
      .pipe(catchError(() => of$(null)))
      .subscribe((patient) => {
        setPatient(patient)
      })

    return () => {
      patientSub?.unsubscribe()
    }
  }, [prescription?.id])

  const handleMarkAsPickedUp = () => {
    if (!prescription) return

    Alert.alert(
      "Confirm Pickup",
      "Once marked as picked up, this prescription cannot be further updated. Are you sure you want to continue?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Confirm",
          onPress: () => {
            Prescription.DB.markAsPickedUp(prescription.id, { id: providerId })
              .then(() => {
                Toast.show("Prescription marked as picked up", {
                  position: Toast.positions.BOTTOM,
                  duration: Toast.durations.SHORT,
                })
              })
              .catch((error) => {
                console.error(error)
                Toast.show("Failed to mark prescription as picked up", {
                  position: Toast.positions.BOTTOM,
                  duration: Toast.durations.LONG,
                })
              })
              .finally(() => {
                setKey(Math.random().toString())
              })
          },
        },
      ],
    )
  }

  const handleUpdateStatus = (status: Prescription.Status) => {
    if (!prescription) return
    Prescription.DB.updateStatus(prescription.id, status)
      .then(() => {
        Toast.show(`Prescription marked as ${status}`, {
          position: Toast.positions.BOTTOM,
          duration: Toast.durations.SHORT,
        })
      })
      .catch((error) => {
        console.error(error)
        Toast.show(`Failed to mark prescription as ${status}`, {
          position: Toast.positions.BOTTOM,
          duration: Toast.durations.LONG,
        })
      })
      .finally(() => {
        setKey(Math.random().toString())
      })
  }

  const handleItemDispensed = (prescriptionItem: PrescriptionItem.DB.T) => {
    navigation.navigate("DispensePrescriptionItem", { prescriptionItemId: prescriptionItem.id })
    // Alert.alert("Dispense Item", "Are you sure you want to dispense this item?", [
    //   {
    //     text: "Cancel",
    //     style: "cancel",
    //   },
    //   {
    //     text: "Cancel",
    //     style: "cancel",
    //   },
    //   {
    //     text: "Cancel",
    //     style: "cancel",
    //   },
    //   {
    //     text: "Cancel",
    //     style: "cancel",
    //   },
    //   {
    //     text: "OK",
    //     onPress: () => {
    //       // dispenseAndUpdateInventory
    //       // PrescriptionItem.DB.dispenseAndUpdateInventory(
    //       //   prescriptionItem.id,
    //       //   prescriptionItem.quantityPrescribed,
    //       //   batchId,
    //       // )
    //     },
    //   },
    // ])
  }

  const handleItemCancelled = (prescriptionItem: PrescriptionItem.DB.T) => {
    Alert.alert("Cancel Item", "Are you sure you want to cancel this item?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "OK",
        onPress: () => {
          // cancel
        },
      },
    ])
  }

  if (!prescription) {
    return (
      <Screen style={$root} preset="scroll">
        <Text text="Loading..." />
      </Screen>
    )
  }

  return (
    <Screen style={$root} preset="scroll">
      {patient !== null && (
        // NOTE: This is copy pasted from PatientEditorFormScreen. consider refactoring
        <View py={theme.spacing.md}>
          <Text size="xl" text={Patient.displayName(patient)} />
          <Text text={`Age: ${calculateAge(patient.dateOfBirth)}`} />
          <Text text={`Sex: ${patient.sex}`} />
          <Text>Priority: {prescription.priority}</Text>
        </View>
      )}

      <View>
        <Text text="Change Status" size="lg" />
        <View gap={6}>
          <Radio
            label="⏳ Pending"
            value={prescription.status === "pending"}
            onValueChange={() => handleUpdateStatus("pending")}
          />
          <Radio
            label="📦 Prepared"
            value={prescription.status === "prepared"}
            onValueChange={() => handleUpdateStatus("prepared")}
          />
          {/*TODO: if a part of a prescription is filled, it should not be allowed to be set to cancelled. only partially filled*/}
          <Radio
            label="❌ Cancelled"
            value={prescription.status === "cancelled"}
            onValueChange={() => handleUpdateStatus("cancelled")}
          />
          <Radio
            label="✅ Picked Up"
            value={prescription.status === "picked-up"}
            onValueChange={() => handleUpdateStatus("picked-up")}
          />
        </View>
      </View>

      <View height={14} />

      <View gap={6} pt={10}>
        <Text text="Prescribed Medications" size="lg" />
        <PrescriptionDrugsItem
          prescription={prescription}
          onItemDispensed={handleItemDispensed}
          onItemCancelled={handleItemCancelled}
        />
      </View>

      {/*<If condition={prescription.status === "prepared"}>
        <View>
          <Button onPress={handleMarkAsPickedUp}>Confirm Patient Pick up</Button>
        </View>
      </If>*/}
    </Screen>
  )
}

// TODO: use this component

const PrescriptionDrugsItem = enhancePrescribedDrugsItem(
  ({
    prescription,
    prescriptionItems,
    onItemDispensed,
    onItemCancelled,
    drugs,
  }: {
    prescription: Prescription.DB.T | null
    prescriptionItems: PrescriptionItem.DB.T[] | null
    onItemDispensed: (item: PrescriptionItem.DB.T) => void
    onItemCancelled: (item: PrescriptionItem.DB.T) => void
    drugs: DrugCatalogue.DB.T[] | null
  }) => {
    return (
      <View p={10} mb={12} gap={10}>
        {prescriptionItems?.map((item) => {
          const drug = drugs?.find((drug) => drug.id === item.drugId)
          return (
            <View key={item.id} style={$drugItemContainer}>
              <View>
                <Text>
                  {drug?.brandName || "Unknown Drug"} ({drug?.genericName})
                </Text>
                <Text>
                  {drug?.dosageQuantity?.toString()} {drug?.dosageUnits || ""}
                </Text>
                <Text text={item.dosageInstructions || ""} />
                <Text>Prescribed: {item.quantityPrescribed}</Text>

                <View>
                  <Text>Dispensed: {item.quantityDispensed}</Text>
                </View>
              </View>

              {/* Buttons to mark as picked up or to mark as cancelled */}
              {/* TODO: this should respond to the quantityPrescribed and quantityDispensed counts */}
              {/*<If condtion*/}
              <View direction="row" gap={10} mt={8}>
                <Pressable onPress={() => onItemDispensed(item)} style={$prescriptionItemActionBtn}>
                  <Text size="xs">Dispense Medication</Text>
                </Pressable>

                {/*<If condition={item.quantityDispensed === 0}>
                  <Pressable
                    onPress={() => onItemCancelled(item)}
                    style={$prescriptionItemActionBtn}
                  >
                    <LucideX color={colors.palette.angry500} size={20} />
                    <Text>Cancel</Text>
                  </Pressable>
                  </If>*/}
              </View>
            </View>
          )
        })}
      </View>
    )
  },
)

const $drugItemContainer: ViewStyle = {
  borderBottomWidth: 1,
  borderColor: colors.border,
  paddingBottom: 14,
}

function getStatusBadge(status: PrescriptionItem.ItemStatus): ViewStyle {
  return {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: getPrescriptionItemStatusColor(status)[0],
  } as ViewStyle
}

const $prescriptionItemActionBtn: ViewStyle = {
  flexDirection: "row",
  gap: 4,
  paddingVertical: 6,
  paddingHorizontal: 12,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.border,
  alignItems: "center",
  justifyContent: "center",
}

// function useDBPrescription(prescriptionId: string) {
//   const [patient, setPatient] = useState<Patient.DB.T | null>(null)
//   const [prescription, setPrescription] = useState<Prescription.DB.T | null>(null)
//   const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem.DB.T[] | null>([])

//   useEffect(() => {
//     const prescriptionSub = database
//       .get<Prescription.DB.T>(Prescription.DB.table_name)
//       .findAndObserve(prescriptionId)
//       .pipe(catchError(() => of(null)))
//       .subscribe((prescription) => {
//         setPrescription(prescription)
//       })

//     const itemsSub = database
//       .get<PrescriptionItem.DB.T>(PrescriptionItem.DB.table_name)
//       .query(Q.where("prescription_id", prescriptionId))
//       .observe()
//       .subscribe((items) => {
//         setPrescriptionItems(items)
//       })

//     return () => {
//       prescriptionSub?.unsubscribe()
//     }
//   }, [prescriptionId])

//   return {
//     patient,
//     prescription,
//     prescriptionItem,
//   }
// }

const $root: ViewStyle = {
  flex: 1,
  paddingHorizontal: 14,
}
