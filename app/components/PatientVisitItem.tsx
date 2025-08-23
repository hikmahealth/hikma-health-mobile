import { FC } from "react"
import { Pressable, StyleProp, TextStyle, ViewStyle } from "react-native"
import { withObservables } from "@nozbe/watermelondb/react"
import { format, isValid } from "date-fns"
import { LucideTrash2 } from "lucide-react-native"

import { Text } from "@/components/Text"
import { translate } from "@/i18n/translate"
import { colors } from "@/theme/colors"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { If } from "./If"
import { View } from "./View"

export interface PatientVisitItemProps {
  /**
   * An optional style override useful for padding & margin.
   */
  style?: StyleProp<ViewStyle>

  /**
   * The visit object to display
   */
  visit: any

  /**
   * The clinic associated with the visit
   */
  clinic?: any

  /**
   * Callback function when the visit item is pressed
   */
  onPress: (visit: any) => void

  /**
   * Callback function when the delete action is triggered
   */
  onDelete: (visitId: string) => void
}

const enhanceVisitItem = withObservables(["visit"], ({ visit }) => ({
  visit, // shortcut for visit.observe
  clinic: visit.clinic,
}))

export const PatientVisitItem: FC<PatientVisitItemProps> = enhanceVisitItem(
  ({ visit, clinic, onPress, onDelete }: PatientVisitItemProps) => {
    return (
      <Pressable
        style={{ marginBottom: 32 }}
        testID="visitItem"
        onPress={() => onPress(visit)}
        onLongPress={() => onDelete(visit.id)}
      >
        <View style={{}}>
          <View direction="row" gap={10} justifyContent="space-between" alignItems="center">
            <Text style={{ fontSize: 18 }} text={format(visit.checkInTimestamp, "dd MMM yyyy")} />

            <Pressable onPress={() => onDelete(visit.id)}>
              <LucideTrash2 size={18} color={colors.palette.angry400} />
            </Pressable>
          </View>
          <View
            style={{
              marginVertical: 5,
              borderBottomColor: "#ccc",
              borderBottomWidth: 1,
            }}
          />
          <If condition={!!clinic}>
            <Text>
              {translate("common:clinic")}: {clinic.name}
            </Text>
          </If>
          <If condition={visit.checkInTimestamp && isValid(visit.checkInTimestamp)}>
            <Text>
              {translate("common:checkedIn")}: {format(visit.checkInTimestamp, "HH:mm a")}
            </Text>
          </If>
          <Text>
            {translate("common:provider")}: {visit.providerName}
          </Text>
        </View>
      </Pressable>
    )
  },
)

const $container: ViewStyle = {
  justifyContent: "center",
}

const $text: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontFamily: typography.primary.normal,
  fontSize: 14,
  color: colors.palette.primary500,
})
