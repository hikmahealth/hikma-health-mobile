import { FC, useEffect, useState } from "react"
import { Platform, Pressable, ViewStyle } from "react-native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useSelector } from "@xstate/react"
import { format, set } from "date-fns"
import { Option, Schema } from "effect"
import { cloneDeep } from "es-toolkit"
import { sortBy } from "es-toolkit"
import { Controller, useForm } from "react-hook-form"
import DatePicker from "react-native-date-picker"
import DropDownPicker from "react-native-dropdown-picker"
import Toast from "react-native-root-toast"

import { Button } from "@/components/Button"
import { DatePickerButton } from "@/components/DatePicker"
import { $dropDownPickerStyle, PlatformPicker } from "@/components/PlatformPicker"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { Checkbox } from "@/components/Toggle/Checkbox"
import { View } from "@/components/View"
import database from "@/db"
import { useClinicDepartments } from "@/hooks/useClinicDepartments"
import { useDBClinicsList } from "@/hooks/useDBClinicsList"
import { translate } from "@/i18n/translate"
import Appointment from "@/models/Appointment"
import { PatientNavigatorParamList } from "@/navigators/PatientNavigator"
import { providerStore } from "@/store/provider"
import { colors } from "@/theme/colors"
import { spacing } from "@/theme/spacing"
import { If } from "@/components/If"
// import { useNavigation } from "@react-navigation/native"

interface AppointmentEditorFormScreenProps
  extends NativeStackScreenProps<PatientNavigatorParamList, "AppointmentEditorForm"> {}

const durationOptions = [
  { label: "Unknown", value: 0 },
  { label: translate("common:xMinutes", { count: 15 }), value: 15 },
  { label: translate("common:xMinutes", { count: 30 }), value: 30 },
  { label: translate("common:xMinutes", { count: 45 }), value: 45 },
  { label: translate("common:xHours", { count: 1 }), value: 60 },
  { label: translate("common:xHours", { count: 2 }), value: 60 * 2 },
  { label: translate("common:xHours", { count: 3 }), value: 60 * 3 },
  { label: translate("common:xHours", { count: 8 }), value: 60 * 8 },
]

const reasonOptions = [
  { label: "Doctor's Visit", value: "doctor-visit" },
  { label: "Screening", value: "screening" },
  { label: "Referral", value: "referral" },
  { label: "Checkup", value: "checkup" },
  { label: "Follow-up", value: "follow-up" },
  { label: "Counselling", value: "counselling" },
  { label: "Procedure", value: "procedure" },
  { label: "Investigation", value: "investigation" },
  { label: "Other", value: "other" },
]

// type AppointmentForm = Appointment & {
//   currentVisitId: string | null | undefined
// }

export const AppointmentEditorFormScreen: FC<AppointmentEditorFormScreenProps> = ({
  route,
  navigation,
}) => {
  const {
    providerId,
    clinicId: providerClinicId,
    name: providerName,
  } = useSelector(providerStore, (state) => ({
    providerId: state.context.id,
    clinicId: state.context.clinic_id,
  }))
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false)
  const { clinics, isLoading } = useDBClinicsList()

  const { visitId, patientId, visitDate } = route.params
  // console.log({ visitId, patientId, visitDate })

  const [openPicker, setOpenPicker] = useState<
    "clinic" | "duration" | "reason" | "department" | null
  >(null)
  const isIos = Platform.OS === "ios"

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
    getValues,
    setValue,
    watch,
  } = useForm<Appointment.EncodedT>({
    defaultValues: {
      ...cloneDeep(Appointment.empty),
      userId: providerId,
      currentVisitId: visitId || undefined,
      clinicId: Option.getOrUndefined(providerClinicId),
      departments: [],
      patientId,
      reason: "other",
      status: "pending",
      timestamp: set(new Date(), { hours: 17, minutes: 0, seconds: 0, milliseconds: 0 }),
      fulfilledVisitId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })

  const { data: clinicDepartments, loading: isClinicDepartmentsLoading } = useClinicDepartments(
    watch("clinicId") || "",
  )

  const onSubmit = async (submission: Appointment.EncodedT) => {
    // Making sure the data is complete and that the defaults are sane
    const data: Appointment.EncodedT = {
      ...submission,
      clinicId: submission.clinicId || Option.getOrElse(providerClinicId, () => ""),
      patientId,
      userId: providerId,
      fulfilledVisitId: null,
      // If its a walk-in, it means the patient is already here and should be checked-in.
      status: submission.isWalkIn ? "checked_in" : "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    // console.log(data)
    try {
      const res = await Appointment.DB.create(Appointment.decode(data), {
        id: providerId,
        name: providerName,
      })
      Toast.show("✅ Appointment created", {
        position: Toast.positions.BOTTOM,
        containerStyle: {
          marginBottom: 100,
        },
      })
      // React-Navigation 6 shortcut to passing a parameter to the previous screen
      // here we pop the screen and pass the visit ID to the previous screen
      // Tombstone: Oct 3rd 2025
      // navigation.dispatch((state) => {
      //   const prevRoute = state.routes[state.routes.length - 2]
      //   return CommonActions.navigate({
      //     name: prevRoute.name,
      //     params: {
      //       ...prevRoute.params,
      //       visitId: res.visitId,
      //     },
      //     merge: true,
      //   })
      // })
      navigation.goBack()
    } catch (error) {
      console.error("Failed to create appointment:", error)
      Toast.show("❌ Failed to create appointment", {
        position: Toast.positions.BOTTOM,
        containerStyle: {
          marginBottom: 100,
        },
      })
      // TODO: Handle error (e.g., show error message to user)
    }
  }

  const isWalkIn = watch("isWalkIn")
  // if the appointment is walk-in, set the date to today
  useEffect(() => {
    if (isWalkIn === true) {
      const now = new Date()
      setValue("timestamp", now)
    }
  }, [isWalkIn])

  const getDepartmentById = (departmentId: string) => {
    return clinicDepartments.find((department) => department.id === departmentId)
  }

  const handleDepartmentChange = (data: string[]) => {
    console.log({ data })
    const depts = data
      // .filter((departmentId) => clinicDepartments.some((dept) => dept.id === departmentId))
      .map((departmentId) => {
        const department = getDepartmentById(departmentId)
        console.log({ found: department, id: departmentId })
        return {
          id: departmentId,
          name: department?.name || "Unnamed Department",
          seen_at: null,
          seen_by: null,
          status: "pending",
        }
      })
    setValue("departments", depts)
  }

  const updateTime = (time: Date) => {
    // setIsTimePickerOpen(false)
    setValue("timestamp", new Date(time))
  }

  return (
    <Screen style={$root} preset="scroll">
      <View gap={spacing.md} pt={20}>
        {/* Checkbox to determine if the appointment is_walk_in or not */}
        <Controller
          control={control}
          name="isWalkIn"
          render={({ field }) => (
            <View>
              <Checkbox
                label="This is a walk-in Appointment"
                value={field.value}
                onValueChange={field.onChange}
              />
            </View>
          )}
        />

        <Controller
          control={control}
          name="clinicId"
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
                fieldKey="clinicId"
                modalTitle="Clinic"
                setValue={() => (value: string) => field.onChange(value)}
                setOpen={(value: boolean) => setOpenPicker(value ? "clinic" : null)}
                isOpen={openPicker === "clinic"}
                value={field.value}
              />
            </View>
          )}
        />

        {/* Choose the departments for the appointment */}
        <View>
          <Text preset="formLabel" tx="common:departments" />
          <DropDownPicker
            open={openPicker === "department"}
            setOpen={() => setOpenPicker("department")}
            modalTitle={translate("common:departments")}
            style={$dropDownPickerStyle}
            zIndex={990000}
            onClose={() => setOpenPicker(null)}
            zIndexInverse={990000}
            multiple
            mode="BADGE"
            listMode="MODAL"
            items={clinicDepartments.map((dept) => ({
              label: dept.name,
              value: dept.id,
            }))}
            value={
              watch("departments")?.map((department) => {
                return department.id
                return {
                  label: department.name,
                  value: department.id,
                }
              }) || []
            }
            onSelectItem={(items) => {
              // console.log({ item })
              handleDepartmentChange(items.map((it) => it.value).filter(Boolean) || [])
            }}
            // setValue={(cb) => {
            //   const depts = getValues("departments")
            //   console.log({ depts })
            //   const data = cb(depts)

            //   handleDepartmentChange(data)
            //   // TODO: add and remove the departments appropriately
            //   // setValue("departments", data || [])
            // }}
          />
        </View>

        {/* Do not allow change of date and time if is a walk in appointment. */}
        {/*This means the patient is already here. the status will be checked in*/}
        <If condition={watch("isWalkIn") === false}>
          <Controller
            control={control}
            name="timestamp"
            render={({ field }) => (
              <View>
                <Text preset="formLabel" tx="appointmentEditorForm:date" />
                <DatePickerButton
                  date={field.value}
                  mode="date"
                  disabled={watch("isWalkIn") === true}
                  onDateChange={field.onChange}
                  onConfirm={field.onChange}
                />
              </View>
            )}
          />

          <View>
            <Text preset="formLabel" tx="appointmentEditorForm:time" />
            <Pressable
              style={[$pickerContainer, { justifyContent: "flex-start", padding: 10 }]}
              disabled={watch("isWalkIn") === true}
              onPress={() => setIsTimePickerOpen(true)}
            >
              <Text>{format(getValues("timestamp"), "h:mm a")}</Text>
            </Pressable>
          </View>
        </If>

        {/*If the appointment is a walk-in, display the time in the format Today, h:mm a*/}
        <If condition={watch("isWalkIn") === true}>
          <View>
            <Text preset="formLabel" tx="appointmentEditorForm:time" />
            <Text>Today, {format(getValues("timestamp"), "h:mm a")}</Text>
          </View>
        </If>

        <DatePicker
          modal
          open={isTimePickerOpen}
          date={watch("timestamp")}
          onConfirm={updateTime}
          mode="time"
          onDateChange={updateTime}
          onCancel={() => setIsTimePickerOpen(false)}
        />

        {/* Duration is a drop down with the time options */}
        <Controller
          control={control}
          name="duration"
          render={({ field }) => (
            <View>
              <Text preset="formLabel" tx="appointmentEditorForm:duration" />
              {/* <View style={$pickerContainer}> */}
              {/* <Picker selectedValue={field.value} onValueChange={field.onChange}>
                  {durationOptions.map((option) => (
                    <Picker.Item key={option.value} label={option.label} value={option.value} />
                  ))}
                </Picker> */}

              <PlatformPicker
                isIos={isIos}
                options={durationOptions}
                fieldKey="duration"
                setValue={() => (value: string) => {
                  isNaN(Number(value)) ? field.onChange(0) : field.onChange(Number(value))
                }}
                setOpen={(value: boolean) => setOpenPicker(value ? "duration" : null)}
                isOpen={openPicker === "duration"}
                value={field.value}
                modalTitle="Duration"
              />
              {/* </View> */}
            </View>
          )}
        />

        {/* Reason is a drop down with the reason options */}
        <Controller
          control={control}
          name="reason"
          render={({ field }) => (
            <View>
              <Text preset="formLabel" tx="appointmentEditorForm:reason" />
              {/* <View style={$pickerContainer}>
                <Picker selectedValue={field.value} onValueChange={field.onChange}>
                  {reasonOptions.map((option) => (
                    <Picker.Item key={option.value} label={option.label} value={option.value} />
                  ))}
                </Picker>
              </View> */}
              <PlatformPicker
                isIos={isIos}
                options={reasonOptions}
                modalTitle="Reason"
                fieldKey="reason"
                setValue={() => (value: string) => {
                  field.onChange(value)
                }}
                setOpen={(value: boolean) => setOpenPicker(value ? "reason" : null)}
                isOpen={openPicker === "reason"}
                value={field.value}
              />
            </View>
          )}
        />

        {/* Notes is a text field */}
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              multiline
              labelTx="appointmentEditorForm:notes"
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
            />
          )}
        />
        <Button
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          tx={isSubmitting ? "common:loading" : "common:confirm"}
        />
      </View>
    </Screen>
  )
}

const $root: ViewStyle = {
  flex: 1,
  paddingHorizontal: 14,
}

export const $pickerContainer: ViewStyle = {
  width: "100%",
  flex: 1,
  backgroundColor: colors.palette.neutral200,
  borderColor: colors.palette.neutral400,
  borderWidth: 1,
  borderRadius: 4,
  justifyContent: "center",
}
