import { Pressable, ViewStyle } from "react-native"
import { isSameDay, isToday } from "date-fns"

import { Text } from "@/components/Text"
import { View } from "@/components/View"
import { colors } from "@/theme/colors"

export type AgendaDateSetterProps = {
  date: Date
  setDate: (date: Date) => void
}

/**
 * Date setter component to set the date of view
 * @param {date} date - The current / active date
 * @param {(date: Date) => void} setDate - The function to set the date
 */
export const AgendaDateSetter = ({ date, setDate }: AgendaDateSetterProps) => {
  const month = date.toLocaleString("default", { month: "long" })

  /**
   * Given a date d, return the dates in the future until d+n days and all the days before d until d-n days
   * @param {Date} date - The date to calculate the range for
   * @param {number} n - The number of days to include in the range
   * @returns {Date[]} An array of dates in the range
   * */
  const getRange = (date: Date, n: number): Date[] => {
    const range = []
    for (let i = -n; i <= n; i++) {
      range.push(new Date(date.getTime() + i * 24 * 60 * 60 * 1000))
    }
    return range
  }

  return (
    <View py={10}>
      <View>
        <Text text={month} size="xs" align="center" />
      </View>
      <View direction="row" justifyContent="space-around" style={$datesContainer}>
        {getRange(date, 2).map((d) => (
          <Pressable
            key={d.toISOString()}
            onPress={() => setDate(d)}
            style={[
              $dateItem,
              isSameDay(d, date) ? $activeDate : null,
              isToday(d) ? $todayDate : null,
            ]}
          >
            <Text
              color={isSameDay(d, date) ? colors.palette.neutral100 : colors.text}
              text={d.toLocaleString("default", { day: "numeric" })}
            />
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const $dateItem: ViewStyle = {
  padding: 10,
  borderRadius: 10,
  marginHorizontal: 5,
}

const $activeDate: ViewStyle = {
  backgroundColor: colors.palette.primary500,
}

const $todayDate: ViewStyle = {
  // borderBottomWidth: 2,
  // borderColor: "green",
  borderColor: colors.palette.neutral400,
  borderWidth: 1,
}

const $datesContainer: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-around",
  paddingVertical: 4,
  borderWidth: 1,
  borderColor: colors.palette.neutral400,
  borderRadius: 10,
}
