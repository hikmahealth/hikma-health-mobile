import React, { FC, useEffect, useState } from "react"
import { observer } from "mobx-react-lite"
import { Pressable, ViewStyle } from "react-native"
import { AppStackParamList, AppStackScreenProps } from "../navigators"
import { Button, If, Screen, Text, View } from "../components"
import { DatePickerButton } from "../components/DatePicker"
import { translate } from "../i18n"
import { useDBEventForms } from "../hooks/useDBEventForms"
import { useStores } from "../models"
import { ChevronRight, LucideCalendarPlus, LucideCheckCheck } from "lucide-react-native"
import { colors } from "../theme"
import { useDBVisitEvents } from "../hooks/useDBVisitEvents"
import { useDBAppointmentsList } from "../hooks/useAppointmentsList"
import { useDBVisitAppointments } from "../hooks/useDBVisitAppointments"
import EventFormModel from "../db/model/EventForm"
// import { useNavigation } from "@react-navigation/native"
// import { useStores } from "../models"

interface NewVisitScreenProps extends AppStackScreenProps<"NewVisit"> {}

export const NewVisitScreen: FC<NewVisitScreenProps> = observer(function NewVisitScreen({
  route,
  navigation,
}) {
  // Pull in one of our MST stores
  const { provider } = useStores()

  // Pull in navigation via hook
  // const navigation = useNavigation()
  const { patientId, visitId, visitDate, appointmentId } = route.params
  const [eventDate, setEventDate] = useState<number>(visitDate)

  const eventsList = useDBVisitEvents(visitId || "", patientId)
  const forms = useDBEventForms()
  const appointments = useDBVisitAppointments(visitId)
  const appointmentsCount = appointments.length

  /** If we are updating an existing visit, then we are just adding an event. update the title to reflect this */
  useEffect(() => {
    if (visitId !== undefined && visitId !== null && visitId?.length > 3) {
      navigation.setOptions({
        title: "Add Event",
      })
    }
  }, [visitId])

  // console.log({ visitId })

  // TODO: handle provider not found
  if (!provider.isSignedIn) return <Text>Provider not found</Text>

  return (
    <Screen style={$root} preset="scroll">
      <View gap={8} pt={0}>
        <DatePickerButton
          date={new Date(eventDate)}
          theme="light"
          maximumDate={new Date()}
          onDateChange={(d) => setEventDate(d.getTime())}
        />
        {/** Button to set a new appointment */}
        <Pressable
          style={$appointmentButton}
          onPress={() => {
            navigation.navigate("AppointmentEditorForm", {
              visitId,
              patientId,
              visitDate: eventDate,
            })
          }}
        >
          <View direction="row" gap={8}>
            <LucideCalendarPlus color={colors.palette.primary500} size={20} />
            <Text
              color={colors.palette.primary500}
              textDecorationLine="underline"
              text={`${translate("newVisitScreen.setNewAppointment")} (${appointmentsCount})`}
            ></Text>
          </View>
        </Pressable>

        <EventFormItem
          form={
            {
              language: "en",
              description: "A form to add prescriptions to the patient",
              name: "Prescriptions",
            } as EventFormModel
          }
          isCompleted={false}
          onPress={() => {
            navigation.navigate("PrescriptionEditorForm", {
              visitId,
              patientId,
              visitDate: eventDate,
            })
          }}
        />

        {forms.map((form, idx) => {
          return (
            <EventFormItem
              key={`formItem-${idx}`}
              form={form}
              isCompleted={eventsList.find((ev) => ev.formId === form.id) !== undefined}
              onPress={() => {
                navigation.navigate("EventForm", {
                  visitId,
                  patientId,
                  formId: form.id,
                  visitDate: eventDate,
                  appointmentId,
                  eventId: null,
                })
              }}
            />
          )
        })}
      </View>

      <Button tx="newVisit.completeVisit" onPress={() => navigation.goBack()} />
      <View style={{ height: 100 }} />
    </Screen>
  )
})

type EventFormItemProps = {
  form: EventFormModel
  isCompleted: boolean
  onPress: () => void
}

/**
 * EventForm Item
 */
function EventFormItem({ form, onPress, isCompleted }: EventFormItemProps) {
  return (
    <Pressable onPress={onPress} style={$formListItem}>
      <View>
        <View direction="row" gap={8}>
          {isCompleted && <LucideCheckCheck color="green" />}
          <Text weight="bold">{form.name}</Text>
          <Text></Text>
          <View justifyContent="flex-end">
            <View
              alignContent="center"
              justifyContent="center"
              alignItems="center"
              style={{
                backgroundColor: colors.palette.primary400,
                paddingVertical: 0,
                borderRadius: 5,
                paddingHorizontal: 5,
              }}
            >
              <Text text={form.language} color="white" size="xxs" />
            </View>
          </View>
        </View>
        <Text size="xs">{form.description}</Text>
      </View>
      <ChevronRight color={colors.palette.neutral500} />
    </Pressable>
  )
}

const $root: ViewStyle = {
  flex: 1,
  padding: 10,
  paddingTop: 0,
}

const $formListItem: ViewStyle = {
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 10,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
}

const $appointmentButton: ViewStyle = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: 4,
  paddingTop: 10,
  // padding: 10,
}
