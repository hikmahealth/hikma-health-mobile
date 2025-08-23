import { FC } from "react"
import { ViewStyle } from "react-native"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import type { AppStackScreenProps } from "@/navigators/AppNavigator"
// import { useNavigation } from "@react-navigation/native"

interface AppointmentsListScreenProps extends AppStackScreenProps<"AppointmentsList"> {}

export const AppointmentsListScreen: FC<AppointmentsListScreenProps> = () => {
  // Pull in navigation via hook
  // const navigation = useNavigation()
  return (
    <Screen style={$root} preset="scroll">
      <Text text="appointmentsList" />
    </Screen>
  )
}

const $root: ViewStyle = {
  flex: 1,
}
