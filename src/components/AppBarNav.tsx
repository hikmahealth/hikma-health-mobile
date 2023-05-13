import * as React from "react"
import { DrawerNavigationOptions, DrawerNavigationProp } from "@react-navigation/drawer"
import { Appbar } from "react-native-paper"
import { DrawerActions, ParamListBase, RouteProp } from "@react-navigation/native"
import {
  NativeStackNavigationOptions,
  NativeStackNavigationProp,
} from "@react-navigation/native-stack"
import { syncDB } from "../db/sync"
import { hasUnsyncedChanges } from "@nozbe/watermelondb/sync"
import database from "../db"
import { useActor } from "@xstate/react"
import { GlobalServiceContext } from "./SyncModal"
import { useContext } from "react"
import { useLanguageStore } from "../stores/language"
import { Alert, ToastAndroid } from "react-native"

type Props = {
  options: DrawerNavigationOptions | NativeStackNavigationOptions
  navigation: DrawerNavigationProp<ParamListBase> | NativeStackNavigationProp<ParamListBase>
  route: RouteProp<ParamListBase>
}

export const AppBarNav = (props: Props) => {
  const { options, navigation, route } = props
  const canGoBack = navigation.canGoBack()
  const globalServices = useContext(GlobalServiceContext)
  const [state, send] = useActor(globalServices.syncService)
  const isRtl = useLanguageStore((state) => state.isRtl)
  const { title } = options

  const initSync = async () => {
    const hasLocalChangesToPush = await hasUnsyncedChanges({ database })
    try {
      await syncDB({ send }, hasLocalChangesToPush)
      ToastAndroid.show("✅ Sync Successful!", ToastAndroid.LONG)
    } catch (error) {
      Alert.alert("Sync Error", "Error syncing your database. Please contact your technical lead to resolve the issue.", [], {
        cancelable: true
      })
      console.error("Error syncing: ", error)
    }
  }

  // if the screen name is "PatientList" then do not show the back button
    // Fixes issue with state  getting mixed up with the upper drawer navigation stack
  const isPatientListPage = route.name === "PatientList"


  const $contentStyle = isRtl ? $reverse : {}
  if (isRtl) {
  return (
    <Appbar.Header elevated>
      <Appbar.Action icon="refresh" onPress={initSync} />
      <Appbar.Content style={$contentStyle} title={title} />
      {canGoBack && !isPatientListPage ? (
        <Appbar.BackAction style={{transform: [{rotate: '180deg'}]}} onPress={navigation.goBack} />
      ) : (
        <Appbar.Action
          icon="menu"
          onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
        />
      )}
    </Appbar.Header>
  )
  }

  return (
    <Appbar.Header elevated>
      {canGoBack ? (
        <Appbar.BackAction onPress={navigation.goBack} />
      ) : (
        <Appbar.Action
          icon="menu"
          onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
        />
      )}
      <Appbar.Content style={$contentStyle} title={title} />
      <Appbar.Action icon="refresh" onPress={initSync} />
    </Appbar.Header>
  )

}

const $reverse = {
  flexDirection: "row-reverse",
}
