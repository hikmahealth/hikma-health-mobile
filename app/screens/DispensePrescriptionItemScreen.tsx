import { FC, useEffect, useState } from "react"
import { Alert, ViewStyle } from "react-native"
import { Q } from "@nozbe/watermelondb"
import { withObservables } from "@nozbe/watermelondb/react"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useSelector } from "@xstate/react"
import DropDownPicker from "react-native-dropdown-picker"
import Toast from "react-native-root-toast"

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { View } from "@/components/View"
import database from "@/db"
import ClinicInventory from "@/models/ClinicInventory"
import PrescriptionItem from "@/models/PrescriptionItem"
import { PharmacyNavigatorParamList } from "@/navigators/PharmacyNavigator"
import { providerStore } from "@/store/provider"
import { colors } from "@/theme/colors"
// import { useNavigation } from "@react-navigation/native"

interface DispensePrescriptionItemScreenProps
  extends NativeStackScreenProps<PharmacyNavigatorParamList, "DispensePrescriptionItem"> {}

export const DispensePrescriptionItemScreen: FC<DispensePrescriptionItemScreenProps> = ({
  route,
  navigation,
}) => {
  const { prescriptionItemId } = route.params
  const { id: providerId } = useSelector(providerStore, (state) => state.context)
  const [prescriptionItem, setPrescriptionItem] = useState<PrescriptionItem.DB.T | null>(null)
  const [clinicInventory, setClinicInventory] = useState<ClinicInventory.DB.T[]>([])

  const [selectedBatches, setSelectedBatches] = useState<string[]>([])

  const [batchQuantities, setBatchQuantities] = useState<{ [batchId: string]: number }>({})

  const [isOpenPicker, setIsOpenPicker] = useState(false)

  useEffect(() => {
    const sub = database
      .get<PrescriptionItem.DB.T>("prescription_items")
      .findAndObserve(prescriptionItemId)
      .subscribe((item) => {
        item.clinicInventory
          .fetch()
          .then((res) => {
            setClinicInventory(res)
          })
          .catch(console.error)

        setPrescriptionItem(item)
      })

    return () => {
      sub.unsubscribe()
    }
  }, [prescriptionItemId])

  const selectedBatchesKey = selectedBatches.join("")
  useEffect(() => {
    // if there is a change to the selected batches, update the batch quantities appropriately
    setBatchQuantities((prevQuantities) => {
      const newQuantities = { ...prevQuantities }

      // any batch that is in the selected batches that is not in the batchQuantities needs to be added
      selectedBatches.forEach((batchId) => {
        if (!(batchId in newQuantities)) {
          newQuantities[batchId] = 0
        }
      })

      // any batch that is in the batchQuantities that is not in the selected batches needs to be removed
      Object.keys(newQuantities).forEach((batchId) => {
        if (!selectedBatches.includes(batchId)) {
          delete newQuantities[batchId]
        }
      })

      // any batch that is in both the selected batches and the batchQuantities keeps its existing quantity
      // (no additional action needed as we're preserving existing values)

      return newQuantities
    })
  }, [selectedBatchesKey])

  const handleQuantityChange = (batchId: string, quantity: number) => {
    setBatchQuantities((prevQuantities) => {
      const newQuantities = { ...prevQuantities }
      newQuantities[batchId] = quantity
      return newQuantities
    })
  }

  // 1. get the drug that is being dispensed
  // 2. get the batches that the drug is availabe in (has to be matching quantities)
  // 3. select different batches
  // 4. per batch, select how many drugs you are dispensing for that drug
  // 5. Calculate the total number of drugs being dispensed

  const inventoryBatches = clinicInventory.reduce(
    (acc, item) => {
      if (acc[item.batchId]) {
        acc[item.batchId].quantityAvailable += item.quantityAvailable
      } else {
        acc[item.batchId] = {
          quantityAvailable: item.quantityAvailable,
          batchNumber: item.batchNumber,
        }
      }
      return acc
    },
    {} as { [batchId: string]: { quantityAvailable: number; batchNumber: string } },
  )

  const inventoryOptions = Object.entries(inventoryBatches).map((it) => ({
    label: `Batch # ${it[1].batchNumber} (${it[1].quantityAvailable} remaining)`,
    value: it[0],
  }))
  const totalAllocated = Object.values(batchQuantities).reduce(
    (acc, curr) => acc + curr,
    prescriptionItem?.quantityDispensed || 0,
  )

  const handleDispense = () => {
    if (!prescriptionItem) {
      return
    }
    if (totalAllocated === 0) {
      return Toast.show("Cannot dispense 0 drugs", {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
      })
    }
    if (totalAllocated > (prescriptionItem?.quantityPrescribed || 0)) {
      return Toast.show("Cannot dispense more than prescribed", {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
      })
    }
    Alert.alert("Confirm Dispensing", "Are you sure you want to dispense this prescription item?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Confirm",
        onPress: () => {
          PrescriptionItem.DB.dispenseAndUpdateInventory(
            prescriptionItemId,
            providerId,
            batchQuantities,
          )
            .then((res) => {
              if (res) {
                Toast.show("✅ Dispensed successfully", {
                  duration: Toast.durations.SHORT,
                  position: Toast.positions.BOTTOM,
                  hideOnPress: true,
                })
                navigation.goBack()
              } else {
                Toast.show("❌ Dispensing failed", {
                  duration: Toast.durations.SHORT,
                  position: Toast.positions.BOTTOM,
                  hideOnPress: true,
                })
              }
            })
            .catch((error) => {
              Toast.show(`❌ Dispensing failed: ${error.message}`, {
                duration: Toast.durations.SHORT,
                position: Toast.positions.BOTTOM,
                hideOnPress: true,
              })
            })
        },
      },
    ])
  }

  if (!prescriptionItem) {
    return (
      <Screen style={$root} preset="scroll">
        <Text text="Loading..." />
      </Screen>
    )
  }

  return (
    <Screen style={$root} preset="scroll">
      <View gap={10}>
        <View>
          <Text text="Total prescribed:" preset="formLabel" />
          <Text text={String(prescriptionItem.quantityPrescribed)} />
        </View>
        <View>
          <Text text="Notes:" preset="formLabel" />
          <Text text={prescriptionItem.notes || "No notes provided"} />
        </View>
      </View>

      <View mt={10}>
        <Text preset="formLabel" text="Select Batches" />

        <DropDownPicker
          open={isOpenPicker}
          setOpen={setIsOpenPicker}
          modalTitle="Batch Picker"
          style={$dropDownPickerStyle}
          zIndex={990000}
          zIndexInverse={990000}
          listMode="MODAL"
          mode="BADGE"
          items={inventoryOptions}
          multiple
          value={selectedBatches}
          // onChangeValue={(id: string | null) => id && handleSelectedBatch(id)}
          // onSelectItem={({ value }) => value && handleSelectedBatch(value)}
          setValue={(cb) => {
            const data = cb(selectedBatches)
            setSelectedBatches(data)
            // setValue("form")(data || "mg")
          }}
        />
      </View>

      <View mt={10}>
        <Text preset="subheading" text="Quantities per batch dispensed" />

        {selectedBatches.map((batchId) => {
          const batch = inventoryBatches[batchId]
          return (
            <View key={batchId} mt={2}>
              <TextField
                placeholder="Quantity"
                keyboardType="numeric"
                label={batch.batchNumber}
                // defaultValue={}
                onChangeText={(text) => handleQuantityChange(batchId, +text)}
              />
            </View>
          )
        })}
      </View>

      <View mt={10}>
        <Button
          text={"Dispense " + totalAllocated + "/" + prescriptionItem.quantityPrescribed}
          onPress={handleDispense}
        />
      </View>
    </Screen>
  )
}

const $root: ViewStyle = {
  flex: 1,
  paddingHorizontal: 14,
}

const $dropDownPickerStyle: ViewStyle = {
  marginTop: 2,
  borderWidth: 1,
  borderRadius: 4,
  backgroundColor: colors.palette.neutral200,
  borderColor: colors.palette.neutral400,
  zIndex: 990000,
  flex: 1,
}
