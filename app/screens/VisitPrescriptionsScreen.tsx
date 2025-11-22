import { FC } from "react"
import { ViewStyle } from "react-native"
import type { AppStackScreenProps } from "@/navigators/AppNavigator"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
// import { useNavigation } from "@react-navigation/native"

interface VisitPrescriptionsScreenProps extends AppStackScreenProps<"VisitPrescriptions"> {}

export const VisitPrescriptionsScreen: FC<VisitPrescriptionsScreenProps> = ({ route, navigation}) => {
  return (
    <Screen style={$root} preset="scroll">
      <Text text="visitPrescriptions" />
    </Screen>
  )
}

const $root: ViewStyle = {
  flex: 1,
  paddingHorizontal: 14,
}
