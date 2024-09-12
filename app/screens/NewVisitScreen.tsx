import React, { FC, useEffect, useState } from "react"
import { observer } from "mobx-react-lite"
import { Pressable, ViewStyle } from "react-native"
import { AppStackParamList, AppStackScreenProps } from "app/navigators"
import { Button, If, Screen, Text, View } from "app/components"
import { DatePickerButton } from "app/components/DatePicker"
import { translate } from "app/i18n"
import { useDBEventForms } from "app/hooks/useDBEventForms"
import { useStores } from "app/models"
import { ChevronRight, LucideCalendarPlus, LucideCheckCheck } from "lucide-react-native"
import { colors } from "app/theme"
import { useDBVisitEvents } from "app/hooks/useDBVisitEvents"
// import { useNavigation } from "@react-navigation/native"
// import { useStores } from "app/models"

interface NewVisitScreenProps extends AppStackScreenProps<"NewVisit"> { }

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
        <Pressable style={$appointmentButton} onPress={() => {
          navigation.navigate("AppointmentEditorForm", {
            visitId,
            patientId,
            visitDate: eventDate,
          })
        }}>
          <View direction="row" gap={8}>
            <LucideCalendarPlus color={colors.palette.primary500} size={20} />
            <Text color={colors.palette.primary500} textDecorationLine="underline" tx={"newVisitScreen.setNewAppointment"}></Text>
          </View>
        </Pressable>

        {forms.map((form, idx) => {
          return (
            <Pressable
              key={`formItem-${idx}`}
              onPress={() =>
                navigation.navigate("EventForm", {
                  visitId,
                  patientId,
                  formId: form.id,
                  visitDate: eventDate,
                  appointmentId,
                  eventId: null,
                })
              }
              style={$formListItem}
            >
              <View>
                <View direction="row" gap={8}>
                  {eventsList.find((ev) => ev.formId === form.id) !== undefined && (
                    <LucideCheckCheck color="green" />
                  )}
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
        })}
      </View>

      <Button
        tx="newVisit.completeVisit"
        onPress={() => navigation.goBack()}
      />
      <View style={{ height: 100 }} />
    </Screen>
  )
})

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