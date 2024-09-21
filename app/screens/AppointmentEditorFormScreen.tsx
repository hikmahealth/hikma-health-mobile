import React, { FC, useState } from "react"
import { observer } from "mobx-react-lite"
import { Pressable, ViewStyle } from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { Button, Screen, Text, TextField, View } from "app/components"
import { Controller, useForm } from "react-hook-form"
import { Appointment } from "app/types"
import { defaultAppointment } from "app/db/model/Appointment"
import { cloneDeep } from "lodash"
import { colors, spacing } from "app/theme"
import { useStores } from "app/models"
import { DatePickerButton } from "app/components/DatePicker"
import { Picker } from "@react-native-picker/picker"
import { api } from "app/services/api"
import { translate } from "app/i18n"
import DatePicker from "react-native-date-picker"
import { format, set, setHours } from "date-fns"
import Toast from "react-native-root-toast"
import { useDBClinicsList } from "app/hooks/useDBClinicsList"

interface AppointmentEditorFormScreenProps extends AppStackScreenProps<"AppointmentEditorForm"> {}

// TODO: Convert the label fields to use the language strings

const durationOptions = [
  { label: "Unknown", value: 0 },
  { label: translate("xMinutes", { count: 15 }), value: 15 },
  { label: translate("xMinutes", { count: 30 }), value: 30 },
  { label: translate("xMinutes", { count: 45 }), value: 45 },
  { label: translate("xHours", { count: 1 }), value: 60 },
  { label: translate("xHours", { count: 2 }), value: 60 * 2 },
  { label: translate("xHours", { count: 3 }), value: 60 * 3 },
  { label: translate("xHours", { count: 8 }), value: 60 * 8 },
]

const reasonOptions = [
  { label: "Walk-in", value: "walk-in" },
  { label: "Doctor's Visit", value: "doctor-visit" },
  { label: "Screening", value: "screening" },
  { label: "Checkup", value: "checkup" },
  { label: "Follow-up", value: "follow-up" },
  { label: "Counselling", value: "counselling" },
  { label: "Procedure", value: "procedure" },
  { label: "Investigation", value: "investigation" },
  { label: "Other", value: "other" },
]

type AppointmentForm = Appointment & {
  currentVisitId: string | null | undefined
}

export const AppointmentEditorFormScreen: FC<AppointmentEditorFormScreenProps> = observer(
  function AppointmentEditorFormScreen({ route, navigation }) {
    // Pull in one of our MST stores
    const { provider } = useStores()
    const [isTimePickerOpen, setIsTimePickerOpen] = useState(false)
    const { clinics, isLoading } = useDBClinicsList()

    const { visitId, patientId, visitDate } = route.params
    // console.log({ visitId, patientId, visitDate })

    const {
      control,
      handleSubmit,
      formState: { isSubmitting },
      getValues,
      setValue,
      watch,
    } = useForm<AppointmentForm>({
      defaultValues: {
        ...cloneDeep(defaultAppointment),
        userId: provider.id,
        currentVisitId: visitId || null,
        clinicId: provider.clinic_id,
        patientId,
        reason: "other",
        status: "pending",
        timestamp: set(new Date(), { hours: 8, minutes: 0, seconds: 0, milliseconds: 0 }),
        fulfilledVisitId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    const onSubmit = async (submission: Appointment) => {
      // Making sure the data is complete and that the defaults are sane
      const data = {
        ...submission,
        clinicId: submission.clinicId || provider.clinic_id,
        patientId,
        userId: provider.id,
        fulfilledVisitId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      console.log(data)
      try {
        const res = await api.createAppointment(data, provider)
        Toast.show("✅ Appointment created", {
          position: Toast.positions.BOTTOM,
          containerStyle: {
            marginBottom: 100,
          },
        })
        console.log(res)
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

    const updateTime = (time: Date) => {
      setIsTimePickerOpen(false)
      setValue("timestamp", new Date(time))
    }

    return (
      <Screen style={$root} preset="scroll">
        <View gap={spacing.md}>
          <Controller
            control={control}
            name="clinicId"
            render={({ field }) => (
              <View>
                <Text preset="formLabel" text="Clinic" />
                <View style={$pickerContainer}>
                  <Picker selectedValue={field.value} onValueChange={field.onChange}>
                    {clinics.map((clinic) => (
                      <Picker.Item key={clinic.id} label={clinic.name} value={clinic.id} />
                    ))}
                  </Picker>
                </View>
              </View>
            )}
          />

          <Controller
            control={control}
            name="timestamp"
            render={({ field }) => (
              <View>
                <Text preset="formLabel" tx="appointmentEditorForm.date" />
                <DatePickerButton
                  date={field.value}
                  mode="date"
                  onDateChange={field.onChange}
                  onConfirm={field.onChange}
                />
              </View>
            )}
          />

          <View>
            <Text preset="formLabel" tx="appointmentEditorForm.time" />
            <Pressable
              style={[$pickerContainer, { justifyContent: "flex-start", padding: 10 }]}
              onPress={() => setIsTimePickerOpen(true)}
            >
              <Text>{format(getValues("timestamp"), "h:mm a")}</Text>
            </Pressable>
          </View>

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
                <Text preset="formLabel" tx="appointmentEditorForm.duration" />
                <View style={$pickerContainer}>
                  <Picker selectedValue={field.value} onValueChange={field.onChange}>
                    {durationOptions.map((option) => (
                      <Picker.Item key={option.value} label={option.label} value={option.value} />
                    ))}
                  </Picker>
                </View>
              </View>
            )}
          />

          {/* Reason is a drop down with the reason options */}
          <Controller
            control={control}
            name="reason"
            render={({ field }) => (
              <View>
                <Text preset="formLabel" tx="appointmentEditorForm.reason" />
                <View style={$pickerContainer}>
                  <Picker selectedValue={field.value} onValueChange={field.onChange}>
                    {reasonOptions.map((option) => (
                      <Picker.Item key={option.value} label={option.label} value={option.value} />
                    ))}
                  </Picker>
                </View>
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
                labelTx="appointmentEditorForm.notes"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
              />
            )}
          />
          <Button
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            tx={isSubmitting ? "loading" : "confirm"}
          />
        </View>
      </Screen>
    )
  },
)

const $root: ViewStyle = {
  flex: 1,
  padding: spacing.md,
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
