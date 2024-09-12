import React, { FC, useMemo, useState } from "react"
import { observer } from "mobx-react-lite"
import { Dimensions, Pressable, RefreshControl, SectionList, SectionListData, TextStyle, ViewStyle } from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text, View } from "app/components"
import { withObservables } from "@nozbe/watermelondb/react"
import { colors } from "app/theme/colors"
import { addDays, addMonths, format, startOfDay, subDays } from "date-fns"
import { Appointment, AppointmentStatus } from "app/types"
import { FlashList } from "@shopify/flash-list"
import { useNavigation } from "@react-navigation/native"
import { useDBAppointmentsList } from "app/hooks/useAppointmentsList"
import AppointmentModel from "app/db/model/Appointment"
import { useStores } from "app/models"
import PatientModel from "app/db/model/Patient"
import UserModel from "app/db/model/User"
import ClinicModel from "app/db/model/Clinic"
import { displayName } from "app/utils/patient"
import { sortBy, upperFirst } from "lodash"
import { useDBClinicsList } from "app/hooks/useDBClinicsList"
import { LucideDot, LucideListTodo } from "lucide-react-native"
import { Picker } from "@react-native-picker/picker"

const { height } = Dimensions.get("screen")

interface AppointmentsListScreenProps extends AppStackScreenProps<"AppointmentsList"> { }


type AppointmentsFilters = {
  status: AppointmentStatus
  startDate: Date
  endDate: Date
  clinicId: string
}

// TODO:
// - Add support for filtering by status
// - Add support for filtering by date range

export const AppointmentsListScreen: FC<AppointmentsListScreenProps> = observer(function AppointmentsListScreen({ navigation }) {
  // Pull in one of our MST stores
  const { provider } = useStores()

  const [filters, setFilters] = useState<AppointmentsFilters>({
    status: "pending",
    startDate: startOfDay(new Date()),
    endDate: addMonths(new Date(), 1),
    clinicId: provider.clinic_id,
  })

  const [startDate, setStartDate] = useState(startOfDay(new Date()))
  const [endDate, setEndDate] = useState(addMonths(new Date(), 3))

  const { appointments: appointmentsByDate, isLoading, refresh: refreshAppointments } = useDBAppointmentsList(startDate, endDate, filters.clinicId, filters.status, 25)
  const { clinics, isLoading: isLoadingClinics } = useDBClinicsList()


  // conver the data into a format that can work with flashlist
  const sectionedAppointments: (string | AppointmentModel)[] = useMemo(() => {
    const data: (string | AppointmentModel)[] = []
    appointmentsByDate.forEach((appointmentByDate) => {
      data.push(format(appointmentByDate.date, "MMM dd, yyyy"))
      appointmentByDate.appointments.forEach((appointment) => {
        data.push(appointment)
      })
    })
    return data
  }, [appointmentsByDate])


  return (
    <FlashList
      data={sectionedAppointments}
      estimatedItemSize={80}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => {
        refreshAppointments()
      }} />}
      contentContainerStyle={{ paddingTop: 20 }}
      ListHeaderComponentStyle={{ paddingBottom: 24 }}
      ListHeaderComponent={
        <View direction="row" px={10} justifyContent="space-between" gap={12} style={{ maxWidth: height }}>
          <View flex={1}>
            <Text text="Clinic" preset="formLabel" />
            <View style={$pickerContainer}>
              <Picker
                selectedValue={filters.clinicId}
                onValueChange={(itemValue, itemIndex) => setFilters({ ...filters, clinicId: itemValue })}
              >
                {clinics.map((clinic) => (
                  <Picker.Item key={clinic.id} label={clinic.name} value={clinic.id} />
                ))}
              </Picker>
            </View>
          </View>
          <View flex={1}>
            <Text text="Status" preset="formLabel" />
            <View style={$pickerContainer}>
              <Picker
                selectedValue={filters.status}
                onValueChange={(itemValue, itemIndex) => setFilters({ ...filters, status: itemValue })}
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
      }
      ListEmptyComponent={
        <View justifyContent="center" px={10} alignItems="center" pt={"40%"} >
          <LucideListTodo size={120} color={colors.textDim} />
          <Text text="No appointments found" size="xl" />
        </View>
      }
      renderItem={({ item }: { item: string | AppointmentModel }) => {
        if (typeof item === "string") {
          // Rendering header
          return <View px={10} py={6} style={{ backgroundColor: "#ddd" }}><Text size="md" weight="semiBold">{item}</Text></View>;
        } else {
          // Render item
          return <View px={10}><AppointmentListItem key={item.id} item={item} /></View>;
        }
      }}
      // Add some space at the bottom of the list
      ListFooterComponent={<View style={{ height: 64 }}></View>}
    />
  )
})

// Add patient, clinic, and provider to the appointment
const enhance = withObservables(["item"], ({ item }: { item: AppointmentModel }) => ({
  item,
  patient: item.patient,
  // clinic: item.clinic?.observe(),
  // provider: item.provider?.observe(),
}))


const AppointmentListItem = enhance(({ item, patient }: { item: AppointmentModel, patient: PatientModel }) => {
  const navigation = useNavigation()
  return (
    <Pressable onPress={() => {
      navigation.navigate("AppointmentView", { appointmentId: item.id })
    }}>
      <View style={$appointmentListItem}>
        <View direction="row" justifyContent="space-between">
          <View direction="row" alignItems="baseline" gap={4}>
            <View style={{
              width: 10,
              height: 10,
              borderRadius: 100,
              backgroundColor: item.metadata?.colorTag || colors.palette.neutral100,
            }} />
            <Text text={upperFirst(displayName(patient))} size="md" />
          </View>
          <View style={{}}>
            <Text color={colors.palette.primary500} text={item?.status?.replace("_", " ") || "Pending"} size="xxs" />
          </View>

        </View>
        <Text text={`Time: ${format(item.timestamp, "h:mm a")}`} size="xs" />
        <Text text={`Created at ${format(item.createdAt, "MMM dd, h:mm a")}`} size="xs" />
        {/* Status */}
      </View>
    </Pressable>
  )
})

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
  justifyContent: "center",
}
