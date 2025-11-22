import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { useSelector } from "@xstate/react"

import { translate } from "@/i18n/translate"
import { AppointmentEditorFormScreen } from "@/screens/AppointmentEditorFormScreen"
import { AppointmentsListScreen } from "@/screens/AppointmentsListScreen"
import { AppointmentViewScreen } from "@/screens/AppointmentViewScreen"
import { EventFormScreen } from "@/screens/EventFormScreen"
import { FormEventsListScreen } from "@/screens/FormEventsListScreen"
import { NewVisitScreen } from "@/screens/NewVisitScreen"
import { PatientRecordEditorScreen } from "@/screens/PatientRecordEditorScreen"
import { PatientViewScreen } from "@/screens/PatientViewScreen"
import { PatientVisitsListScreen } from "@/screens/PatientVisitsListScreen"
import { VisitEventsListScreen } from "@/screens/VisitEventsListScreen"
import { VitalFormScreen } from "@/screens/VitalFormScreen"
import { VitalHistoryScreen } from "@/screens/VitalHistoryScreen"
import { languageStore } from "@/store/language"

import { PatientNavigatorParamList, StackHeader } from "./PatientNavigator"
import { PharmacyNavigatorParamList } from "./PharmacyNavigator"
import { PharmacyViewScreen } from "@/screens/PharmacyViewScreen"
import { PrescriptionEditorFormScreen } from "@/screens/PrescriptionEditorFormScreen"
import { PrescriptionViewScreen } from "@/screens/PrescriptionViewScreen"
import { DispensePrescriptionItemScreen } from "@/screens/DispensePrescriptionItemScreen"
import { PatientPrescriptionsListScreen } from "@/screens/PatientPrescriptionsListScreen"

export type AppointmentNavigatorParamList = {
  AppointmentsList: undefined
  AppointmentView: PatientNavigatorParamList["AppointmentView"]

  // PatientNavigator
  // TODO: Its annoying that we have to repeat the PatientNavigatorParamList here
  NewVisit: PatientNavigatorParamList["NewVisit"]
  EventForm: PatientNavigatorParamList["EventForm"]
  PatientView: PatientNavigatorParamList["PatientView"]
  VitalForm: PatientNavigatorParamList["VitalForm"]
  FormEventsList: PatientNavigatorParamList["FormEventsList"]
  VitalHistory: PatientNavigatorParamList["VitalHistory"]
  VisitEventsList: PatientNavigatorParamList["VisitEventsList"]
  PatientRecordEditor: PatientNavigatorParamList["PatientRecordEditor"]
  PatientVisitsList: PatientNavigatorParamList["PatientVisitsList"]
  AppointmentEditorForm: PatientNavigatorParamList["AppointmentEditorForm"]

  // PharmacyNavigator
  PharmacyView: PharmacyNavigatorParamList["PharmacyView"]
  PrescriptionEditorForm: PharmacyNavigatorParamList["PrescriptionEditorForm"]
  PrescriptionView: PharmacyNavigatorParamList["PrescriptionView"]
  DispensePrescriptionItem: PharmacyNavigatorParamList["DispensePrescriptionItem"]
  PatientPrescriptionsList: PharmacyNavigatorParamList["PatientPrescriptionsList"]
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
        name="PatientVisitsList"
        options={{ title: "Visits" }}
        component={PatientVisitsListScreen}
      />
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
      <Stack.Screen
        name="FormEventsList"
        options={{ title: "Events" }}
        component={FormEventsListScreen}
      />
      <Stack.Screen
        name="VisitEventsList"
        options={{ title: "Events" }}
        component={VisitEventsListScreen}
      />
      <Stack.Screen
        name="PatientRecordEditor"
        options={{
          title: translate("newPatient:newPatient"),
        }}
        component={PatientRecordEditorScreen}
      />
      <Stack.Screen
        name="VitalHistory"
        options={{ title: translate("vitalHistory:title") }}
        component={VitalHistoryScreen}
      />
      <Stack.Screen
        name="VitalForm"
        options={{ title: translate("vitalForm:title") }}
        component={VitalFormScreen}
      />
      <Stack.Screen
        name="AppointmentEditorForm"
        options={{
          title: translate("appointmentEditorForm:title"),
        }}
        component={AppointmentEditorFormScreen}
      />
      <Stack.Screen
        name="PharmacyView"
        options={{ title: translate("pharmacyView:title") }}
        component={PharmacyViewScreen}
      />
      <Stack.Screen
        name="PrescriptionEditorForm"
        options={{ title: translate("prescriptionEditorForm:title") }}
        component={PrescriptionEditorFormScreen}
      />
      <Stack.Screen
        name="PrescriptionView"
        options={{ title: translate("prescriptionView:title") }}
        component={PrescriptionViewScreen}
      />
      <Stack.Screen
        name="DispensePrescriptionItem"
        options={{ title: "Dispense Medication" }}
        component={DispensePrescriptionItemScreen}
      />
      <Stack.Screen
        name="PatientPrescriptionsList"
        options={{ title: translate("common:prescriptions") }}
        component={PatientPrescriptionsListScreen}
      />
    </Stack.Navigator>
  )
}
