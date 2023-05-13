import { createDrawerNavigator } from "@react-navigation/drawer"
import { View } from "react-native"
import { Text } from "../components/Text"
import { AppBarNav } from "../components/AppBarNav"
import { CustomDrawerContent } from "../components/CustomDrawerContent"
import { Benchmarking } from "../screens/Benchmarking"
import { PatientFlow } from "./PatientFlowNavigator"
import { SummaryStats } from "../screens/SummaryStats"
import { useLanguageStore } from "../stores/language"

const Drawer = createDrawerNavigator()

const SettingsScreen = () => {
  return (
    <View>
      <Text>Settings</Text>
    </View>
  )
}

export function RootNavigator() {
  const isRtl = useLanguageStore((state) => state.isRtl)
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerPosition: isRtl ? "right" : "left",
        header: (props) => <AppBarNav {...props} />,
      }}
    >
      <Drawer.Screen
        name="PatientFlow"
        options={{
          headerShown: false,
          headerTitle: "Home",
        }}
        component={PatientFlow}
      />
      <Drawer.Screen
        name="SummaryStats"
        options={{
          title: "Summary Stats",
        }}
        component={SummaryStats}
      />
      {/* // FOR DEVELOPMENT PURPOSES ONLY */}
      <Drawer.Screen
        name="Benchmarking"
        options={{
          title: "Benchmarking",
        }}
        component={Benchmarking}
      />
    </Drawer.Navigator>
  )
}
