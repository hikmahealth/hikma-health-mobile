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
  const { title } = options

  const initSync = async () => {
    const hasLocalChangesToPush = await hasUnsyncedChanges({ database })
    try {
      await syncDB({ send }, hasLocalChangesToPush)
    } catch (error) {
      console.error("Error syncing: ", error)
    }
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
      <Appbar.Content title={title} />
      <Appbar.Action icon="refresh" onPress={initSync} />
    </Appbar.Header>
  )
}
