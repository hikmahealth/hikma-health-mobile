import { useStores } from "../models"
import { useEffect, useState } from "react"
import { Alert } from "react-native"
import EncryptedStorage from "react-native-encrypted-storage"


type LockWhenIdleSettings = {
    toggleLockWhenIdle: (value: boolean) => void
    state: "setting-pin" | "active" | "inactive"
    onPinTextChange: (pin: number) => void
    savePin: () => void
    startPinChange: () => void
    cancelSavePin: () => void
    lockScreenNow: () => void
    unlock: (pin: string) => Promise<boolean>
}

/**
 * React hook to manage the setting and management of lock when idle
 * @returns {LockWhenIdleSettings}
 */
export function useLockWhenIdleSettings(): LockWhenIdleSettings {
    const { appState } = useStores()
    const [state, setState] = useState<"setting-pin" | "active" | "inactive">("inactive")
    const [pin, setPin] = useState<string>("")

    // on mount, set the state to active if the user has a pin set  the apstate has lock enabled
    useEffect(() => {
        const checkForPin = async () => {
            const pin = await EncryptedStorage.getItem("lock_pin")
            if (pin && appState.lockWhenIdle) {
                setState("active")
            }
        }
        checkForPin()
    }, [])

    const toggleLockWhenIdle = async (value: boolean) => {
        if (!value) {
            setState("inactive")
            appState.setProp("lockWhenIdle", value)
            return
        }

        // Turning on lock when idle steps
        // 1. Check if the user has a pin already existing in the encrypted storage
        const pin = await EncryptedStorage.getItem("lock_pin")
        // 2a. if yes, alert that it is now active
        // 2b. if no, ask for a pin and store it in the encrypted storage - verify that the pin is atleast 4 digits
        if (pin) {
            setState("active")
            appState.setProp("lockWhenIdle", value)
        } else {
            setState("setting-pin")
        }

        // 3. alert that it is now active, with an option to lock screen now
        // 4. on lock screen, toggle state in the app state to locked
    }

    const savePin = async () => {
        if (pin.length < 4) {
            Alert.alert("Pin must be atleast 4 digits")
            return
        }
        await EncryptedStorage.setItem("lock_pin", pin)
        setState("active")
        appState.setProp("lockWhenIdle", true)
    }

    /** Check the pin against the stored one and if it matches unlock */
    const unlock = async (pin: string) => {
        const storedPin = await EncryptedStorage.getItem("lock_pin")
        if (pin === storedPin) {
            // set time to null, signifying that its not set yet
            appState.setProp("lastActiveTime", null);
            return true
        }
        return false
    }

    return {
        unlock,
        toggleLockWhenIdle,
        state,
        onPinTextChange: (pin: number) => {
            if (isNaN(pin)) {
                return
            }
            setPin(pin.toString())
        },
        savePin,
        startPinChange: () => {
            setState("setting-pin")
        },
        cancelSavePin: () => {
            setState("inactive")
        },
        lockScreenNow: () => {
            // set the app state last active time to 10 minutes ago
            appState.setProp("lastActiveTime", new Date(Date.now() - 10 * 60 * 1000).getTime())
        },
    }
}