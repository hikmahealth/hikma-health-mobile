import { FC, useEffect, useReducer, useState } from "react"
import { Pressable, TextStyle, ViewStyle } from "react-native"
import { LegendList } from "@legendapp/list"
import { Q } from "@nozbe/watermelondb"
import { withObservables } from "@nozbe/watermelondb/react"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useSelector } from "@xstate/react"
import { format, isSameDay, isToday, startOfDay } from "date-fns"
import { Option } from "effect"
import { upperFirst } from "es-toolkit"
import { LucideListTodo, LucideSearch } from "lucide-react-native"
import DropDownPicker from "react-native-dropdown-picker"
import { catchError, of as of$ } from "rxjs"

import { AgendaDateSetter } from "@/components/AgendaDateSetter"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { View } from "@/components/View"
import db, { database } from "@/db"
import { useDBClinicsList } from "@/hooks/useDBClinicsList"
import {
  useDBPrescriptionsFilter,
  type PrescriptionsFilters,
} from "@/hooks/useDBPrescriptionsFilter"
import Clinic from "@/models/Clinic"
import DrugCatalogue from "@/models/DrugCatalogue"
import Patient from "@/models/Patient"
import Prescription from "@/models/Prescription"
import { PharmacyNavigatorParamList } from "@/navigators/PharmacyNavigator"
// import { useNavigation } from "@react-navigation/native"

import { providerStore } from "@/store/provider"
import { colors } from "@/theme/colors"
import { useAppTheme } from "@/theme/context"
import { ThemedStyle } from "@/theme/types"
import { friendlyString, getPrescriptionStatusColor, toggleStringInArray } from "@/utils/misc"

interface PharmacyViewScreenProps
  extends NativeStackScreenProps<PharmacyNavigatorParamList, "PharmacyView"> {}

export const PharmacyViewScreen: FC<PharmacyViewScreenProps> = ({ route, navigation }) => {
  const { theme } = useAppTheme()

  const {
    id: providerId,
    clinic_id,
    clinic_name,
    name: providerName,
  } = useSelector(providerStore, (state) => state.context)
  const propsClinicId = Option.getOrElse(clinic_id, () => "")

  const { prescriptions, clearFilters, filters, handleFiltersChange, loadMore } =
    useDBPrescriptionsFilter(propsClinicId)

  const { clinics: clinicsList, isLoading: isLoadingClinics } = useDBClinicsList()
  const activeClinic = clinicsList.find((clinic) => clinic.id === filters.clinicId)

  const handlePrescriptionPress = (prescription: Prescription.T) => {
    navigation.navigate("PrescriptionView", {
      prescriptionId: prescription.id,
      // visitId: prescription.visit_id,
    })
  }

  // console.log(prescriptions)

  if (isLoadingClinics) {
    return (
      <View style={$root}>
        <Text>Loading Clinics...</Text>
      </View>
    )
  }

  return (
    <LegendList
      ListHeaderComponent={
        <PrescriptionsListHeader
          clinicsList={clinicsList}
          clinic={activeClinic || null}
          clearFilters={clearFilters}
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
      }
      // ItemSeparatorComponent={ItemSeparatorComponent}
      data={prescriptions}
      // data={[]}
      renderItem={({ item }) => {
        return (
          <View px={10}>
            <PrescriptionListItem
              onPress={() => handlePrescriptionPress(item)}
              prescription={item}
            />
          </View>
        )
      }}
      recycleItems={false}
      // Re-render items if the prescription status changes
      keyExtractor={(item) => `${item.id}_${item.updatedAt}`}
      ListEmptyComponent={
        <View justifyContent="center" px={10} alignItems="center" pt={"40%"}>
          <LucideListTodo size={120} color={theme.colors.textDim} />
          <Text text="No prescriptions found" size="xl" />
        </View>
      }
      ListFooterComponent={<View mb={64}></View>}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      extraData={`${filters.status}_${filters.clinicId}_${filters.searchQuery}__${filters.date.toDateString()}`}
    />
  )
}

type PrescriptionListHeaderProps = {
  clinicsList: Clinic.DBClinic[]
  clinic: Clinic.DBClinic | null
  clearFilters: () => void
  filters: PrescriptionsFilters
  onFiltersChange: (filters: Partial<PrescriptionsFilters>) => void
}

const statusesList = Prescription.statusList

const PrescriptionsListHeader: FC<PrescriptionListHeaderProps> = ({
  clinicsList,
  clinic,
  clearFilters,
  filters,
  onFiltersChange,
}: PrescriptionListHeaderProps) => {
  const { themed } = useAppTheme()
  const [openDropdown, setOpenDropdown] = useState<"clinic" | "status" | "department" | null>(null)

  return (
    <View style={themed($headerContainer)}>
      {/* Search Bar */}
      <TextField
        testID="pharmacy-search-prescriptions"
        placeholder="Search prescriptions..."
        value={filters.searchQuery}
        onChangeText={(text) => onFiltersChange({ searchQuery: text })}
        style={$searchField}
        // TODO: Center the icon and add right side padding
        RightAccessory={() => <LucideSearch style={$searchIcon} />}
      />

      <View mt={10}>
        <Text preset="formLabel" text="Clinic" />

        <DropDownPicker
          open={openDropdown === "clinic"}
          setOpen={(open) => {
            if (open as unknown as boolean) setOpenDropdown("clinic")
            else setOpenDropdown(null)
          }}
          modalTitle="Clinic"
          style={$dropDownPickerStyle}
          zIndex={990000}
          zIndexInverse={990000}
          listMode="MODAL"
          items={clinicsList.map((clinic) => ({
            label: clinic.name,
            value: clinic.id,
          }))}
          value={filters.clinicId || ""}
          setValue={(cb) => {
            const data = cb(filters.clinicId)
            onFiltersChange({ clinicId: data })
          }}
        />
      </View>

      <View mt={10}>
        <Text preset="formLabel" text="Status" />

        <View direction="row" flexWrap="wrap" gap={5}>
          {statusesList.map((status) => (
            <Pressable
              style={[$statusChip, filters.status.includes(status) ? $statusChipActive : null]}
              key={status}
              onPress={() => {
                onFiltersChange({
                  status: toggleStringInArray(status, filters.status) as Prescription.Status[],
                })
              }}
            >
              <Text
                style={[
                  filters.status.includes(status) ? $statusChipActiveText : $statusChipText,
                  null,
                ]}
                size="xxs"
              >
                {upperFirst(status.replaceAll("_", " "))}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <AgendaDateSetter date={filters.date} setDate={(date) => onFiltersChange({ date })} />
    </View>
  )
}

// this one should be enhanced!
const enhance = withObservables(
  ["prescription"],
  ({ prescription }: { prescription: Prescription.T }) => ({
    prescription: db
      .get<Prescription.DB.T>("prescriptions")
      .findAndObserve(prescription.id)
      .pipe(catchError(() => of$(null))),
    patient: db
      .get("patients")
      .findAndObserve(prescription.patientId)
      .pipe(catchError(() => of$(null))),
    // pharmacy: db.get("pharmacies").findAndObserve(prescription.pharmacyId),
  }),
)

const PrescriptionListItem = enhance(
  ({
    prescription,
    patient,
    onPress,
  }: {
    prescription: Prescription.DB.T
    patient: Patient.DB.T
    onPress: () => void
  }) => {
    const { themed } = useAppTheme()

    const [prescribedDrugs, setPrescribedDrugs] = useState<DrugCatalogue.DB.T[]>([])

    useEffect(() => {
      const sub = database
        .get<DrugCatalogue.DB.T>(DrugCatalogue.DB.table_name)
        .query(Q.on("prescription_items", "prescription_id", prescription.id))
        .observe()
        .subscribe((drugs) => {
          setPrescribedDrugs(drugs)
        })

      return () => {
        sub.unsubscribe()
      }
    }, [prescription.id])

    if (!patient) {
      return (
        <View>
          <Text text="Patient does not exist anymore." />
        </View>
      )
    }

    if (!prescription) {
      return (
        <View>
          <Text text="Prescription does not exist anymore." />
        </View>
      )
    }

    const [backgroundColor, textColor] = getPrescriptionStatusColor(prescription.status)

    return (
      <Pressable testID={`pharmacy-prescription-item-${prescription.id}`} onPress={onPress}>
        <View style={themed($prescriptionListItem)}>
          <Text
            testID={`pharmacy-patient-name-${prescription.id}`}
            text={Patient.displayName(patient)}
            size={"lg"}
          />

          <View direction="row" py={2}>
            <View
              testID={`pharmacy-prescription-status-${prescription.id}`}
              style={
                (themed($statusBadge),
                {
                  borderColor: backgroundColor,
                  backgroundColor,
                  paddingHorizontal: 6,
                  borderRadius: 8,
                })
              }
            >
              <Text
                testID={`pharmacy-prescription-status-text-${prescription.id}`}
                text={prescription.status}
                size={"xxs"}
                color={textColor}
              />
            </View>
          </View>

          {prescribedDrugs.map((drug) => (
            <View key={drug.id} mb={10} testID={`pharmacy-prescription-drug-${drug.id}`}>
              <Text testID={`pharmacy-prescription-drug-name-${drug.id}`} size={"xs"}>
                {drug.brandName || ""} {drug.genericName || ""}
              </Text>
              <Text size={"xxs"}>
                {friendlyString(drug.form)} {drug.dosageQuantity}
                {drug.dosageUnits} {drug.route}
              </Text>
            </View>
          ))}
        </View>
      </Pressable>
    )
  },
)

const $statusBadge: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  // paddingVertical: spacing.xs,
  paddingHorizontal: spacing.xs,
  borderColor: colors.palette.primary500,
  borderWidth: 1,
  borderRadius: 8,
})

const $prescriptionListItem: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.md,
  backgroundColor: colors.palette.neutral200,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
})

const $root: ViewStyle = {
  flex: 1,
  paddingHorizontal: 14,
}

const $headerContainer: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  paddingTop: spacing.xl,
  backgroundColor: colors.background,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  marginBottom: spacing.md,
})

const $searchField: ViewStyle = {
  marginBottom: 12,
}

const $searchIcon: ViewStyle = {
  marginRight: 8,
  alignSelf: "center",
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

const $statusChip: ViewStyle = {
  paddingVertical: 4,
  paddingHorizontal: 8,
  borderRadius: 10,
  backgroundColor: colors.palette.neutral200,
  borderColor: colors.palette.neutral400,
  borderWidth: 1,
}

const $statusChipText: TextStyle = {
  color: colors.palette.neutral800,
}

const $statusChipActive: ViewStyle = {
  backgroundColor: colors.palette.primary500,
  borderColor: colors.palette.primary500,
}

const $statusChipActiveText: TextStyle = {
  color: colors.palette.neutral100,
}
