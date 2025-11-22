import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { BackHandler, Platform, Pressable, ViewStyle } from "react-native"
import {
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet"
import { Database, Q } from "@nozbe/watermelondb"
import { sanitizeLikeString } from "@nozbe/watermelondb/QueryDescription"
import { withObservables } from "@nozbe/watermelondb/react"
import { useFocusEffect } from "@react-navigation/native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useSelector } from "@xstate/react"
import { Option } from "effect"
import { cloneDeep, groupBy, sortBy, upperFirst } from "es-toolkit"
import { LucidePlus, LucideX } from "lucide-react-native"
import { Controller, useForm } from "react-hook-form"
import Toast from "react-native-root-toast"
import { catchError, of as of$ } from "rxjs"
import { useDebounceValue } from "usehooks-ts"
import { v1 as uuidV1 } from "uuid"

import { Button } from "@/components/Button"
import { If } from "@/components/If"
import { PlatformPicker } from "@/components/PlatformPicker"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { Checkbox } from "@/components/Toggle/Checkbox"
import { Radio } from "@/components/Toggle/Radio"
import { View } from "@/components/View"
import database from "@/db"
import { useDBClinicsList } from "@/hooks/useDBClinicsList"
import { usePatientRecord } from "@/hooks/usePatientRecord"
import ClinicInventory from "@/models/ClinicInventory"
import DrugCatalogue from "@/models/DrugCatalogue"
import Patient from "@/models/Patient"
import Prescription from "@/models/Prescription"
import PrescriptionItem from "@/models/PrescriptionItem"
import { PharmacyNavigatorParamList } from "@/navigators/PharmacyNavigator"
import { providerStore } from "@/store/provider"
import { useAppTheme } from "@/theme/context"
import { ThemedStyle } from "@/theme/types"
import { calculateAge } from "@/utils/date"
import { friendlyString } from "@/utils/misc"

interface PrescriptionEditorFormScreenProps
  extends NativeStackScreenProps<PharmacyNavigatorParamList, "PrescriptionEditorForm"> {}

export const PrescriptionEditorFormScreen: FC<PrescriptionEditorFormScreenProps> = ({
  route,
  navigation,
}) => {
  const {
    id: providerId,
    clinic_name,
    clinic_id,
    name: providerName,
  } = useSelector(providerStore, (state) => state.context)
  const { theme } = useAppTheme()

  const providerClinicId = Option.getOrUndefined(clinic_id)

  const { patientId, visitId, prescriptionId, shouldCreateNewVisit = true } = route.params

  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem.T[]>([])

  const { patient } = usePatientRecord(patientId)
  const patientRecord = Option.getOrNull(patient)

  const { clinics } = useDBClinicsList()

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
    getValues,
    setValue,
    watch,
  } = useForm<Prescription.T>({
    defaultValues: {
      ...cloneDeep(Prescription.empty),
      providerId,
      visitId: visitId || undefined,
      pickupClinicId: providerClinicId,
      patientId,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })

  const [openPicker, setOpenPicker] = useState<"pickupClinic" | "priority" | "status" | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const isIos = Platform.OS === "ios"

  const pickupClinicId = watch("pickupClinicId")

  // if pick-up clinic id is changed, reset the prescription items - stock could differ between the clinics
  useEffect(() => {
    setPrescriptionItems([])
  }, [pickupClinicId])

  const [isLoading, setIsLoading] = useState(false)

  const bottomSheetModalRef = useRef<BottomSheetModal>(null)

  const snapPoints = useMemo(() => ["70%", "70%"], [])

  const handleSheetChanges = useCallback((index: number) => {
    console.log("handleSheetChanges", index)
    if (index === -1) {
      setIsSheetOpen(false)
      return
    }
    setIsSheetOpen(true)
  }, [])

  // on press hardware back just close the modal. if modal is closed then go back
  const handleBackPress = useCallback(() => {
    if (isSheetOpen) {
      bottomSheetModalRef.current?.dismiss()
      return true
    }
    return false
  }, [isSheetOpen])

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", handleBackPress)
      return () => subscription.remove()
    }, [handleBackPress]),
  )

  /**
   * Adds an item to the prescription items if it does not already exist
   * @param item
   */
  const handleSelectItem = (item: ClinicInventory.DB.T) => {
    const drugId = item.drugId
    if (prescriptionItems.some((item) => item.drugId === drugId)) {
      // close the modal
      bottomSheetModalRef.current?.dismiss()
      return
    }

    const prescriptionItemId = uuidV1()
    setPrescriptionItems((prevState) => [
      ...prevState,
      {
        ...PrescriptionItem.empty(prescriptionItemId),
        patientId: patientId,
        drugId,
        quantityPrescribed: 1,
        clinicId: pickupClinicId || providerClinicId || "",
      },
    ])

    bottomSheetModalRef.current?.dismiss()
  }

  const handleRemovePrescriptionItem = (itemId: string) => {
    setPrescriptionItems((prevState) => prevState.filter((item) => item.id !== itemId))
  }

  const handleUpdatePrescriptionItemQty = (itemId: string, quantityPrescribed: number) => {
    setPrescriptionItems((prevState) => {
      const updatedItems = prevState.map((item) => {
        if (item.id === itemId) {
          return { ...item, quantityPrescribed }
        }
        return item
      })
      return updatedItems
    })
  }

  const handleUpdatePrescriptionItemInstructions = (itemId: string, dosageInstructions: string) => {
    setPrescriptionItems((prevState) => {
      // console.log("Updating instructions for item:", itemId, dosageInstructions)
      const updatedItems = prevState.map((item) => {
        if (item.id === itemId) {
          return { ...item, dosageInstructions }
        }
        return item
      })
      return updatedItems
    })
  }

  const onSubmit = async (submission: Prescription.T) => {
    // Making sure the data is complete and that the defaults are sane
    const data: Prescription.T = {
      ...submission,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const items = prescriptionItems.map((item) => ({
      ...item,
      patientId,
      clinicId: data.pickupClinicId || providerClinicId || "",
      recordedByUserId: providerId,
      recordedAt: new Date(),
    }))

    // console.log({ data, prescriptionItems })

    if (isLoading) {
      return
    }

    try {
      setIsLoading(true)
      const { prescriptionId: prescriptionIdResult, visitId } = await Prescription.DB.create(
        prescriptionId || null,
        data,
        items,
        {
          clinicId: providerClinicId || "",
          id: providerId,
          name: providerName,
        },
        shouldCreateNewVisit || true,
      )

      // If there is no visitId and we are not creating a new visit, just go back
      if (!visitId && shouldCreateNewVisit === false) {
        navigation.goBack()
      } else if (visitId) {
        navigation.goBack()
      } else {
        navigation.popTo("NewVisit", { patientId, visitDate, visitId: res.visitId })
      }
    } catch (error) {
      console.error(error)
      Toast.show("Error creating prescription", {
        position: Toast.positions.BOTTOM,
        duration: Toast.durations.LONG,
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!patientRecord) {
    return (
      <Screen style={$root} preset="scroll">
        <Text text="Loading patient..." />
      </Screen>
    )
  }

  return (
    <BottomSheetModalProvider>
      <Screen style={$root} preset="scroll">
        <View py={theme.spacing.md}>
          <Text testID="patient-name" size="xl" text={Patient.displayName(patientRecord)} />
          <Text testID="patient-age" text={`Age: ${calculateAge(patientRecord.dateOfBirth)}`} />
          <Text testID="patient-sex" text={`Sex: ${patientRecord.sex}`} />
        </View>

        <View gap={theme.spacing.md} pt={20}>
          <Controller
            control={control}
            name="pickupClinicId"
            render={({ field }) => (
              <View>
                <Text preset="formLabel" text="Clinic" />
                {/* <View style={$pickerContainer}>
                  <Picker selectedValue={field.value} onValueChange={field.onChange}>
                    {sortBy(clinics, "name").map((clinic) => (
                      <Picker.Item key={clinic.id} label={clinic.name} value={clinic.id} />
                    ))}
                  </Picker>
                </View> */}
                <PlatformPicker
                  isIos={isIos}
                  options={sortBy(clinics, ["name"]).map((clinic) => ({
                    label: clinic.name,
                    value: clinic.id,
                  }))}
                  fieldKey="pickupClinicId"
                  modalTitle="Pickup Clinic"
                  setValue={() => (value: string) => field.onChange(value)}
                  setOpen={(value: boolean) => setOpenPicker(value ? "pickupClinic" : null)}
                  isOpen={openPicker === "pickupClinic"}
                  value={field.value || ""}
                />
              </View>
            )}
          />

          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <View gap={4}>
                <Text preset="formLabel" text="Status" />
                {Prescription.statusList.map((status) => (
                  <Radio
                    key={status}
                    label={friendlyString(status)}
                    value={field.value === status}
                    onValueChange={(value: boolean) => {
                      field.onChange(status)
                    }}
                  />
                ))}
              </View>
            )}
          />

          <Controller
            control={control}
            name="priority"
            render={({ field }) => (
              <View gap={4}>
                <Text preset="formLabel" text="Priority" />
                {Prescription.priorityList.map((priority) => (
                  <Radio
                    key={priority}
                    label={friendlyString(priority)}
                    value={field.value === priority}
                    onValueChange={(value: boolean) => {
                      field.onChange(priority)
                    }}
                  />
                ))}
              </View>
            )}
          />

          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                multiline
                testID="prescription-notes"
                labelTx="appointmentEditorForm:notes"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
              />
            )}
          />
        </View>

        {/*Prescription items*/}
        <View gap={theme.spacing.lg} pt={20}>
          {prescriptionItems.map((item) => (
            <View key={item.id} gap={theme.spacing.sm} testID="prescription-item">
              <PrescriptionItemEditor
                drugId={item.drugId}
                quantity={item.quantityDispensed}
                instructions={item.dosageInstructions}
                onQtyChange={(qty: number) => handleUpdatePrescriptionItemQty(item.id, qty)}
                onInstructionsChange={(instructions: string) =>
                  handleUpdatePrescriptionItemInstructions(item.id, instructions)
                }
                onRemove={() => handleRemovePrescriptionItem(item.id)}
              />
            </View>
          ))}
        </View>

        <View py={16} alignItems="center" mt={8}>
          <Pressable
            testID="open-add-prescription-item-form"
            onPress={() => bottomSheetModalRef.current?.present()}
          >
            <View direction="row" gap={8}>
              <LucidePlus color={theme.colors.palette.primary600} />
              <Text
                text="Add Prescription Item"
                color={theme.colors.palette.primary600}
                textDecorationLine="underline"
              />
            </View>
          </Pressable>
        </View>

        <If condition={prescriptionItems.length > 0}>
          <View py={16}>
            <Button
              preset="defaultPrimary"
              testID="submit-prescription"
              onPress={handleSubmit(onSubmit)}
            >
              Submit
            </Button>
          </View>
        </If>

        <View height={100} />
      </Screen>

      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={1}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
      >
        <BottomSheetScrollView style={{}}>
          <If condition={!pickupClinicId}>
            <View px={16}>
              <Text>Choose a clinic to pick up the prescription from</Text>
            </View>
          </If>
          <View px={16}>
            {pickupClinicId && (
              <ClinicInventorySearch clinicId={pickupClinicId} onSelectItem={handleSelectItem} />
            )}
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </BottomSheetModalProvider>
  )
}

const enhancePrescriptionItemEditor = withObservables(
  ["drugId"],
  ({ drugId }: { drugId: string }) => {
    return {
      drug: database
        .get<DrugCatalogue.DB.T>("drug_catalogue")
        .findAndObserve(drugId)
        .pipe(catchError(() => of$(null))),
    }
  },
)

const PrescriptionItemEditor = enhancePrescriptionItemEditor(
  ({
    drug,
    quantity,
    instructions,
    onRemove,
    onQtyChange,
    onInstructionsChange,
  }: {
    drug: DrugCatalogue.DB.T | null
    quantity: number
    instructions: string
    onRemove: () => void
    onQtyChange: (qty: number) => void
    onInstructionsChange: (instructions: string) => void
  }) => {
    const { themed, theme } = useAppTheme()

    if (!drug) {
      return (
        <View style={themed($prescriptionItemEditorContainer)}>
          <Text>Drug not found</Text>
        </View>
      )
    }

    return (
      <View style={themed($prescriptionItemEditorContainer)}>
        <View gap={8}>
          <View direction="row" justifyContent="space-between">
            <View direction="row" alignItems="baseline" gap={4}>
              <Text size="lg">{drug.brandName}</Text>
              <Text>({drug.genericName})</Text>
            </View>

            <Pressable testID="remove-prescription-item" onPress={onRemove}>
              <LucideX size={24} color={theme.colors.palette.neutral900} />
            </Pressable>
          </View>
          <Text>
            {friendlyString(drug.form)} {drug.dosageQuantity}
            {drug.dosageUnits} {drug.route}
          </Text>
        </View>
        <View gap={8}>
          <TextField
            testID="prescription-item-quantity"
            label="Quantity"
            keyboardType="numeric"
            placeholder="How many units should be dispensed?"
            defaultValue={quantity.toString()}
            onChangeText={(t) => (!isNaN(Number(t)) ? onQtyChange(parseInt(t)) : null)}
          />
          <TextField
            testID="prescription-item-instructions"
            label="Dosage Instructions"
            keyboardType="default"
            multiline
            onChangeText={(t) => onInstructionsChange(t)}
            value={instructions}
            placeholder="Enter dosage instructions"
          />
        </View>
      </View>
    )
  },
)

const $prescriptionItemEditorContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  padding: 16,
  borderRadius: 8,
  backgroundColor: colors.palette.neutral300,
})

function ClinicInventorySearch({
  onSelectItem,
  clinicId,
}: {
  onSelectItem: (item: ClinicInventory.DB.T) => void
  clinicId: string
}) {
  const { themed } = useAppTheme()
  const [searchQuery, setSearchQuery] = useDebounceValue("", 1000)

  const { isLoading, data: inventoryItems } = useDBClinicInventorySearch(searchQuery, clinicId)

  const inventoryItemBatches = Object.entries(groupBy(inventoryItems, (item) => item.drugId))

  return (
    <View>
      <TextField
        testID="clinic-inventory-search"
        label="Search Medication"
        placeholder="Enter medicine name"
        onChangeText={(text) => setSearchQuery(text)}
      />

      <View gap={8} mt={10}>
        {inventoryItemBatches.map(([drugId, items]) => (
          <Pressable
            testID={`inventory-item-${drugId}`}
            key={drugId}
            onPress={() => onSelectItem(items[0])}
          >
            <View style={themed($inventoryItemBtn)}>
              <InventoryItem inventoryItem={items[0]} />
              <Text>{items.reduce((acc, item) => acc + item.quantityAvailable, 0)} remaining</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const enhanceInventoryItem = withObservables(
  ["inventoryItem"],
  ({ inventoryItem }: { inventoryItem: ClinicInventory.DB.T }) => ({
    inventoryItem,
    drug: inventoryItem.drug,
  }),
)

const InventoryItem = enhanceInventoryItem(
  ({ inventoryItem, drug }: { inventoryItem: ClinicInventory.DB.T; drug: DrugCatalogue.DB.T }) => {
    const { theme } = useAppTheme()
    // console.log({ drug })

    return (
      <View>
        <Text size="lg" testID={`drug-brand-name-${drug.id}`}>
          {drug.brandName} - {drug.dosageQuantity} {drug.dosageUnits}{" "}
        </Text>
        <Text color={theme.colors.textDim} testID={`drug-generic-name-${drug.id}`}>
          {drug.genericName}
        </Text>
        <Text testID={`drug-form-route-${drug.id}`}>
          {upperFirst(drug.form)} {drug.route}
        </Text>
      </View>
    )
  },
)

function useDBClinicInventorySearch(searchTerm: string, clinicId: string) {
  const [data, setData] = useState<ClinicInventory.DB.T[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    const queryTerm = Q.like(`%${sanitizeLikeString(searchTerm)}%`)
    const sub = database
      .get<ClinicInventory.DB.T>("clinic_inventory")
      .query(
        Q.where("clinic_id", clinicId),
        Q.on("drug_catalogue", [
          Q.or(
            Q.where("generic_name", queryTerm),
            Q.where("brand_name", queryTerm),
            Q.where("barcode", queryTerm),
          ),
        ]),
        Q.where("quantity_available", Q.gt(0)),
        Q.take(15),
      )
      .observe()
      .subscribe((items) => {
        setData(items)
        setIsLoading(false)
      })

    return () => {
      sub.unsubscribe()
    }
  }, [searchTerm])

  return { isLoading, data }
}

const $root: ViewStyle = {
  flex: 1,
  paddingHorizontal: 14,
}

const $inventoryItemBtn: ThemedStyle<ViewStyle> = ({ colors }) => ({
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  backgroundColor: colors.palette.neutral200,
  borderRadius: 8,
})
