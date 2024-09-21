import React, { FC, useCallback, useState } from "react"
import { observer } from "mobx-react-lite"
import { Alert, Pressable, TextStyle, ViewStyle } from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { Button, EventListItem, If, Screen, Text, TextField, View } from "app/components"
import { colors, spacing } from "app/theme"
import {
  LucideCheck,
  LucideChevronLeft,
  LucideChevronRight,
  LucideEdit,
  LucideRefreshCw,
  LucideTrash2,
} from "lucide-react-native"
import { displayName } from "app/utils/patient"
import { format } from "date-fns"
import { useAppointmentRecord } from "app/hooks/useAppointmentRecord"
import { upperFirst } from "lodash"
import { api } from "app/services/api"
import Toast from "react-native-root-toast"
import { translate } from "app/i18n"
import DatePicker from "react-native-date-picker"
import { useDBVisitAppointments } from "app/hooks/useDBVisitAppointments"
import { useDBVisitEvents } from "app/hooks/useDBVisitEvents"
import { withObservables } from "@nozbe/watermelondb/react"
import EventModel from "app/db/model/Event"
import VisitModel from "app/db/model/Visit"
import { NavigationProp } from "@react-navigation/native"
import PatientModel from "app/db/model/Patient"
import AppointmentModel from "app/db/model/Appointment"
import { AppointmentStatus } from "app/types"
import { Picker } from "@react-native-picker/picker"
// import { useNavigation } from "@react-navigation/native"
// import { useStores } from "app/models"

const colorCodes = ["#ffffff", "#1f2937", "#991b1b", "#c2410c", "#166534", "#1e40af", "#5b21b6"]

interface AppointmentViewScreenProps extends AppStackScreenProps<"AppointmentView"> {}

// TODO: If the appointment is cancelled, then we should not show the button to mark it as complete, only show the button to reschedule
// TODO: When the reschedule button is pressed, open the date picker and update the appointment with the new date

export const AppointmentViewScreen: FC<AppointmentViewScreenProps> = observer(
  function AppointmentViewScreen({ route, navigation }) {
    // Pull in one of our MST stores
    // const { someStore, anotherStore } = useStores()

    const { appointmentId } = route.params
    const {
      appointment,
      patient,
      isLoading,
      refresh: refreshAppointment,
    } = useAppointmentRecord(appointmentId)
    const visitEvents = useDBVisitEvents(appointment?.fulfilledVisitId, patient?.id)
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
    const [isEditStatusOpen, setIsEditStatusOpen] = useState(false)

    const toggleEditStatus = () => {
      setIsEditStatusOpen((state) => !state)
    }

    if (isLoading) return <Screen style={$root} preset="scroll" />
    if (!patient || !appointment)
      return (
        <Screen style={$root} preset="scroll">
          <View style={$centerContainer}>
            <Text style={$errorText}>Appointment does not exist</Text>
          </View>
        </Screen>
      )

    const rescheduleAppointment = () => {
      Alert.alert(
        "Reschedule Appointment",
        "Are you sure you want to reschedule this appointment?",
        [
          { text: translate("cancel"), style: "cancel" },
          { text: translate("yes"), onPress: () => setIsDatePickerOpen(true) },
        ],
        {
          cancelable: true,
        },
      )
    }

    const markAppointmentComplete = () => {
      Alert.alert(
        "Mark Appointment Complete",
        "Do you want to mark this appointment as complete?",
        [
          { text: translate("cancel"), style: "cancel" },
          {
            text: translate("yes"),
            onPress: () => {
              api
                .markAppointmentComplete(appointment.id)
                .then((res) => {
                  Toast.show("✅ Appointment marked as complete", {
                    position: Toast.positions.BOTTOM,
                    containerStyle: {
                      marginBottom: 100,
                    },
                  })
                  navigation.goBack()
                })
                .catch((err) => {
                  Toast.show("❌ Error marking appointment as complete", {
                    position: Toast.positions.BOTTOM,
                    containerStyle: {
                      marginBottom: 100,
                    },
                  })
                  console.log(err)
                })
            },
          },
        ],
        {
          cancelable: true,
        },
      )
    }

    const startNewVisit = () => {
      navigation.navigate("NewVisit", {
        patientId: patient.id,
        visitId: null,
        visitDate: new Date().getTime(),
        appointmentId: appointment.id,
      })
    }

    const checkinPatient = () => {
      api
        .updateAppointment(appointment.id, { status: "checked_in" })
        .then((res) => {
          Toast.show("✅ Patient checked in", {
            position: Toast.positions.BOTTOM,
            containerStyle: {
              marginBottom: 100,
            },
          })
          refreshAppointment()
        })
        .catch((err) => {
          Toast.show("❌ Error checking in patient", {
            position: Toast.positions.BOTTOM,
            containerStyle: {
              marginBottom: 100,
            },
          })
          console.log(err)
        })
    }

    const updateAppointmentStatus = (status: AppointmentStatus) => {
      api
        .updateAppointment(appointment.id, { status })
        .then((res) => {
          Toast.show("✅ Appointment status updated", {
            position: Toast.positions.BOTTOM,
            containerStyle: {
              marginBottom: 100,
            },
          })
          refreshAppointment()
          setIsEditStatusOpen(false)
        })
        .catch((err) => {
          Toast.show("❌ Error updating appointment status", {
            position: Toast.positions.BOTTOM,
            containerStyle: {
              marginBottom: 100,
            },
          })
          console.log(err)
        })
    }

    const handleDateChange = (date: Date) => {
      // Confirm with the user that the want to reschedule to another date
      Alert.alert(
        "Reschedule Appointment",
        "Are you sure you want to reschedule this appointment to " +
          format(date, "MMM d, yyyy 'at' h:mm a") +
          "?",
        [
          { text: translate("cancel"), style: "cancel" },
          {
            text: translate("yes"),
            onPress: () => {
              api
                .updateAppointment(appointment.id, { timestamp: date, status: "pending" })
                .then((res) => {
                  Toast.show("✅ Appointment rescheduled", {
                    position: Toast.positions.BOTTOM,
                    containerStyle: {
                      marginBottom: 100,
                    },
                  })
                  navigation.goBack()
                })
                .catch((err) => {
                  Toast.show("❌ Error rescheduling appointment", {
                    position: Toast.positions.BOTTOM,
                    containerStyle: {
                      marginBottom: 100,
                    },
                  })
                  console.log(err)
                })
              setIsDatePickerOpen(false)
              console.log(date)
            },
          },
        ],
        {
          cancelable: true,
        },
      )
    }

    const openPatientFile = () => {
      navigation.navigate("PatientView", { patientId: patient.id })
    }

    const handleColorChange = (color: string) => {
      let updatedMetadata: Record<string, any>

      try {
        // Check if metadata is a valid object, if not, create a new object
        updatedMetadata =
          typeof appointment.metadata === "object" && appointment.metadata !== null
            ? { ...appointment.metadata, colorTag: color }
            : { colorTag: color }
      } catch (error) {
        console.error("Error parsing metadata:", error)
        updatedMetadata = { colorTag: color }
      }

      api
        .updateAppointment(appointment.id, {
          metadata: updatedMetadata,
        })
        .then((res) => {
          Toast.show("✅ Appointment color updated", {
            position: Toast.positions.BOTTOM,
            containerStyle: {
              marginBottom: 100,
            },
          })
          refreshAppointment()
        })
        .catch((err) => {
          Toast.show("❌ Error updating appointment color", {
            position: Toast.positions.BOTTOM,
            containerStyle: {
              marginBottom: 100,
            },
          })
          console.log(err)
        })
    }

    return (
      <Screen style={$root} preset="scroll">
        <If condition={appointment.status === "cancelled"}>
          <View direction="row" justifyContent="space-between">
            <View style={$cancelledTopLabel}>
              <Text text="Appointment cancelled" color={colors.palette.neutral100} size="xxs" />
            </View>
          </View>
        </If>
        <Text size="xxl" text={`${displayName(patient)}`} />
        <Text
          text={`Appointment Date: \n${format(appointment.timestamp, "MMM d, yyyy 'at' h:mm a")}`}
        />
        <Pressable onPress={openPatientFile}>
          <Text
            text="Open patient file"
            color={colors.palette.primary500}
            textDecorationLine="underline"
          />
        </Pressable>

        <View gap={spacing.md} pt={spacing.md}>
          <View>
            <Text size="lg" text={`Status:`} />
            <If condition={isEditStatusOpen}>
              <View style={$pickerContainer}>
                <Picker
                  selectedValue={appointment.status}
                  onValueChange={(itemValue, itemIndex) =>
                    updateAppointmentStatus(itemValue as AppointmentStatus)
                  }
                >
                  <Picker.Item label="Checked-in" value="checked_in" />
                  <Picker.Item label="Pending" value="pending" />
                  <Picker.Item label="Completed" value="completed" />
                  <Picker.Item label="Cancelled" value="cancelled" />
                </Picker>
              </View>
            </If>
            <View direction="row" gap={spacing.xs} alignItems="center">
              <Text text={`${upperFirst(appointment?.status?.replace("_", " ")) || "Pending"}`} />

              <LucideEdit onPress={toggleEditStatus} color={colors.palette.primary500} size={16} />
            </View>
          </View>
          <View>
            <Text size="lg" text={`Reason:`} />
            <Text text={`${upperFirst(appointment.reason)}`} />
          </View>
          <View>
            <Text size="lg" text={`Notes:`} />
            <Text text={`${upperFirst(appointment.notes)}`} />
          </View>
        </View>

        <View gap={spacing.md} pt={spacing.md}>
          <View>
            <Text size="lg" tx={"appointmentView.colorTagLabel"} />
            <Text tx={"appointmentView.colorTagDescription"} />
          </View>
          <View>
            <View direction="row" gap={spacing.xs}>
              {colorCodes.map((color, index) => (
                <Pressable key={index} onPress={() => handleColorChange(color)}>
                  <View
                    direction="row"
                    alignItems="center"
                    justifyContent="center"
                    style={[$colorCodeChip, { backgroundColor: color }]}
                  >
                    <If condition={appointment.metadata?.colorTag === color}>
                      <LucideCheck
                        color={
                          color === "#ffffff"
                            ? colors.palette.primary400
                            : colors.palette.neutral100
                        }
                        size={16}
                      />
                    </If>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: colors.palette.neutral300 }} my={20} />

        <If condition={appointment.status === "pending"}>
          <View py={spacing.sm}>
            <Button text="Check-in" onPress={checkinPatient} preset="defaultPrimary" />
          </View>
        </If>

        <View>
          <If condition={appointment.status === "checked_in"}>
            <View py={spacing.sm}>
              <Button
                tx="appointmentView.startNewVisit"
                onPress={startNewVisit}
                preset="defaultPrimary"
              />
            </View>

            <View py={spacing.sm}>
              <Button tx="appointmentView.markComplete" onPress={markAppointmentComplete} />
            </View>
          </If>

          <If condition={appointment.status === "pending"}>
            <View direction="row" justifyContent="center" gap={spacing.md} pt={spacing.lg}>
              <Pressable style={{ alignSelf: "center" }} onPress={rescheduleAppointment}>
                <View direction="row" gap={spacing.md} alignItems="center">
                  <LucideRefreshCw color={colors.palette.primary500} size={20} />
                  <Text tx="reschedule" />
                </View>
              </Pressable>
            </View>
          </If>

          <If condition={visitEvents.length > 0}>
            <View mt={spacing.lg}>
              <Text size="lg" text="Submitted Forms" />
              <View gap={spacing.md}>
                {visitEvents.map((event) => (
                  <AppointmentEvent
                    key={event.id}
                    event={event}
                    appointment={appointment}
                    navigation={navigation}
                    patient={patient}
                  />
                ))}
              </View>
            </View>
          </If>
        </View>

        <View style={{ height: 100 }} />

        {/* TODO: Verify that this is a valid date timestamp */}
        <DatePicker
          date={new Date(appointment.timestamp)}
          mode="datetime"
          modal
          open={isDatePickerOpen}
          onConfirm={handleDateChange}
          onCancel={() => setIsDatePickerOpen(false)}
        />
      </Screen>
    )
  },
)

const enhanceAppointmentEvent = withObservables(["event"], ({ event }) => ({
  event, // shortcut syntax for `event: event.observe()`
  visit: event.visit.observe(),
}))

type AppointmentEventProps = {
  appointment: AppointmentModel
  event: EventModel
  visit: VisitModel
  navigation: AppStackScreenProps<"AppointmentView">["navigation"]
  patient: PatientModel
}

const AppointmentEvent = enhanceAppointmentEvent(function AppointmentEvent(
  props: AppointmentEventProps,
) {
  const { event, visit, navigation, patient, appointment } = props

  const handlePress = () => {
    navigation.navigate("EventForm", {
      patientId: patient.id,
      visitId: visit.id,
      visitDate: new Date(visit.checkInTimestamp).getTime(),
      formId: event.formId,
      eventId: event.id,
      appointmentId: appointment.id,
    })
  }
  return (
    <Pressable onPress={handlePress}>
      <View style={$eventContainer} direction="row" justifyContent="space-between">
        <Text text={upperFirst(event.eventType)} />
        <LucideChevronRight color={colors.palette.neutral500} size={20} />
      </View>
    </Pressable>
  )
})

const $eventContainer: ViewStyle = {
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral300,
  paddingVertical: spacing.xs,
}

const $root: ViewStyle = {
  flex: 1,
  padding: spacing.lg,
  backgroundColor: colors.background,
}

const $cancelledTopLabel: ViewStyle = {
  backgroundColor: colors.palette.angry500,
  padding: spacing.xxs,
  borderRadius: 4,
  width: "auto",
}

const $button: ViewStyle = {
  padding: spacing.sm,
  borderColor: colors.palette.primary500,
  borderWidth: 1,
  borderRadius: 4,
}

const $cancelButton: ViewStyle = {
  borderColor: colors.error,
}

const $centerContainer: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
}

const $errorText: TextStyle = {
  fontSize: 16,
  fontWeight: "bold",
  color: colors.error,
}

const $colorCodeChip: ViewStyle = {
  width: 32,
  height: 32,
  borderRadius: 16,
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
