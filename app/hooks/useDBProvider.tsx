import { useIsFocused } from "@react-navigation/native"
import database from "app/db"
import ClinicModel from "app/db/model/Clinic"
import UserModel from "app/db/model/User"
import { useStores } from "app/models"
import { api } from "app/services/api"
import { useState, useEffect } from "react"


/**
 * Provider details hook that fetches a provider from the auth store and the clinic from the local database
 * @returns {{provider: UserModel | null, clinic: ClinicModel | null, isLoading: boolean}} - The provider and clinic or undefined if not found
 */
export function useDBProvider(): {
    clinic: ClinicModel | null
    provider: UserModel | null
    isLoading: boolean
} {
    const { provider } = useStores()
    const [dbProvider, setDbProvider] = useState<UserModel | null>(null)
    const [clinic, setClinic] = useState<ClinicModel | null>(null)
    const isFocused = useIsFocused()
    const [isLoadingUser, setIsLoadingUser] = useState(true);
    const [isLoadingClinic, setIsLoadingClinic] = useState(true);

    useEffect(() => {
        database.get<UserModel>("users").find(provider.id).then(setDbProvider).catch(error => {
            console.error(error);
            setDbProvider({
                id: provider.id,
                name: provider.name,
                role: provider.role,
                email: provider.email,
                clinicId: provider.clinic_id,
                createdAt: new Date(),
                updatedAt: new Date(),
                isDeleted: false,
                deletedAt: null,
            } as UserModel);
        }).finally(() => {
            setIsLoadingUser(false);
        })
    }, [provider.id])

    useEffect(() => {
        api.getClinic(provider.clinic_id).then(setClinic).catch(error => {
            console.error(error);
            setClinic(null);
        }).finally(() => {
            setIsLoadingClinic(false);
        })
    }, [isFocused, provider.clinic_id])

    return {
        clinic,
        provider: dbProvider,
        isLoading: isLoadingUser || isLoadingClinic,
    }
}
