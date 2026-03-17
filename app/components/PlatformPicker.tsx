import { ViewStyle } from "react-native"
import { Picker } from "@react-native-picker/picker"
import DropDownPicker from "react-native-dropdown-picker"

import { colors } from "@/theme/colors"

import { If } from "./If"
import { Text } from "./Text"
import { View } from "./View"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"

type BaseProps = {
  options: { label: string; value: string | number | boolean }[]
  isIos: boolean
  value: string
  label?: string
  fieldKey: string
  setValue: (key: string) => (value: string) => void
  modalTitle?: string
}

type IOSProps = BaseProps & {
  isOpen: boolean
  setOpen: (open: boolean) => void
}

type Props = BaseProps | IOSProps

export const PlatformPicker = (props: Props) => {
  const { options, fieldKey, isIos, value, setValue, label, modalTitle } = props
  const { paddingTop: safeAreaPaddingTop } = useSafeAreaInsetsStyle(["top"])

  // Only access isOpen and setOpen when isIos is true
  const isOpen = isIos && "isOpen" in props ? props.isOpen : false
  const setOpen = isIos && "setOpen" in props ? props.setOpen : undefined

  return (
    <View>
      <If condition={!isIos}>
        <View style={$pickerContainer}>
          <Picker selectedValue={value} onValueChange={setValue(fieldKey)}>
            <Picker.Item label={label || "Pick one"} value="" />
            {options.map((option) => (
              <Picker.Item key={String(option.value)} label={option.label} value={option.value} />
            ))}
          </Picker>
        </View>
      </If>

      <If condition={isIos}>
        <View mt={10}>
          <If condition={label !== undefined}>
            <Text preset="formLabel" text={label} />
          </If>

          <DropDownPicker
            open={isOpen}
            setOpen={setOpen}
            modalTitle={modalTitle || label}
            style={$dropDownPickerStyle}
            zIndex={990000}
            modalContentContainerStyle={[
              $modalContentContainerStyle,
              { paddingTop: safeAreaPaddingTop },
            ]}
            zIndexInverse={990000}
            listMode="MODAL"
            items={options}
            value={value}
            setValue={(cb) => {
              const data = cb(value)
              setValue(fieldKey)(data || "")
            }}
          />
        </View>
      </If>
    </View>
  )
}

export const $dropDownPickerStyle: ViewStyle = {
  marginTop: 2,
  borderWidth: 1,
  borderRadius: 4,
  backgroundColor: colors.palette.neutral200,
  borderColor: colors.palette.neutral400,
  zIndex: 990000,
  flex: 1,
}

export const $pickerContainer: ViewStyle = {
  width: "100%",
  flex: 1,
  backgroundColor: colors.palette.neutral200,
  borderColor: colors.palette.neutral400,
  borderWidth: 1,
  borderRadius: 4,
  justifyContent: "center",
}

const $modalContentContainerStyle: ViewStyle = {
  marginTop: 4,
  borderWidth: 1,
  borderRadius: 4,
  backgroundColor: colors.palette.neutral200,
  borderColor: colors.palette.neutral400,
  zIndex: 990000,
  flex: 1,
}
