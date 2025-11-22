import React, { FC, useEffect, useState } from "react"
import { Pressable, ViewStyle } from "react-native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useSelector } from "@xstate/react"
import { Option } from "effect"
import { ChevronRight, LucideCheckCheck } from "lucide-react-native"

import { Button } from "@/components/Button"
import { DatePickerButton } from "@/components/DatePicker"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { View } from "@/components/View"
import { useEventForms } from "@/hooks/useEventForms"
import { useVisitEvents } from "@/hooks/useVisitEvents"
import Event from "@/models/Event"
import EventForm from "@/models/EventForm"
import Visit from "@/models/Visit"
import { PatientNavigatorParamList } from "@/navigators/PatientNavigator"
import { languageStore } from "@/store/language"
import { providerStore } from "@/store/provider"
import { colors } from "@/theme/colors"

interface NewVisitScreenProps
  extends NativeStackScreenProps<PatientNavigatorParamList, "NewVisit"> {}

export const NewVisitScreen: FC<NewVisitScreenProps> = ({ route, navigation }) => {
  const { patientId, visitDate, appointmentId, departmentId } = route.params
  const visitId = Option.fromNullable(route.params.visitId)
  const language = useSelector(languageStore, (store) => store.context.language)
  const _provider = useSelector(providerStore, (state) => state.context)
  const [eventDate, setEventDate] = useState<number>(visitDate)
  const { events: eventsList, isLoading: isLoadingEvents } = useVisitEvents(visitId)
  const { forms, isLoading: isLoadingForms } = useEventForms(Option.fromNullable(language))

  /** If we are updating an existing visit, then we are just adding an event. update the title to reflect this */
  useEffect(() => {
    if (Option.isSome(visitId) && (visitId.value as string).length > 3) {
      navigation.setOptions({
        // TODO: Localize
        title: "Add Event",
      })
    }
  }, [visitId, navigation])

  const handlePrescriptionsPress = () => {
    navigation.navigate("PrescriptionEditorForm", {
      patientId,
      visitId: Option.getOrElse(visitId, () => undefined),
      eventDate,
      departmentId,
    })
  }

  // TODO: Add provider check, make sure a provider is signed in and exists
  // console.log({ isLoadingEvents, isLoadingForms })

  return (
    <Screen style={$root} preset="scroll">
      <View gap={8} pt={0}>
        <DatePickerButton
          date={new Date(eventDate)}
          theme="light"
          maximumDate={new Date()}
          onDateChange={(d) => setEventDate(d.getTime())}
        />

        {/* Moved to the patient view screen */}
        {/*<Pressable onPress={handlePrescriptionsPress} style={$formListItem}>
          <View>
            <View direction="row" gap={8}>
              {false && <LucideCheckCheck color="green" />}
              <Text weight="bold">Prescriptions</Text>
              <Text></Text>
              <View justifyContent="flex-end">
                <View
                  alignContent="center"
                  justifyContent="center"
                  alignItems="center"
                  style={$languageBadge}
                >
                  <Text text={"en"} color="white" size="xxs" />
                </View>
              </View>
            </View>
            <Text size="xs">Prescription details.</Text>
          </View>
          <ChevronRight color={colors.palette.neutral500} />
        </Pressable>*/}

        {forms.map((form, idx) => {
          return (
            <EventFormItem
              key={`formItem-${idx}`}
              form={EventForm.fromDB(form)}
              isCompleted={eventsList.find((ev) => ev.formId === form.id) !== undefined}
              onPress={() => {
                navigation.navigate("EventForm", {
                  visitId: Option.isSome(visitId) ? (visitId.value as string) : null,
                  patientId,
                  formId: form.id,
                  eventId: null,
                  appointmentId,
                  departmentId,
                })
              }}
            />
          )
        })}
      </View>

      <View my={10} />

      <Button tx="newVisit:completeVisit" onPress={() => navigation.goBack()} />
      <View style={$bottomPadding} />
    </Screen>
  )
}

type EventFormItemProps = {
  form: EventForm.T
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
              style={$languageBadge}
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

const $languageBadge: ViewStyle = {
  backgroundColor: colors.palette.primary400,
  paddingVertical: 0,
  borderRadius: 5,
  paddingHorizontal: 5,
}

const $bottomPadding: ViewStyle = {
  height: 100,
}
