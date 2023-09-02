import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { FormProvider, SubmitHandler, useForm } from "react-hook-form"
import { View, ViewStyle } from "react-native"
import { TextInput } from "react-native-paper"
import { RootStackParamList } from "../../App"
import { Row } from "../components/Row"
import {Screen} from "../components/Screen"
import {Text} from "../components/Text"
import {ControlledTextField} from "../components/ControlledTextField"
import {ControlledRadioGroup} from "../components/ControlledRadioGroup"
import {Button} from "../components/Button"
import { createEvent } from "../db/api"
import { translate } from "../i18n"
import { primaryTheme } from "../styles/buttons"

type Props = NativeStackScreenProps<RootStackParamList, "VitalsForm">

export type VitalsMetadata = {
  doctor: string
  heartRate: number
  systolic: number
  diastolic: number
  oxygenSaturation: number
  temperature: number
  respiratoryRate: number
  weight: number
  bloodGlucose: number
}

export function VitalsForm(props: Props) {
  const { route, navigation } = props
  const { patientId, visitId } = route.params

  const { ...formMethods } = useForm<VitalsMetadata>({
    defaultValues: {
      doctor: "Dr. Doctor",
    },
  })

  const onSubmit: SubmitHandler<VitalsMetadata> = (data) => {
    console.log({ data })

    createEvent({
      patientId: patientId,
      visitId,
      isDeleted: false,
      eventType: "Vitals",
      eventMetadata: data,
    })
      .then((res) => {
        navigation.goBack()
        console.log(res)
      })
      .catch((error) => console.error(error))
  }
  return (
    <Screen preset="scroll">
      <View style={$formContainer}>
        <FormProvider {...formMethods}>
          <ControlledTextField
            label={"Heart Rate"}
            name="heartRate"
            keyboardType="numeric"
            right={<TextInput.Affix text="BPM" />}
          />

          <View style={$row}>
            <View style={{ flex: 1 }}>
              <ControlledTextField
                label={"Systolic"}
                name="systolic"
                keyboardType="numeric"
                right={<TextInput.Affix text="mmHg" />}
              />
            </View>
            <View>
              <Text variant="titleLarge">/</Text>
            </View>
            <View style={{ flex: 1 }}>
              <ControlledTextField
                label={"Diastolic"}
                name="diastolic"
                keyboardType="numeric"
                right={<TextInput.Affix text="mmHg" />}
              />
            </View>
          </View>
          <ControlledTextField
            label={"Oxygen Saturation"}
            name="oxygenSaturation"
            keyboardType="numeric"
            right={<TextInput.Affix text="%" />}
          />

          <ControlledTextField
            label={"Temperature"}
            name="temperature"
            keyboardType="numeric"
            right={<TextInput.Affix text="°C" />}
          />
          <ControlledTextField
            label={"Respiratory Rate"}
            name="respiratoryRate"
            keyboardType="numeric"
            right={<TextInput.Affix text="BPM" />}
          />

          <ControlledTextField
            label={"Weight"}
            name="weight"
            keyboardType="numeric"
            right={<TextInput.Affix text="kg" />}
          />

          <ControlledTextField
            label={"Blood Glucose"}
            name="bloodGlucose"
            keyboardType="numeric"
            right={<TextInput.Affix text="mmol/L" />}
          />

          <Button
            mode="contained"
            theme={primaryTheme}
            onPress={formMethods.handleSubmit(onSubmit)}
          >
            Save
          </Button>
        </FormProvider>
      </View>
    </Screen>
  )
}

const $formContainer: ViewStyle = {
  rowGap: 10,
  paddingTop: 20,
}

const $row: ViewStyle = {
  flexDirection: "row",
  columnGap: 18,
  alignItems: "center",
}
