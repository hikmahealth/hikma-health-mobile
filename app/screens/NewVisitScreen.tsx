import React, { FC, useState } from "react"
import { observer } from "mobx-react-lite"
import { Pressable, ViewStyle } from "react-native"
import { AppStackParamList, AppStackScreenProps } from "app/navigators"
import { Screen, Text, View } from "app/components"
import { DatePickerButton } from "app/components/DatePicker"
import { translate } from "app/i18n"
import { useDBEventForms } from "app/hooks/useDBEventForms"
import { useStores } from "app/models"
import { ChevronRight } from "lucide-react-native"
import { colors } from "app/theme"
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
  const { patientId, visitId, visitDate } = route.params
  const [eventDate, setEventDate] = useState<number>(visitDate)

  const forms = useDBEventForms(translate("languageCode"))

  console.warn({ visitId })

  // TODO: handle provider not found
  if (!provider.isSignedIn) return <Text>Provider not found</Text>

  return (
    <Screen style={$root} preset="scroll">
      <View gap={8} pt={14}>
        <DatePickerButton
          date={new Date(eventDate)}
          theme="light"
          maximumDate={new Date()}
          onDateChange={(d) => setEventDate(d.getTime())}
        />
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
                })
              }
              style={$formListItem}
            >
              <View>
                <Text weight="bold">{form.name}</Text>
                <Text size="xs">{form.description}</Text>
              </View>
              <ChevronRight color={colors.palette.neutral500} />
            </Pressable>
          )
        })}
      </View>
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
  padding: 10,
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
