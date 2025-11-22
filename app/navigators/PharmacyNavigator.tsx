import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { useSelector } from "@xstate/react"

import { translate } from "@/i18n/translate"
import { DispensePrescriptionItemScreen } from "@/screens/DispensePrescriptionItemScreen"
import { PatientPrescriptionsListScreen } from "@/screens/PatientPrescriptionsListScreen"
import { PharmacyViewScreen } from "@/screens/PharmacyViewScreen"
import { PrescriptionEditorFormScreen } from "@/screens/PrescriptionEditorFormScreen"
import { PrescriptionViewScreen } from "@/screens/PrescriptionViewScreen"
import { languageStore } from "@/store/language"

import { StackHeader } from "./PatientNavigator"

export type PharmacyNavigatorParamList = {
  PharmacyView: undefined
  PrescriptionEditorForm: {
    patientId: string
    prescriptionId?: string
    visitId?: string
    shouldCreateNewVisit?: boolean
  }
  PrescriptionView: {
    prescriptionId: string
  }
  DispensePrescriptionItem: {
    prescriptionItemId: string
  }
  PatientPrescriptionsList: {
    patientId: string
  }
}

const Stack = createNativeStackNavigator<PharmacyNavigatorParamList>()
export const PharmacyNavigator = () => {
  const { isRTL } = useSelector(languageStore, (state) => state.context)

  return (
    <Stack.Navigator
      screenOptions={{
        cardStyle: { backgroundColor: "transparent" },
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
