import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { AppointmentsListScreen } from "@/screens/AppointmentsListScreen"

export type AppointmentNavigatorParamList = {
  AppointmentsList: undefined
}

const Stack = createNativeStackNavigator<AppointmentNavigatorParamList>()
export const AppointmentNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AppointmentsList" component={AppointmentsListScreen} />
    </Stack.Navigator>
  )
}
