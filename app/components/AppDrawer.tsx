import { Image, StyleProp, TextStyle, ViewStyle, Dimensions, TouchableOpacity } from "react-native"
import { DrawerContentScrollView } from "@react-navigation/drawer"
import {
  LucideUsers,
  LucideSettings,
  LucideShield,
  LucideCalendar,
  LucideChevronRight,
} from "lucide-react-native"

import { Text } from "@/components/Text"
import { View } from "@/components/View"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { LanguageToggle } from "./LanguageToggle"
import { NetworkStatusIndicator } from "./NetworkStatusIndicator"
import { SyncButtonIndicator } from "./SyncButtonIndicator"

const { height } = Dimensions.get("window")

export interface AppDrawerProps {
  /**
   * Navigation prop from drawer navigator
   */
  navigation: any

  /**
   * Current route state
   */
  state: any

  /**
   * An optional style override useful for padding & margin.
   */
  style?: StyleProp<ViewStyle>
}

interface DrawerItem {
  name: string
  label: string
  icon: React.ComponentType<any>
  routeName: string
}

const drawerItems: DrawerItem[] = [
  {
    name: "Patients",
    label: "Patients",
    icon: LucideUsers,
    routeName: "Patients",
  },
  // {
  //   name: "Appointment",
  //   label: "Appointments",
  //   icon: LucideCalendar,
  //   routeName: "Appointment",
  // },
  {
    name: "Settings",
    label: "Settings",
    icon: LucideSettings,
    routeName: "Settings",
  },
  {
    name: "PrivacyPolicy",
    label: "Privacy Policy",
    icon: LucideShield,
    routeName: "PrivacyPolicy",
  },
]

/**
 * Custom drawer component for the app navigation
 */
export const AppDrawer = (props: AppDrawerProps) => {
  const { navigation, state, style } = props
  const $styles = [$container, style]
  const { themed } = useAppTheme()

  const launchIcon = require("@/assets/images/launch_icon.png")

  const handleItemPress = (routeName: string) => {
    navigation.navigate(routeName)
  }

  const isActiveRoute = (routeName: string) => {
    return state.routeNames[state.index] === routeName
  }

  return (
    <DrawerContentScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "space-between",
      }}
      style={$styles}
      {...props}
    >
      <View>
        {/* Logo Section */}
        <View
          pt={height * 0.08}
          pb={height * 0.04}
          direction="column"
          alignItems="center"
          justifyContent="center"
          style={{ flexGrow: 1 }}
        >
          <Image source={launchIcon} style={{ height: 160, width: 160 }} resizeMode="contain" />
          <Text size="xl">HIKMA HEALTH</Text>
        </View>

        {/* Navigation Items */}
        <View style={themed($navigationContainer)}>
          {drawerItems.map((item) => {
            const isActive = isActiveRoute(item.routeName)
            const IconComponent = item.icon

            return (
              <TouchableOpacity
                key={item.name}
                onPress={() => handleItemPress(item.routeName)}
                style={themed($drawerItem(isActive))}
              >
                <View style={themed($itemContent)}>
                  <View style={themed($leftSection)}>
                    <IconComponent size={20} color={themed($iconColor(isActive)).color} />
                    <Text style={themed($itemText(isActive))} preset="default" size="sm">
                      {item.label}
                    </Text>
                  </View>
                  <LucideChevronRight size={16} color={themed($chevronColor(isActive)).color} />
                </View>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
      <View style={{ alignSelf: "center", paddingBottom: 20 }}>
        <LanguageToggle preset="options" hideLabel size="xs" />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
          <NetworkStatusIndicator />
          <SyncButtonIndicator />
        </View>
      </View>
    </DrawerContentScrollView>
  )
}

const $container: ViewStyle = {
  flex: 1,
}

const $navigationContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.xxs,
})

const $drawerItem =
  (isActive: boolean): ThemedStyle<ViewStyle> =>
  ({ colors, spacing }) => ({
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderRadius: 8,
    backgroundColor: isActive ? colors.palette.primary50 : "transparent",
  })

const $itemContent: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
})

const $leftSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
})

const $itemText =
  (isActive: boolean): ThemedStyle<TextStyle> =>
  ({ colors, typography }) => ({
    fontFamily: isActive ? typography.primary.medium : typography.primary.normal,
    color: isActive ? colors.palette.primary600 : colors.text,
  })

const $iconColor =
  (isActive: boolean): ThemedStyle<{ color: string }> =>
  ({ colors }) => ({
    color: isActive ? colors.palette.primary600 : colors.palette.neutral600,
  })

const $chevronColor =
  (isActive: boolean): ThemedStyle<{ color: string }> =>
  ({ colors }) => ({
    color: isActive ? colors.palette.primary500 : colors.palette.neutral400,
  })
