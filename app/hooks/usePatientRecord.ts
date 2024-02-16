import { useInteractionManager } from "@react-native-community/hooks";
import { useIsFocused } from "@react-navigation/native";
import database from "app/db"
import PatientModel from "app/db/model/Patient"
import { useState, useEffect } from "react"

/**
 * Patient details hook that fetches a patient by their ID from the local database
 * @param patientId - The patient ID
 * @returns {{patient: PatientModel | undefined, isLoading: boolean}} - The patient or undefined if not found
 */
export function usePatientRecord(patientId: string): { patient: PatientModel | undefined, isLoading: boolean } {
    const [patient, setPatient] = useState<PatientModel | undefined>(undefined)
    const [isLoading, setIsLoading] = useState(true)
    const interactionReady = useInteractionManager()

    const isFocused = useIsFocused();

    useEffect(() => {
        let sub = { unsubscribe: () => { } }
        if (interactionReady && isFocused) {
            sub = database.collections
                .get<PatientModel>("patients")
                .findAndObserve(patientId)
                .subscribe((patient) => {
                    setPatient(patient);
                    setIsLoading(false);
                })


        }
        return () => {
            sub.unsubscribe()
        }
    }, [patientId, isFocused, interactionReady])

    return { patient, isLoading }
}