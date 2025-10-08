import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { useSelector } from "@xstate/react"

import { translate } from "@/i18n/translate"
import { AppointmentsListScreen } from "@/screens/AppointmentsListScreen"
import { AppointmentViewScreen } from "@/screens/AppointmentViewScreen"
import { EventFormScreen } from "@/screens/EventFormScreen"
import { NewVisitScreen } from "@/screens/NewVisitScreen"
import { PatientViewScreen } from "@/screens/PatientViewScreen"
import { languageStore } from "@/store/language"

import { PatientNavigatorParamList, StackHeader } from "./PatientNavigator"

export type AppointmentNavigatorParamList = {
  AppointmentsList: undefined
  AppointmentView: PatientNavigatorParamList["AppointmentView"]
  NewVisit: PatientNavigatorParamList["NewVisit"]
  EventForm: PatientNavigatorParamList["EventForm"]
  PatientView: PatientNavigatorParamList["PatientView"]
}

const Stack = createNativeStackNavigator<AppointmentNavigatorParamList>()
export const AppointmentNavigator = () => {
  const { isRTL } = useSelector(languageStore, (state) => state.context)
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        header: ({ navigation, options, route, back }) => (
          <StackHeader
            navigation={navigation}
            isRTL={isRTL}
            options={options}
            route={route}
            back={back}
          />
        ),
      }}
    >
      <Stack.Screen
        name="AppointmentsList"
        options={{
          title: translate("appointmentsList:title"),
        }}
        component={AppointmentsListScreen}
      />
      <Stack.Screen name="AppointmentView" component={AppointmentViewScreen} />
      <Stack.Screen
        name="NewVisit"
        options={{
          title: translate("newVisit:newVisit"),
        }}
        component={NewVisitScreen}
      />
      <Stack.Screen
        name="EventForm"
        options={{
          title: translate("eventList:newEntry"),
        }}
        component={EventFormScreen}
      />
      <Stack.Screen
        name="PatientView"
        options={{
          title: translate("patientFile:patientView"),
        }}
        component={PatientViewScreen}
      />
    </Stack.Navigator>
  )
}
