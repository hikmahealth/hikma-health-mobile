import { StackActions } from "@react-navigation/native"
import { Alert } from "react-native"
import { Button, IconButton } from "react-native-paper"
import { useActor } from "@xstate/react"
import LanguageToggle from "../components/LanguageToggle"
import { syncDB } from "../db/sync"
import { translate } from "../i18n"
import { primaryTheme } from "../styles/buttons"
import { GlobalServiceContext } from "./SyncModal"
import { useContext, useEffect } from "react"
import { hasUnsyncedChanges } from "@nozbe/watermelondb/sync"
import database from "../db"

type HeaderRightProps = {
  signOut: (resetToLogin: () => void) => () => void
  navigation: any
}

// NOTE: This is not in use, tombstone: Feb 26
export const HeaderRight = (props: HeaderRightProps) => {
  const { signOut, navigation } = props

  const globalServices = useContext(GlobalServiceContext)
  const [state, send] = useActor(globalServices.syncService)

  const resetToLogin = () => navigation.dispatch(StackActions.replace("Login", {}))

  const initSync = async () => {
    const hasLocalChangesToPush = await hasUnsyncedChanges({ database })
    try {
      await syncDB({ send }, hasLocalChangesToPush)
    } catch (error) {
      console.error("Error syncing: ", error)
    }
  }

  return (
    <>
      {/* <LanguageToggle /> */}
      {/* <Button */}
      {/*   mode="text" */}
      {/*   compact */}
      {/*    */}
      {/*   onPress={signOut(resetToLogin)}> */}
      {/*   {translate('signOut')} */}
      {/* </Button> */}
      <Button
        onPress={initSync}
        theme={primaryTheme}
        contentStyle={{ flexDirection: "row-reverse" }}
        icon={"refresh"}
      >
        {translate("sync")}
      </Button>
      {/* <IconButton */}
      {/*   icon="dots-vertical" */}
      {/*   theme={primaryTheme} */}
      {/*   size={20} */}
      {/*   onPress={() => { */}
      {/*     Alert.alert( */}
      {/*       'More options', */}
      {/*       'Mainly For development purposes & testing purposes', */}
      {/*       [ */}
      {/*         { */}
      {/*           text: 'Sign Out', */}
      {/*           onPress: signOut(resetToLogin), */}
      {/*         }, */}
      {/*         { */}
      {/*           text: 'Benchmarking', */}
      {/*           onPress: () => navigation.navigate('Benchmarking'), */}
      {/*         }, */}
      {/*       ], */}
      {/*       { */}
      {/*         cancelable: true, */}
      {/*       }, */}
      {/*     ); */}
      {/*   }} */}
      {/* /> */}
    </>
  )
}
