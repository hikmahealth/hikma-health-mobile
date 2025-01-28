import React, { FC, useEffect, useMemo, useState } from "react"
import { observer } from "mobx-react-lite"
import { Dimensions, Pressable, RefreshControl, ViewStyle } from "react-native"
import { AppStackScreenProps } from "../navigators"
import { $inputWrapperStyle, If, Text, View } from "../components"
import { withObservables } from "@nozbe/watermelondb/react"
import { colors } from "../theme/colors"
import { addDays, endOfDay, format, startOfDay, subDays } from "date-fns"
import { AppointmentStatus } from "../types"
import { FlashList } from "@shopify/flash-list"
import { useNavigation } from "@react-navigation/native"
import { useDBAppointmentsList } from "../hooks/useAppointmentsList"
import AppointmentModel from "../db/model/Appointment"
import { useStores } from "../models"
import PatientModel from "../db/model/Patient"
import ClinicModel from "../db/model/Clinic"
import { displayName } from "../utils/patient"
import { sortBy, upperFirst } from "lodash"
import { useDBClinicsList } from "../hooks/useDBClinicsList"
import { LucideChevronDown, LucideChevronUp, LucideListTodo } from "lucide-react-native"
import { Picker } from "@react-native-picker/picker"
import DropDownPicker from "react-native-dropdown-picker"
import { translate } from "../i18n"
import { catchError, of as of$ } from "rxjs"
import usePersistedState, { useAsyncPersistedState } from "../hooks/usePersistedState"

const { height } = Dimensions.get("screen")

interface AppointmentsListScreenProps extends AppStackScreenProps<"AppointmentsList"> {}

type AppointmentsFilters = {
  status: AppointmentStatus
  startDate: Date
  endDate: Date
  clinicId: string[]
}

// TODO:
// - Add support for filtering by status
// - Add support for filtering by date range

export const AppointmentsListScreen: FC<AppointmentsListScreenProps> = observer(
  function AppointmentsListScreen({ navigation }) {
    // Pull in one of our MST stores
    const { provider } = useStores()

    const [dateRangeName, setDateRangeName] = useState<"today" | "so_far" | "upcoming">("today")
    const [activeClinicId, setActiveClinicId] = useState<string | "all">("all")
    const [showOptions, setShowOptions] = useState(false)
    const [selectedClinicIds, setSelectedClinicIds] = useAsyncPersistedState<string[]>(
      "selectedClinicIds",
      [provider.clinic_id],
    )
    const [filters, setFilters] = useState<AppointmentsFilters>({
      status: "pending",
      startDate: startOfDay(new Date()),
      endDate: endOfDay(new Date()),
      clinicId: [provider.clinic_id],
    })

    const [openDropdown, setOpenDropdown] = useState(false)

    // If the date range name changes, update the start and end date
    useEffect(() => {
      if (dateRangeName === "today") {
        setFilters({ ...filters, startDate: startOfDay(new Date()), endDate: endOfDay(new Date()) })
      } else if (dateRangeName === "so_far") {
        setFilters({
          ...filters,
          startDate: subDays(startOfDay(new Date()), 90),
          endDate: startOfDay(new Date()),
        })
      } else if (dateRangeName === "upcoming") {
        setFilters({
          ...filters,
          startDate: startOfDay(new Date()),
          endDate: endOfDay(addDays(new Date(), 30)),
        })
      }
    }, [dateRangeName])

    const {
      appointments: appointmentsByDate,
      isLoading,
      refresh: refreshAppointments,
      loadMore: loadMoreAppointments,
      appointmentsCount,
      loadedAppointmentsCount,
    } = useDBAppointmentsList(
      filters.startDate,
      filters.endDate,
      selectedClinicIds,
      filters.status,
      400,
    )
    const { clinics, isLoading: isLoadingClinics } = useDBClinicsList()

    // conver the data into a format that can work with flashlist
    const sectionedAppointments: (string | AppointmentModel)[] = useMemo(() => {
      const data: (string | AppointmentModel)[] = []
      appointmentsByDate.forEach((appointmentByDate) => {
        const filteredAppointments =
          activeClinicId === "all"
            ? appointmentByDate.appointments
            : appointmentByDate.appointments.filter((appt) => appt.clinicId === activeClinicId)
        if (filteredAppointments.length > 0) {
          data.push(
            `${format(appointmentByDate.date, "MMM dd, yyyy")} (${filteredAppointments.length})`,
          )
          filteredAppointments.forEach((appointment) => {
            data.push(appointment)
          })
        }
      })
      return data
    }, [appointmentsByDate, activeClinicId, loadedAppointmentsCount, appointmentsCount])

    const getClinicName = (clinicId: string) => {
      const clinic = clinics.find((clinic) => clinic.id === clinicId)
      return clinic?.name || "All"
    }

    const clinicAppointmentsCount = (clinicId: string) => {
      if (clinicId === "all") {
        return appointmentsCount
      }
      return appointmentsByDate.reduce((acc, item) => {
        const length = item.appointments.filter((appt) => appt.clinicId === clinicId).length
        return acc + length
      }, 0)
      // return sectionedAppointments.reduce((acc, item) => {
      //   if (typeof item === "string") {
      //     return acc
      //   }
      //   if (item.clinicId === clinicId) {
      //     return acc + 1
      //   }
      //   return acc
      // }, 0)
    }

    return (
      <FlashList
        data={sectionedAppointments}
        estimatedItemSize={80}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              refreshAppointments()
            }}
          />
        }
        contentContainerStyle={{ paddingTop: 20 }}
        ListHeaderComponentStyle={{ paddingBottom: 8 }}
        ListHeaderComponent={
          <View>
            <View
              direction="column"
              px={10}
              justifyContent="space-between"
              gap={12}
              style={{ maxWidth: height }}
            >
              <View flex={1}>
                <Text text="Clinic" preset="formLabel" />
                <DropDownPicker
                  multiple={true}
                  open={openDropdown}
                  searchable
                  style={{
                    marginTop: 4,
                    borderWidth: 1,
                    borderRadius: 4,
                    backgroundColor: colors.palette.neutral200,
                    borderColor: colors.palette.neutral400,
                    zIndex: 990000,
                    flex: 1,
                  }}
                  modalTitle={"Clinic"}
                  modalContentContainerStyle={{
                    marginTop: 4,
                    borderWidth: 1,
                    borderRadius: 4,
                    backgroundColor: colors.palette.neutral200,
                    borderColor: colors.palette.neutral400,
                    zIndex: 990000,
                    flex: 1,
                  }}
                  mode="BADGE"
                  searchPlaceholder={translate("search", { defaultValue: "Search" }) + "..."}
                  searchTextInputStyle={$inputWrapperStyle}
                  closeOnBackPressed
                  value={selectedClinicIds}
                  listMode="MODAL"
                  items={sortBy(
                    clinics.map((clinic) => ({ label: clinic.name, value: clinic.id })),
                    ["label"],
                  )}
                  setOpen={setOpenDropdown}
                  // setValue={(callback) => {
                  //   setFilters((prevFilters) => {
                  //     const data = callback(prevFilters.clinicId)
                  //     return { ...prevFilters, clinicId: data }
                  //   })
                  // }}
                  setValue={(callback) => {
                    setSelectedClinicIds(callback)
                  }}
                />
              </View>
              <View flex={1}>
                <Text text="Status" preset="formLabel" />
                <View style={$pickerContainer}>
                  <Picker
                    selectedValue={filters.status}
                    onValueChange={(itemValue, itemIndex) =>
                      setFilters({ ...filters, status: itemValue })
                    }
                    style={{
                      padding: 0,
                      margin: 0,
                    }}
                  >
                    <Picker.Item label="All" value="all" />
                    <Picker.Item label="Checked-in" value="checked_in" />
                    <Picker.Item label="Pending" value="pending" />
                    <Picker.Item label="Completed" value="completed" />
                    <Picker.Item label="Cancelled" value="cancelled" />
                  </Picker>
                </View>
              </View>
            </View>

            <If condition={showOptions}>
              <View px={10} py={6}>
                <Text text="Date Options" preset="formLabel" />

                <View direction="row" pt={8} alignItems="center" gap={12}>
                  <Pressable
                    style={dateRangeName === "today" ? $activeDateRange : $defaultDateRange}
                    onPress={() => {
                      setDateRangeName("today")
                    }}
                  >
                    <Text size="xs" text="Today" />
                  </Pressable>
                  <Pressable
                    style={dateRangeName === "so_far" ? $activeDateRange : $defaultDateRange}
                    onPress={() => {
                      setDateRangeName("so_far")
                    }}
                  >
                    <Text size="xs" text="Past dates" />
                  </Pressable>
                  <Pressable
                    style={dateRangeName === "upcoming" ? $activeDateRange : $defaultDateRange}
                    onPress={() => {
                      setDateRangeName("upcoming")
                    }}
                  >
                    <Text size="xs" text="Upcoming (30 days)" />
                  </Pressable>
                </View>
              </View>

              <If condition={selectedClinicIds.length > 1}>
                <View px={10} py={6}>
                  <Text text="Clinic Options" preset="formLabel" />

                  <View
                    direction="row"
                    pt={8}
                    style={{ flexWrap: "wrap" }}
                    alignItems="center"
                    gap={12}
                  >
                    <Pressable
                      style={activeClinicId === "all" ? $activeDateRange : $defaultDateRange}
                      onPress={() => {
                        setActiveClinicId("all")
                      }}
                    >
                      <Text size="xs" text={`All (${clinicAppointmentsCount("all")})`} />
                    </Pressable>

                    {selectedClinicIds.map((clinicId) => {
                      return (
                        <Pressable
                          key={clinicId}
                          style={activeClinicId === clinicId ? $activeDateRange : $defaultDateRange}
                          onPress={() => {
                            setActiveClinicId(clinicId)
                          }}
                        >
                          <Text
                            size="xs"
                            text={`${getClinicName(clinicId)} (${clinicAppointmentsCount(
                              clinicId,
                            )})`}
                          />
                        </Pressable>
                      )
                    })}
                  </View>
                </View>
              </If>
            </If>

            <View direction="row" justifyContent="flex-start" pt={12} px={14}>
              <Pressable
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                onPress={() => setShowOptions(!showOptions)}
              >
                <Text size="xs" text={showOptions ? "Hide Options" : "Show More Options"} />
                {showOptions ? (
                  <LucideChevronUp size={16} color={colors.palette.primary500} />
                ) : (
                  <LucideChevronDown size={16} color={colors.palette.primary500} />
                )}
              </Pressable>
            </View>

            {/* <View direction="row" justifyContent="flex-end" px={10} style={{}} pt={6}>
              <Text text={`Count: ${appointmentsCount}`} />
            </View> */}
          </View>
        }
        ListEmptyComponent={
          <View justifyContent="center" px={10} alignItems="center" pt={"40%"}>
            <LucideListTodo size={120} color={colors.textDim} />
            <Text text="No appointments found" size="xl" />
          </View>
        }
        renderItem={({ item }: { item: string | AppointmentModel }) => {
          if (typeof item === "string") {
            // Rendering header
            return (
              <View px={10} py={6} style={{ backgroundColor: "#ddd" }}>
                <Text size="md" weight="semiBold">
                  {item}
                </Text>
              </View>
            )
          } else {
            // Render item
            return (
              <View px={10}>
                <AppointmentListItem key={item.id} item={item} />
              </View>
            )
          }
        }}
        // Add some space at the bottom of the list
        ListFooterComponent={<View mb={64}></View>}
        // ListFooterComponent={
        //   <View my={10}>
        //     <If condition={loadedAppointmentsCount < appointmentsCount}>
        //       <Pressable
        //         style={{ padding: 10 }}
        //         onPress={() => {
        //           loadMoreAppointments()
        //         }}
        //       >
        //         <Text
        //           text="Load more"
        //           size="md"
        //           align="center"
        //           textDecorationLine="underline"
        //           color={colors.palette.primary500}
        //         />
        //       </Pressable>
        //     </If>
        //   </View>
        // }
        onEndReached={() => {
          loadMoreAppointments()
        }}
        onEndReachedThreshold={0.5}
        extraData={appointmentsCount * loadedAppointmentsCount}
      />
    )
  },
)

// Add patient, clinic, and provider to the appointment
const enhance = withObservables(["item"], ({ item }: { item: AppointmentModel }) => ({
  item,
  // patient: item.patient?.observe(),
  patient: item.patient?.observe().pipe(catchError(() => of$(null))),
  clinic: item.clinic?.observe().pipe(catchError(() => of$(null))),
  // provider: item.provider?.observe(),
}))
const AppointmentListItem = enhance(
  ({
    item,
    patient,
    clinic,
  }: {
    item: AppointmentModel
    patient: PatientModel | null | undefined
    clinic: ClinicModel | null | undefined
  }) => {
    const navigation = useNavigation()
    return (
      <Pressable
        onPress={() => {
          navigation.navigate("AppointmentView", { appointmentId: item.id })
        }}
      >
        <View style={$appointmentListItem}>
          <View direction="row" justifyContent="space-between">
            <View direction="row" alignItems="baseline" gap={4}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 100,
                  backgroundColor: item.metadata?.colorTag || colors.palette.neutral100,
                }}
              />
              <Text text={patient ? upperFirst(displayName(patient)) : ""} size="md" />
            </View>
            <View style={{}}>
              <Text
                color={colors.palette.primary500}
                text={item?.status?.replace("_", " ") || "Pending"}
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
          <Text text={`Time: ${format(item.timestamp, "h:mm a")}`} size="xs" />
          <Text text={`Created at ${format(item.createdAt, "MMM dd, h:mm a")}`} size="xs" />
          {/* Status */}
        </View>
      </Pressable>
    )
  },
)

const $statusContainer: ViewStyle = {
  padding: 5,
  paddingHorizontal: 10,
  backgroundColor: colors.palette.primary500,
  borderRadius: 5,
}

const $appointmentListItem: ViewStyle = {
  padding: 8,
  borderBottomWidth: 1,
  borderBottomColor: "#ccc",
  marginHorizontal: 10,
  marginVertical: 5,
  marginBottom: 10,
}

const $pickerContainer: ViewStyle = {
  width: "100%",
  flex: 1,
  backgroundColor: colors.palette.neutral200,
  borderColor: colors.palette.neutral400,
  borderWidth: 1,
  borderRadius: 4,
  padding: 0,
  margin: 0,
  justifyContent: "center",
}

const $defaultDateRange: ViewStyle = {
  padding: 4,
  paddingHorizontal: 8,
  backgroundColor: colors.palette.neutral200,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral400,
  alignSelf: "center",
}

const $activeDateRange: ViewStyle = {
  ...$defaultDateRange,
  borderWidth: 1,
  borderColor: colors.palette.primary500,
  borderRadius: 5,
}
