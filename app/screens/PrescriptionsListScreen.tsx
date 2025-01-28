import React, { FC, useEffect, useMemo, useState } from "react"
import { observer } from "mobx-react-lite"
import { Pressable, TextStyle, ViewStyle } from "react-native"
import { AppStackScreenProps } from "../navigators"
import { $inputWrapperStyle, Screen, Text, View } from "../components"
import PrescriptionModel, { PrescriptionStatus } from "../db/model/Prescription"
import database from "../db"
import { Q } from "@nozbe/watermelondb"
import { FlashList } from "@shopify/flash-list"
import { Picker } from "@react-native-picker/picker"
import { statusValues } from "../types"
import PatientModel from "../db/model/Patient"
import { colors, spacing } from "../theme"
import { format } from "date-fns"
import { upperFirst } from "lodash"
import { LucideChevronDown } from "lucide-react-native"
import { $pickerContainer } from "./AppointmentEditorFormScreen"
import { useDBClinicsList } from "../hooks/useDBClinicsList"
// import { useNavigation } from "@react-navigation/native"
// import { useStores } from "../models"

interface PrescriptionsListScreenProps extends AppStackScreenProps<"PrescriptionsList"> {}

/**
 * React hook that subscribes to the prescriptions table and returns the prescriptions for a given status
 * @param status - The status of the prescriptions to filter by
 * @param pickupClinicId - The ID of the clinic to filter by
 * @returns The prescriptions for a given status
 */
function useDBPrescriptionsList(
  status: string,
  pickupClinicId: string,
): {
  prescriptions: PrescriptionModel[]
  isLoading: boolean
} {
  const [prescriptions, setPrescriptions] = useState<PrescriptionModel[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const queryList = [
      Q.where("status", status),
      pickupClinicId === "all" ? null : Q.where("pickup_clinic_id", pickupClinicId),
    ].filter(Boolean)

    const sub = database
      .get<PrescriptionModel>("prescriptions")
      .query(...queryList)
      .observe()
      .subscribe((prescriptions) => {
        setPrescriptions(prescriptions)
        setIsLoading(false)
      })
    return () => sub.unsubscribe()
  }, [status, pickupClinicId])
  return { prescriptions, isLoading }
}

/**
 * Groups prescriptions by patient ID
 * @param prescriptions - The list of prescriptions to group
 * @returns An object with patient IDs as keys and arrays of prescriptions as values
 */
function groupPrescriptionsByPatient(
  prescriptions: PrescriptionModel[],
): Record<string, PrescriptionModel[]> {
  return prescriptions.reduce((groups, prescription) => {
    const patientId = prescription.patientId
    if (!groups[patientId]) {
      groups[patientId] = []
    }
    groups[patientId].push(prescription)
    return groups
  }, {} as Record<string, PrescriptionModel[]>)
}

/**
 * React hook that subscribes to patients with given IDs
 * @param patientIds - Array of patient IDs to subscribe to
 * @returns An object containing the patients and loading state
 */
function usePatientsById(patientIds: string[]): {
  patients: Record<string, PatientModel>
  isLoading: boolean
} {
  const [patients, setPatients] = useState<Record<string, PatientModel>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (patientIds.length === 0) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    const subscription = database
      .get<PatientModel>("patients")
      .query(Q.where("id", Q.oneOf(patientIds)))
      .observe()
      .subscribe((observedPatients) => {
        const patientsMap = observedPatients.reduce((acc, patient) => {
          acc[patient.id] = patient
          return acc
        }, {} as Record<string, PatientModel>)
        setPatients(patientsMap)
        setIsLoading(false)
      })

    return () => subscription.unsubscribe()
  }, [patientIds])

  return { patients, isLoading }
}

/**
 * Function to combine patients with their prescriptions
 * @param patients - Record of patient IDs to PatientModel objects
 * @param prescriptionsByPatient - Record of patient IDs to arrays of PrescriptionModel objects
 * @returns Array of objects containing patient and their prescriptions
 */
function combinePatientsPrescriptions(
  patients: Record<string, PatientModel>,
  prescriptionsByPatient: Record<string, PrescriptionModel[]>,
): { patient: PatientModel; prescriptions: PrescriptionModel[]; prescriptionsCount: number }[] {
  return Object.entries(prescriptionsByPatient).map(([patientId, prescriptions]) => {
    const patient = patients[patientId]
    return { patient, prescriptions, prescriptionsCount: prescriptions.length }
  })
}

export const PrescriptionsListScreen: FC<PrescriptionsListScreenProps> = observer(
  function PrescriptionsListScreen({ navigation }) {
    // Pull in one of our MST stores
    // const { someStore, anotherStore } = useStores()
    const [status, setStatus] = useState<PrescriptionStatus>("pending")
    const { clinics, isLoading: isLoadingClinics } = useDBClinicsList()
    const [pickupClinicId, setPickupClinicId] = useState<string>("all")
    const { prescriptions, isLoading } = useDBPrescriptionsList(status, pickupClinicId)
    const patientIds = useMemo(
      () => Object.keys(groupPrescriptionsByPatient(prescriptions)),
      [prescriptions],
    )
    const { patients, isLoading: isLoadingPatients } = usePatientsById(patientIds)

    const combinedData = useMemo(() => {
      if (isLoading || isLoadingPatients) return []
      const prescriptionsByPatient = groupPrescriptionsByPatient(prescriptions)
      return combinePatientsPrescriptions(patients, prescriptionsByPatient)
    }, [prescriptions, patients, isLoading, isLoadingPatients])

    if (isLoading) {
      return <Text text="Loading..." />
    }
    return (
      <FlashList
        data={combinedData}
        ItemSeparatorComponent={() => <View style={$separator} />}
        renderItem={({ item }) => {
          // <PatientPrescriptionGroup patient={item.patient} prescriptions={item.prescriptions} />
          if (!item.patient) {
            return null
          }
          return (
            <Pressable
              onPress={() => {
                navigation.navigate("PatientPrescriptionsList", {
                  patientId: item.patient?.id,
                  defaultStatus: status,
                })
              }}
            >
              <View
                direction="row"
                py={spacing.xxs}
                alignItems="center"
                justifyContent="space-between"
              >
                <View direction="row">
                  <Text size="lg">
                    {item.patient?.givenName} {item.patient?.surname}
                  </Text>
                </View>
                <View style={$prescriptionCount} alignItems="center" justifyContent="center">
                  <Text color={colors.palette.neutral100} size="xs">
                    {item.prescriptionsCount}
                  </Text>
                </View>
              </View>
            </Pressable>
          )
        }}
        contentContainerStyle={$root}
        estimatedItemSize={200}
        ListHeaderComponent={
          <View pb={spacing.md}>
            <View>
              <Text text="Status" />
              <View style={$pickerContainer}>
                <Picker selectedValue={status} onValueChange={setStatus}>
                  {statusValues.map((status) => (
                    <Picker.Item
                      key={status}
                      value={status}
                      label={upperFirst(status.replaceAll("-", " "))}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View>
              <Text text="Pickup Clinic" />
              <View style={$pickerContainer}>
                <Picker selectedValue={pickupClinicId} onValueChange={setPickupClinicId}>
                  <Picker.Item value={"all"} label="All" />
                  {clinics.map((c) => (
                    <Picker.Item key={c.id} value={c.id} label={upperFirst(c.name)} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        }
      />
    )
  },
)

const PatientPrescriptionGroup: FC<{
  patient: PatientModel
  prescriptions: PrescriptionModel[]
}> = observer(({ patient, prescriptions }) => {
  const [expanded, setExpanded] = useState(false)

  const toggleExpanded = () => setExpanded(!expanded)

  // console.log("Prescriptions", prescriptions)

  return (
    <View style={$groupContainer}>
      <Pressable onPress={toggleExpanded} style={$headerContainer}>
        <View style={$headerContent}>
          <Text style={$patientName}>{`${patient.givenName} ${patient.surname}`}</Text>
          <Text style={$prescriptionCount}>{`${prescriptions.length} prescription(s)`}</Text>
        </View>
        <LucideChevronDown
          size={24}
          color={colors.text}
          style={[$chevron, expanded && { transform: [{ rotate: "180deg" }] }]}
        />
      </Pressable>
      {expanded && (
        <View style={$prescriptionList}>
          {prescriptions.map((prescription) => (
            <View key={prescription.id} style={$prescriptionItem}>
              <Text style={$prescriptionDate}>
                {format(new Date(prescription.prescribedAt), "MMM d, yyyy")}
              </Text>
              <Text style={$prescriptionStatus}>
                {upperFirst(prescription.status.replaceAll("-", " "))}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
})

const $groupContainer: ViewStyle = {
  marginBottom: spacing.md,
  backgroundColor: colors.background,
  borderRadius: 8,
  overflow: "hidden",
  elevation: 2,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
}

const $headerContainer: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: spacing.sm,
  backgroundColor: colors.palette.neutral200,
}

const $headerContent: ViewStyle = {
  flex: 1,
}

const $patientName: TextStyle = {
  fontSize: 16,
  fontWeight: "bold",
  color: colors.text,
}

const $separator: ViewStyle = {
  height: 1,
  backgroundColor: colors.separator,
  marginVertical: spacing.sm,
}

const $prescriptionCount: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral100,
  backgroundColor: colors.palette.primary500,
  // padding: spacing.xs,
  height: 24,
  width: 24,
  borderRadius: 100,
}

const $chevron: ViewStyle = {
  // transition: '0.3s',
}

const $prescriptionList: ViewStyle = {
  padding: spacing.sm,
}

const $prescriptionItem: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: spacing.xs,
  borderBottomWidth: 1,
  borderBottomColor: colors.separator,
}

const $prescriptionDate: TextStyle = {
  fontSize: 14,
  color: colors.text,
}

const $prescriptionStatus: TextStyle = {
  fontSize: 14,
  color: colors.textDim,
}

const $root: ViewStyle = {
  padding: 10,
}
