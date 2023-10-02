import { useContext } from "react"
import { ImageStyle, useColorScheme, ViewStyle, Image, TextStyle, View, Alert, ToastAndroid } from "react-native"
import { hasUnsyncedChanges } from "@nozbe/watermelondb/sync"
import {
  DrawerContentScrollView,
  DrawerItem,
  DrawerContentComponentProps,
} from "@react-navigation/drawer"

import { useActor } from "@xstate/react"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"
import database from "../db"
import { syncDB } from "../db/sync"
import { translate } from "../i18n"
import { Text } from "./Text"
import { GlobalServiceContext } from "./SyncModal"
import { useProviderStore } from "../stores/provider"
import LanguageToggle from "./LanguageToggle"

type Props = DrawerContentComponentProps

export function CustomDrawerContent(props: Props) {
  const { navigation } = props
  // const resetToLogin = () =>
  //   navigation.dispatch(StackActions.replace('Login', {}));
  const isDarkmode = useColorScheme() === "dark"

  const globalServices = useContext(GlobalServiceContext)
  const setProvider = useProviderStore((state) => state.setProvider)
  // @ts-ignore
  const [state, send] = useActor(globalServices.syncService)

  const signOut = () => {
    // FIXME: Expire server token
    setProvider(null)
  }
  const initSync = async () => {
    const hasLocalChangesToPush = await hasUnsyncedChanges({ database })
    try {
      // @ts-ignore
      await syncDB({ send }, hasLocalChangesToPush)
      ToastAndroid.show("✅ Sync Successful!", ToastAndroid.LONG)
    } catch (error) {
      Alert.alert("Sync Error", "Error syncing your database. Make sure you have an internet connection or contact your technical lead to resolve the issue.", [], {
        cancelable: true
      })
      send("COMPLETED")
      console.error("Error syncing: ", error)
    }
  }
  const launchIcon = isDarkmode
    ? require("./../assets/images/logo_no_text.png")
    : require("./../assets/images/launch_icon.png")
  return (
    <>
      <DrawerContentScrollView {...props}>
        {/* <DrawerItemList {...props} /> */}
        <View style={$brandingContainer}>
          <Image testID="hikmaLogo" source={launchIcon} style={$launchIcon} resizeMode="contain" />
          <Text variant="titleLarge">HIKMA HEALTH</Text>
        </View>

        <DrawerItem
          label={({ color, focused }) => <Text tx="drawer.patientsList" />}
          icon={({ focused, color, size }) => (
            <Icon color={color} size={size} name={"format-list-bulleted"} />
          )}
          onPress={() => navigation.navigate("PatientFlow")}
        />

        <DrawerItem
          label={({ color, focused }) => <Text tx="drawer.summaryStats" />}
          icon={({ focused, color, size }) => <Icon color={color} size={size} name={"chart-bar"} />}
          onPress={() => navigation.navigate("SummaryStats")}
        />


        {__DEV__ &&
          <DrawerItem
            label={({ color, focused }) => <Text tx="drawer.benchmarking" />}
            icon={({ focused, color, size }) => (
              <Icon color={color} size={size} name={"car-speed-limiter"} />
            )}
            onPress={() => navigation.navigate("Benchmarking")}
          />}

        <DrawerItem
          label={({ color, focused }) => <Text tx="drawer.sync" />}
          testID="syncBtn"
          icon={({ focused, color, size }) => <Icon color={color} size={size} name={"refresh"} />}
          onPress={initSync}
        />
        <DrawerItem
          icon={({ focused, color, size }) => (
            <Icon color={color} size={size} name={"location-exit"} />
          )}
          label={({ color, focused }) => <Text tx="drawer.signOut" />}
          onPress={signOut}
        />
      </DrawerContentScrollView>
      <View style={$languageItem}>
        <Icon name="translate" size={24} />
        <View style={{ flex: 1 }}>
          <LanguageToggle />
        </View>
      </View>
      <Text variant="bodySmall" style={$versionText}>
        V 2.3.7
      </Text>
    </>
  )
}

const $versionText: TextStyle = {
  textAlign: "center",
  marginBottom: 8,
}

const $languageItem: ViewStyle = {
  flex: 1,
  flexDirection: "row",
  width: "100%",
  alignItems: "center",
  rowGap: 14,
  paddingLeft: 18,
  position: "absolute",
  bottom: 12,
  alignSelf: "flex-end",
}

const $launchIcon: ImageStyle = {
  height: 120,
  width: 120,
}

const $brandingContainer: ViewStyle = {
  paddingTop: "15%",
  paddingBottom: "10%",
  marginBottom: "5%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  borderBottomWidth: 1,
  borderBottomColor: "#e0e0e0",
}
