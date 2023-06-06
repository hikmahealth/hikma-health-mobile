import { StackActions, useNavigation } from "@react-navigation/native"
import { useContext, useEffect, useState } from "react"
import { useColorScheme, Image, View, ImageStyle, ViewStyle, Alert, ToastAndroid } from "react-native"
import { TextInput, IconButton } from "react-native-paper"
import EncryptedStorage from 'react-native-encrypted-storage';
import { Text } from "../components/Text"
import { Button } from "../components/Button"
import { Screen } from "../components/Screen"

import { translate } from "../i18n"
import { HIKMA_API } from "@env"
import { useProviderStore } from "../stores/provider"
import { useSyncStore } from "../stores/sync"
import { syncDB } from "../db/sync"
import { getClinic } from "../db/api"
import { GlobalServiceContext } from "../components/SyncModal"
import { useActor } from "@xstate/react"
import database from "../db"
import { hasUnsyncedChanges } from "@nozbe/watermelondb/sync"
import LanguageToggle from "../components/LanguageToggle"

export default function Login() {
  const navigation = useNavigation()
  const isDarkmode = useColorScheme() === "dark"
  const setSyncStatus = useSyncStore((store) => store.setSyncStatus)
  const [provider, setProvider, setClinic, clinic] = useProviderStore((state) => [
    state.provider,
    state.setProvider,
    state.setClinic,
    state.clinic,
  ])
  const [isLoading, setIsLoading] = useState(false)

  const globalServices = useContext(GlobalServiceContext)
  const [state, send] = useActor(globalServices.syncService)

  const [email, setEmail] = useState("admin@hikmahealth.org")
  const [password, setPassword] = useState("HikmaAdmin25!")

  console.log(HIKMA_API)

  const signIn = async () => {
    setIsLoading(true)
    const response = await fetch(`${HIKMA_API}/api/login`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
    })
    console.log(response)
    const result = await response.json()

    // If there is an error message, then there is no user logged in
    if (result.message !== undefined) {
      setIsLoading(false)
      return Alert.alert("Login Failed", "Please check your credentials and try again")
    }

    setProvider(result)

    // Wish there was another way, API backend requires password, so we store it to use during syncs
    EncryptedStorage.setItem("provider_password", password)
    EncryptedStorage.setItem("provider_email", email);

    const hasLocalChangesToPush = await hasUnsyncedChanges({ database })

    try {
      // setSyncStatus(true);
      await syncDB({ send }, hasLocalChangesToPush)
      const clinic = (await getClinic())[0]
      clinic && setClinic({ id: clinic.id, name: clinic.name })
      ToastAndroid.show("✅ Sync Successful!", ToastAndroid.LONG)
    } catch (error) {
      // setSyncStatus(false);
      Alert.alert("Sync Error", "Error syncing your database. Make sure you have an internet connection or contact your technical lead to resolve the issue.", [], {
        cancelable: true
      })
      setIsLoading(false)
      send("COMPLETED")
      console.error("Sync failed", error)
      return
    }

    setSyncStatus(false)
  }

  const openPrivacyPolicy = () => {
    navigation.navigate("PrivacyPolicy")
  }

  const launchIcon = isDarkmode
    ? require("./../assets/images/logo_no_text.png")
    : require("./../assets/images/launch_icon.png")

  return (
    <>
      <Screen preset="fixed">
        <View style={$brandingContainer}>
          <Image source={launchIcon} style={$launchIcon} resizeMode="contain" />
          <Text variant="titleLarge">HIKMA HEALTH</Text>
        </View>

        <View style={$formContainer}>
          <TextInput
            onChangeText={setEmail}
            value={email}
            // label="Email Address"
            label={translate("login.email")}
            mode="outlined"
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            label={translate("login.password")}
            secureTextEntry
            // label="Password"
            mode="outlined"
          />

          <LanguageToggle />

          <Button
            loading={isLoading}
            disabled={isLoading}
            mode="contained"
            style={$authButton}
            onPress={signIn}
            labelStyle={{ color: "#fff" }}
          >
            {translate("login.signIn")}
          </Button>
        </View>
      </Screen>

      <IconButton
        style={{ position: "absolute", bottom: 10, left: 10 }}
        icon="information-outline"
        size={28}
        onPress={openPrivacyPolicy}
      />
    </>
  )
}

const $authButton: ViewStyle = {
  marginTop: 10,
}

const $launchIcon: ImageStyle = {
  height: 120,
  width: 120,
}

const $brandingContainer: ViewStyle = {
  paddingTop: "35%",
  paddingBottom: "5%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
}

const $formContainer: ViewStyle = {
  rowGap: 10,
  paddingHorizontal: "10%",
  maxWidth: 1000,
}
