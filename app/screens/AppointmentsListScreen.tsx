import { FC, useState, useEffect, useCallback } from "react"
import { ViewStyle, TextStyle, Pressable } from "react-native"
import { LegendList } from "@legendapp/list"
import { Q } from "@nozbe/watermelondb"
import { compose } from "@nozbe/watermelondb/react"
import withObservables from "@nozbe/watermelondb/react/withObservables"
import { useFocusEffect } from "@react-navigation/native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useSelector } from "@xstate/react"
import { format, isSameDay, isToday, startOfDay } from "date-fns"
import { Option } from "effect"
import { upperFirst } from "es-toolkit"
import {
  LucideCheck,
  LucideChevronDown,
  LucideChevronUp,
  LucideListTodo,
  LucideSearch,
} from "lucide-react-native"
import DropDownPicker from "react-native-dropdown-picker"
import { catchError, of as of$ } from "rxjs"
import { useDebounceValue } from "usehooks-ts"

import { AgendaDateSetter } from "@/components/AgendaDateSetter"
import { If } from "@/components/If"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { Checkbox } from "@/components/Toggle/Checkbox"
import { View } from "@/components/View"
import db from "@/db"
import ClinicDepartmentModel from "@/db/model/ClinicDepartment"
import { AppointmentsFilters, useDBAppointmentsFilter } from "@/hooks/useDBAppointmentsFilter"
import { useDBClinicsList } from "@/hooks/useDBClinicsList"
import Appointment from "@/models/Appointment"
import Clinic from "@/models/Clinic"
import Patient from "@/models/Patient"
import type { AppointmentNavigatorParamList } from "@/navigators/AppointmentNavigator"
import { providerStore } from "@/store/provider"
import { colors } from "@/theme/colors"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { friendlyString, getAppintmentStatusColor } from "@/utils/misc"

interface AppointmentsListScreenProps
  extends NativeStackScreenProps<AppointmentNavigatorParamList, "AppointmentsList"> {}

export const AppointmentsListScreen: FC<AppointmentsListScreenProps> = ({ navigation }) => {
  const { themed } = useAppTheme()
  const {
    id: providerId,
    clinic_id,
    clinic_name,
    name: providerName,
  } = useSelector(providerStore, (state) => state.context)
  const propsClinicId = Option.getOrElse(clinic_id, () => "")
  // const clinicName = Option.getOrElse(clinic_name, () => "")

  const { appointments, clearFilters, filters, handleFiltersChange, loadMore } =
    useDBAppointmentsFilter(propsClinicId)

  const { clinics: clinicsList, isLoading: isLoadingClinics } = useDBClinicsList()
  const activeClinic = clinicsList.find((clinic) => clinic.id === filters.clinicId)

  const handleAppointmentPress = (appointment: { patientId: string; id: string }) => {
    if (!appointment.patientId) return
    navigation.navigate("AppointmentView", {
      patientId: appointment.patientId,
      appointmentId: appointment.id,
    })
  }

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
        <AppointmentListHeader
          clinicsList={clinicsList}
          clinic={activeClinic}
          clearFilters={clearFilters}
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
      }
      // ItemSeparatorComponent={ItemSeparatorComponent}
      data={appointments}
      // data={[]}
      // renderItem={({ item }) => <AppointmentItem appointment={item} />}
      renderItem={({ item }) => {
        return (
          <View px={10}>
            <AppointmentItem onPress={() => handleAppointmentPress(item)} appointment={item} />
          </View>
        )
      }}
      recycleItems={false}
      // Re-render items if the appointment status changes
      keyExtractor={(item) => `${item.id}_${item.updatedAt}`}
      ListEmptyComponent={
        <View justifyContent="center" px={10} alignItems="center" pt={"40%"}>
          <LucideListTodo size={120} color={colors.textDim} />
          <Text text="No appointments found" size="xl" />
        </View>
      }
      ListFooterComponent={<View mb={64}></View>}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      extraData={`${filters.status}_${filters.clinicId}_${filters.searchQuery}__${filters.date.toDateString()}__${filters.departmentIds}`}
      // extraData={appointmentsCount * loadedAppointmentsCount}
    />
  )
}

interface AppointmentListHeaderProps {
  clinicsList: Clinic.DBClinic[]
  clinic?: Clinic.DBClinic
  filters: AppointmentsFilters
  clearFilters: () => void
  onFiltersChange: (filters: Partial<AppointmentsFilters>) => void
}

// Add patient, clinic, and provider to the appointment
const enhanceHeader = withObservables(["clinic"], ({ clinic }: { clinic?: Clinic.DBClinic }) => ({
  clinic: clinic ? clinic.observe().pipe(catchError(() => of$(null))) : of$(null),
  departmentList: clinic
    ? db
        .get<ClinicDepartmentModel>("clinic_departments")
        .query(Q.where("clinic_id", clinic.id))
        .observe()
        .pipe(catchError(() => of$([])))
    : of$([]),
}))

const statusesList = Appointment.statusList

export const AppointmentListHeader: FC<AppointmentListHeaderProps> = enhanceHeader(
  ({
    filters,
    clearFilters,
    onFiltersChange,
    departmentList = [],
    clinicsList,
  }: {
    filters: AppointmentsFilters
    clearFilters: () => void
    onFiltersChange: (filters: Partial<AppointmentsFilters>) => void
    departmentList: ClinicDepartmentModel[]
    clinicsList: Clinic.DBClinic[]
  }) => {
    const { themed } = useAppTheme()
    const [openDropdown, setOpenDropdown] = useState<"clinic" | "status" | "department" | null>(
      null,
    )
    const [isCollapsed, setIsCollapsed] = useState(true)

    const selectedClinic = clinicsList.find((clinic) => clinic.id === filters.clinicId)
    const selectedStatus = filters.status
    const selectedDepartments = departmentList.filter((department) =>
      filters.departmentIds.includes(department.id),
    )

    return (
      <View style={themed($headerContainer)}>
        {/* Search Bar */}
        <TextField
          placeholder="Search appointments..."
          value={filters.searchQuery}
          onChangeText={(text) => onFiltersChange({ searchQuery: text })}
          style={$searchField}
          // TODO: Center the icon and add right side padding
          RightAccessory={() => <LucideSearch style={$searchIcon} />}
        />

        <If condition={isCollapsed}>
          <View>
            {selectedClinic && <Text text={`Clinic: ${selectedClinic.name}`} />}

            {selectedStatus && <Text text={`Status: ${friendlyString(selectedStatus)}`} />}

            {selectedDepartments.length > 0 && (
              <Text
                text={`Departments: ${selectedDepartments.map((department) => department.name).join(", ")}`}
              />
            )}

            <View direction="row" justifyContent="flex-end">
              <Pressable style={$collapsibleButton} onPress={() => setIsCollapsed(false)}>
                <Text text="Expand Filters" color={colors.palette.primary700} />
                <LucideChevronDown size={24} color={colors.palette.primary700} />
              </Pressable>
            </View>
          </View>
        </If>
        <If condition={!isCollapsed}>
          <View direction="row" justifyContent="flex-end">
            <Pressable style={$collapsibleButton} onPress={() => setIsCollapsed(true)}>
              <Text text="Hide Filters" color={colors.palette.primary700} />
              <LucideChevronUp size={24} color={colors.palette.primary700} />
            </Pressable>
          </View>
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
            <Text preset="formLabel" text="Department" />

            <DropDownPicker
              open={openDropdown === "department"}
              setOpen={(open) => {
                if (open as unknown as boolean) setOpenDropdown("department")
                else setOpenDropdown(null)
              }}
              modalTitle="Department"
              style={$dropDownPickerStyle}
              zIndex={990000}
              zIndexInverse={990000}
              listMode="MODAL"
              items={departmentList.map((department) => ({
                label: department.name,
                value: department.id,
              }))}
              mode="BADGE"
              multiple
              value={filters.departmentIds || ""}
              onSelectItem={(items) => {
                const data = items.map((item) => item.value).filter(Boolean)
                onFiltersChange({ departmentIds: data })
              }}
              // setValue={(cb) => {
              //   const data = cb(filters.departmentIds)
              //   onFiltersChange({ departmentIds: data })
              // }}
            />
          </View>

          <View mt={10}>
            <Text preset="formLabel" text="Status" />

            <View direction="row" flexWrap="wrap" gap={5}>
              {statusesList.map((status) => (
                <Pressable
                  style={[$statusChip, status === filters.status ? $statusChipActive : null]}
                  key={status}
                  onPress={() => {
                    onFiltersChange({ status: status })
                  }}
                >
                  <Text
                    style={[
                      status === filters.status ? $statusChipActiveText : $statusChipText,
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

          {/*<View mt={10}>
          <Text preset="formLabel" text="Status" />

          <DropDownPicker
            open={openDropdown === "status"}
            setOpen={(open) => {
              if (open as unknown as boolean) setOpenDropdown("status")
              else setOpenDropdown(null)
            }}
            modalTitle="Appointment Status"
            style={$dropDownPickerStyle}
            zIndex={990000}
            zIndexInverse={990000}
            listMode="MODAL"
            items={stringsListToOptions(Appointment.statusList, true)}
            value={filters.status || ""}
            setValue={(cb) => {
              const data = cb(filters.status)
              onFiltersChange({ status: data })
            }}
          />
        </View>*/}

          {/*<View mt={10}>
          <Checkbox
            label="Include in department visits"
            labelStyle={{
              fontSize: 14,
            }}
          />
        </View>*/}
        </If>
        <View>
          <AgendaDateSetter date={filters.date} setDate={(date) => onFiltersChange({ date })} />
        </View>
      </View>
    )
  },
)

const $collapsibleButton: ViewStyle = {
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  gap: 4,
}

const $container: ViewStyle = {
  justifyContent: "center",
}

const $text: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontFamily: typography.primary.normal,
  fontSize: 14,
  color: colors.palette.primary500,
})

// Add patient, clinic, and provider to the appointment
const enhance = compose(
  withObservables(["appointment"], ({ appointment }: { appointment: Appointment.T }) => ({
    appointment: db
      .get("appointments")
      .findAndObserve(appointment.id)
      .pipe(catchError(() => of$(null))),
    // patient: appointment.patient?.observe(),
    // patient: appointment.patient?.observe().pipe(catchError(() => of$(null))),
    // clinic: appointment.clinic?.observe().pipe(catchError(() => of$(null))),
    // provider: item.provider?.observe(),
  })),
  withObservables(
    ["appointment"],
    ({ appointment }: { appointment: Appointment.DBAppointment }) => ({
      patient: appointment?.patient ? appointment.patient.observe() : of$(null),
      clinic: appointment?.clinic ? appointment.clinic.observe() : of$(null),
    }),
  ),
)

const AppointmentItem = enhance(
  ({
    appointment,
    patient,
    clinic,
    onPress,
  }: {
    appointment: Appointment.DBAppointment
    patient: Patient.DBPatient | null | undefined
    clinic: Clinic.DBClinic | null | undefined
    onPress: () => void
  }) => {
    const { themed } = useAppTheme()

    if (!appointment) {
      return (
        <View>
          <Text text="No Appointment" size="md" />
        </View>
      )
    }

    return (
      <Pressable onPress={onPress}>
        <View style={$appointmentListItem}>
          <View direction="row" justifyContent="space-between">
            <View direction="row" alignItems="baseline" gap={4}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 100,
                  backgroundColor: appointment.metadata?.colorTag || colors.palette.neutral100,
                }}
              />
              <Text
                text={patient ? upperFirst(Patient.displayName(patient as any)) : ""}
                size="md"
              />
            </View>
            <View style={{}}>
              <Text
                color={colors.palette.primary500}
                text={appointment?.status?.replace("_", " ") || "Pending"}
                size="xxs"
              />
            </View>
          </View>
          <If condition={!!clinic && clinic.name !== undefined}>
            <Text
              color={colors.palette.primary500}
              textDecorationLine="underline"
              text={clinic?.name || ""}
              size="xs"
            />
          </If>
          <Text text={`Time: ${format(appointment.timestamp, "h:mm a")}`} size="xs" />
          <Text text={`Created at ${format(appointment.createdAt, "MMM dd, h:mm a")}`} size="xs" />
          {/* Status */}
          <If condition={appointment?.departments?.length > 0}>
            <View pt={4}>
              <Text text="Departments:" size="xs" textDecorationLine="underline" />
              <View direction="column">
                {appointment?.departments?.map((department) => (
                  <View key={department.id} direction="row" alignItems="center" gap={4}>
                    <Text text={department.name} size="xs" />
                    <Text>-</Text>
                    <View
                      style={{
                        backgroundColor: getAppintmentStatusColor(department.status)[0],
                        alignSelf: "center",
                      }}
                      py={2}
                      px={4}
                      height={10}
                      width={10}
                      borderRadius={5}
                    />
                    <Text text={friendlyString(department.status)} size="xs" />
                  </View>
                ))}
              </View>
            </View>
          </If>
        </View>
      </Pressable>
    )
  },
)

// TODO: move this to a single shared location across files
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

const $appointmentListItem: ViewStyle = {
  padding: 8,
  borderBottomWidth: 1,
  borderBottomColor: "#ccc",
  marginHorizontal: 10,
  marginVertical: 5,
  marginBottom: 10,
}

export const ItemSeparatorComponent = () => {
  const { themed } = useAppTheme()
  return <View style={themed($separator)} />
}

// Helper function to count active filters
const getActiveFilterCount = (filters: FilterState): number => {
  let count = 0
  if (filters.selectedClinicId) count++
  if (filters.selectedDepartmentIds.length > 0) count++
  if (filters.selectedStatuses.length > 0) count++
  if (filters.searchQuery.length > 0) count++
  return count
}

// Styles
const $root: ViewStyle = {
  flex: 1,
}

const $headerContainer: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  paddingTop: spacing.xl,
  backgroundColor: colors.background,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
})

const $searchField: ViewStyle = {
  marginBottom: 12,
}

const $searchIcon: ViewStyle = {
  marginRight: 8,
  alignSelf: "center",
}

const $filterToggleButton: ViewStyle = {
  flex: 1,
  marginRight: 8,
}

const $filterToggleIcon: ViewStyle = {
  marginLeft: 4,
}

const $separator: ThemedStyle<ViewStyle> = ({ colors }) => ({
  height: 1,
  backgroundColor: colors.border,
})

const $emptySubtext: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  marginTop: 8,
})
