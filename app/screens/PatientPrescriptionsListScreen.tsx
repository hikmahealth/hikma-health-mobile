import React, { FC, useCallback, useEffect, useMemo, useState } from "react"
import { observer } from "mobx-react-lite"
import { Pressable, RefreshControl, ViewStyle } from "react-native"
import { AppStackScreenProps } from "../navigators"
import { If, Screen, Text, View } from "../components"
import PrescriptionModel, { PrescriptionStatus } from "../db/model/Prescription"
import { $pickerContainer } from "./AppointmentEditorFormScreen"
import { statusValues } from "../types"
import { Picker } from "@react-native-picker/picker"
import { openPrescriptionPage, PrescriptionListItem } from "./VisitEventsListScreen"
import { colors, spacing } from "../theme"
import { FlashList } from "@shopify/flash-list"
import { Q } from "@nozbe/watermelondb"
import database from "../db"
import { useStores } from "../models"
import { usePatientRecord } from "../hooks/usePatientRecord"
import { upperFirst } from "lodash"
import { calculateAge } from "../utils/date"

interface PatientPrescriptionsListScreenProps
  extends AppStackScreenProps<"PatientPrescriptionsList"> {}

/**
 * React hook that subscribes to all the prescriptions for a patient
 * @param patientId
 * @returns
 */
function usePatientPrescriptions(patientId: string): {
  prescriptions: PrescriptionModel[]
  isLoading: boolean
} {
  const [prescriptions, setPrescriptions] = useState<PrescriptionModel[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    const sub = database
      .get<PrescriptionModel>("prescriptions")
      .query(Q.where("patient_id", patientId))
      .observe()
      .subscribe((prescriptions) => {
        setPrescriptions(prescriptions)
        setIsLoading(false)
      })
    return () => sub.unsubscribe()
  }, [patientId])

  return { prescriptions, isLoading }
}

export const PatientPrescriptionsListScreen: FC<PatientPrescriptionsListScreenProps> = observer(
  function PatientPrescriptionsListScreen({ route, navigation }) {
    const { language, provider } = useStores()

    const { patientId, defaultStatus } = route.params
    const [status, setStatus] = useState<PrescriptionStatus>(defaultStatus)
    const { patient, isLoading: isLoadingPatient } = usePatientRecord(patientId)
    const { prescriptions, isLoading: isLoadingPrescriptions } = usePatientPrescriptions(patientId)

    // console.log({ patient })

    // patient.dateOfBirth
    // return (
    //   <>
    //     {/* <If condition={isLoadingPatient}>
    //       <Text text="Loading Patient..." />
    //     </If> */}
    //     <If condition={isLoadingPrescriptions}>
    //       <Text text="Loading Prescriptions..." />
    //     </If>
    //     {/* <If condition={!isLoadingPatient && !isLoadingPrescriptions}>
    //       <Text text="PatientPrescriptionsListScreen" />
    //     </If> */}

    //     <View p={10}>
    //       <Text text={`${prescriptions.length} prescriptions`} />
    //     </View>
    //   </>
    // )

    /** filter prescriptions by status */
    const filteredPrescriptions = useMemo(() => {
      return prescriptions.filter((prescription) => prescription.status === status)
    }, [prescriptions, status])

    // const filteredPrescriptions = prescriptions

    const handleOpenPrescriptionPage = useCallback(
      (prescription: PrescriptionModel) =>
        openPrescriptionPage(
          prescription.id,
          prescription.status,
          navigation,
          patientId,
          prescription.visitId || "",
          prescription.createdAt,
          provider,
        ),
      [navigation, patientId, provider],
    )

    const refreshPrescriptions = useCallback(() => {
      // Temporarily change the status to trigger a refetch
      setStatus((prevStatus) => {
        // Choose a different status temporarily
        const tempStatus = prevStatus === "pending" ? "prepared" : "pending"

        // Set it back to the original status after a short delay
        setTimeout(() => {
          setStatus(prevStatus)
        }, 100)

        return tempStatus
      })
    }, [])

    if (isLoadingPrescriptions || isLoadingPatient) {
      return (
        <View justifyContent="center" alignItems="center" flex={1} py={spacing.lg}>
          <Text text="Loading..." />
        </View>
      )
    }

    // console.log(filteredPrescriptions)

    // return (
    //   <Screen>
    //     <Text text="PatientPrescriptionsListScreen" />

    //     {filteredPrescriptions.map((prescription) => (
    //       <PrescriptionListItem
    //         key={prescription.id}
    //         prescription={prescription}
    //         language={language}
    //         openPrescriptionPage={() => {}}
    //       />
    //     ))}
    //   </Screen>
    // )

    return (
      <FlashList
        data={filteredPrescriptions}
        ItemSeparatorComponent={() => <View style={$separator} />}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingPrescriptions}
            onRefresh={() => {
              refreshPrescriptions()
            }}
          />
        }
        renderItem={({ item }) => (
          <PrescriptionListItem
            prescription={item}
            language={language}
            openPrescriptionPage={() =>
              openPrescriptionPage(
                item.id,
                item.status,
                navigation,
                patientId,
                item.visitId || "",
                item.createdAt,
                provider,
              )
            }
          />
        )}
        contentContainerStyle={$root}
        estimatedItemSize={200}
        ListFooterComponent={<View style={{ height: 100 }} />}
        ListHeaderComponent={
          <View gap={spacing.sm}>
            <View>
              <Text size="xl" text={`${patient?.givenName} ${patient?.surname}`} />
              {patient && <Text size="sm" text={`Age: ${calculateAge(patient.dateOfBirth)}`} />}
            </View>
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
          </View>
        }
      />
    )
  },
)

const $root: ViewStyle = {
  padding: spacing.md,
}

const $separator: ViewStyle = {
  height: 1,
  backgroundColor: colors.palette.neutral100,
}
