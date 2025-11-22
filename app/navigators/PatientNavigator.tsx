import { TouchableOpacity, ViewStyle } from "react-native"
import { isRN } from "@nozbe/watermelondb/utils/common"
import { createNativeStackNavigator, NativeStackScreenProps } from "@react-navigation/native-stack"
import { useSelector } from "@xstate/react"
import { LucideArrowLeft, LucideEdit2, LucideMenu } from "lucide-react-native"

import { If } from "@/components/If"
import { SyncButtonIndicator } from "@/components/SyncButtonIndicator"
import { Text } from "@/components/Text"
import { UpdateAvailableIndicator } from "@/components/UpdateAvailableIndicator"
import { View } from "@/components/View"
import { translate } from "@/i18n/translate"
import { AppointmentEditorFormScreen } from "@/screens/AppointmentEditorFormScreen"
import { AppointmentViewScreen } from "@/screens/AppointmentViewScreen"
import { EventFormScreen } from "@/screens/EventFormScreen"
import { FormEventsListScreen } from "@/screens/FormEventsListScreen"
import { NewVisitScreen } from "@/screens/NewVisitScreen"
import { PatientPrescriptionsListScreen } from "@/screens/PatientPrescriptionsListScreen"
import { PatientRecordEditorScreen } from "@/screens/PatientRecordEditorScreen"
import { PatientsListScreen } from "@/screens/PatientsListScreen"
import { PatientViewScreen } from "@/screens/PatientViewScreen"
import { PatientVisitsListScreen } from "@/screens/PatientVisitsListScreen"
import { PrescriptionEditorFormScreen } from "@/screens/PrescriptionEditorFormScreen"
import { VisitEventsListScreen } from "@/screens/VisitEventsListScreen"
import { VitalFormScreen } from "@/screens/VitalFormScreen"
import { VitalHistoryScreen } from "@/screens/VitalHistoryScreen"
import { languageStore } from "@/store/language"
import { colors } from "@/theme/colors"

import { PharmacyNavigatorParamList } from "./PharmacyNavigator"
import { PrescriptionViewScreen } from "@/screens/PrescriptionViewScreen"
import { DispensePrescriptionItemScreen } from "@/screens/DispensePrescriptionItemScreen"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"
// import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"

export type PatientNavigatorParamList = {
  PatientsList: undefined
  PatientView: { patientId: string }
  NewVisit: {
    patientId: string
    visitId: string | null
    visitDate: number
    appointmentId?: string | null
    departmentId?: string | null
  }
  EventForm: {
    patientId: string
    visitId: string | null
    formId: string
    eventId: string | null

    visitDate?: number

    // Only present if coming from an appointment
    appointmentId?: string | null
    departmentId?: string | null
  }
  AppointmentEditorForm: {
    patientId: string
    visitId: string | null
    appointmentId: string
  }
  AppointmentView: { patientId: string; appointmentId: string; departmentId?: string }
  PatientVisitsList: { patientId: string }
  FormEventsList: { patientId: string; formId: string }
  VisitEventsList: { patientId: string; visitId: string | null; visitTimestamp?: number }
  PatientRecordEditor: { editPatientId?: string }
  VitalHistory: { patientId: string }
  VitalForm: { patientId: string }

  // Prescriptions
  PrescriptionEditorForm: PharmacyNavigatorParamList["PrescriptionEditorForm"]
  PatientPrescriptionsList: PharmacyNavigatorParamList["PatientPrescriptionsList"]
  PrescriptionView: PharmacyNavigatorParamList["PrescriptionView"]
  DispensePrescriptionItem: PharmacyNavigatorParamList["DispensePrescriptionItem"]
}

const Stack = createNativeStackNavigator<PatientNavigatorParamList>()

export type PatientStackScreenProps<T extends keyof PatientNavigatorParamList> =
  NativeStackScreenProps<PatientNavigatorParamList, T>

export const PatientNavigator = () => {
  // const $containerInsets = useSafeAreaInsetsStyle(["top", "bottom"])
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
        name="PatientsList"
        options={{
          title: translate("common:patients"),
        }}
        component={PatientsListScreen}
      />
      <Stack.Screen
        name="PatientView"
        options={{
          title: translate("patientFile:patientView"),
        }}
        component={PatientViewScreen}
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
        name="AppointmentEditorForm"
        options={{
          title: translate("appointmentEditorForm:title"),
        }}
        component={AppointmentEditorFormScreen}
      />
      <Stack.Screen name="AppointmentView" component={AppointmentViewScreen} />
      <Stack.Screen
        name="PatientVisitsList"
        options={{ title: "Visits" }}
        component={PatientVisitsListScreen}
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
        name="PrescriptionEditorForm"
        options={{ title: translate("prescriptionEditorForm:title") }}
        component={PrescriptionEditorFormScreen}
      />
      <Stack.Screen
        name="PatientPrescriptionsList"
        options={{ title: translate("common:prescriptions") }}
        component={PatientPrescriptionsListScreen}
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
    </Stack.Navigator>
  )
}

interface StackHeaderProps {
  navigation: any
  options: any
  route: any
  isRTL: boolean
  back?: any
}

export const StackHeader = ({ navigation, options, route, isRTL, back }: StackHeaderProps) => {
  const $containerInsets = useSafeAreaInsetsStyle(["top"])
  const { title } = options
  const { params } = route
  const routeName = route.name

  // Show drawer button for PatientsList screen
  const showDrawerButton = routeName === "PatientsList"
  // Only show edit button on PatientView screen when patientId is available
  const showEditButton = routeName === "PatientView" && params?.patientId

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack()
    }
  }

  const handleDrawer = () => {
    navigation.openDrawer()
  }

  const handleEdit = () => {
    if (params?.patientId) {
      navigation.navigate("PatientRecordEditor", { editPatientId: params.patientId })
    }
  }

  const leftContent = () => {
    const res = (
      <>
        <If condition={!isRTL}>
          <If condition={back}>
            <TouchableOpacity onPress={handleBack} style={$backButton}>
              <LucideArrowLeft size={24} color={colors.palette.primary700} />
            </TouchableOpacity>
          </If>
          <If condition={!back}>
            <TouchableOpacity onPress={handleDrawer} style={$backButton}>
              <LucideMenu testID="drawerButton" size={24} color={colors.palette.primary700} />
            </TouchableOpacity>
          </If>

          {/*<SyncButtonIndicator />*/}
        </If>

        <If condition={isRTL}>
          <If condition={showDrawerButton}>
            <TouchableOpacity onPress={handleBack} style={$backButton}>
              <LucideArrowLeft size={24} color={colors.palette.primary700} />
            </TouchableOpacity>
          </If>
        </If>
      </>
    )
    return res
    if (showDrawerButton && !isRTL) {
      return (
        <TouchableOpacity onPress={handleDrawer} style={$backButton}>
          <LucideMenu testID="drawerButton" size={24} color={colors.palette.primary700} />
        </TouchableOpacity>
      )
    } else if (back) {
      return (
        <>
          <TouchableOpacity onPress={handleBack} style={$backButton}>
            <LucideArrowLeft size={24} color={colors.palette.primary700} />
          </TouchableOpacity>

          <SyncButtonIndicator />
        </>
      )
    }
    return <View style={$rightContainer} />
  }

  const rightContent = () => {
    return (
      <>
        <If condition={isRTL}>
          <If condition={showDrawerButton}>
            <TouchableOpacity onPress={handleDrawer} style={$editButton}>
              <LucideMenu testID="drawerButton" size={24} color={colors.palette.primary700} />
            </TouchableOpacity>
          </If>
        </If>

        <If condition={!isRTL}>
          <If condition={showEditButton}>
            <TouchableOpacity onPress={handleEdit} style={$editButton}>
              <LucideEdit2 size={20} color={colors.palette.primary700} />
            </TouchableOpacity>
          </If>
          <View style={$headerButton}>
            <SyncButtonIndicator />
          </View>
          <UpdateAvailableIndicator containerStyle={$headerButton} />
        </If>
      </>
    )
  }

  return (
    <View style={[$headerContainer, $containerInsets]}>
      <View style={$headerContent}>
        {leftContent()}

        <View style={$titleContainer}>
          <Text preset="default" numberOfLines={1} style={$headerTitle} size="xl">
            {title}
          </Text>
        </View>

        {rightContent()}
      </View>
    </View>
  )
}

const $headerContainer: ViewStyle = {
  backgroundColor: colors.background,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  paddingTop: 8,
  paddingBottom: 8,
  paddingHorizontal: 16,
  elevation: 2,
  alignContent: "center",
  alignItems: "center",
  justifyContent: "center",
}

const $headerContent: ViewStyle = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  justifyContent: "space-between" as const,
  minHeight: 44,
}

const $backButton = {
  padding: 8,
  marginLeft: -8,
  minWidth: 44,
  alignItems: "center" as const,
  justifyContent: "center" as const,
}

const $titleContainer = {
  flex: 1,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  alignContent: "center" as const,
  paddingHorizontal: 16,
}

const $headerTitle = {
  // fontSize: 18,
  // fontWeight: "600" as const,
  color: colors.palette.neutral900,
  textAlign: "center" as const,
}

const $rightContainer = {
  minWidth: 44,
  alignItems: "center" as const,
  justifyContent: "center" as const,
}

const $editButton = {
  padding: 8,
  minWidth: 44,
  alignItems: "center" as const,
  justifyContent: "center" as const,
}

const $headerButton = {
  padding: 4,
  minWidth: 24,
  alignItems: "center" as const,
  justifyContent: "center" as const,
}
