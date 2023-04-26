import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { View, ViewStyle } from "react-native"
import { Event } from "../types/Event"
import {Screen} from "../components/Screen"
import {Text} from "../components/Text"
import {ControlledTextField} from "../components/ControlledTextField"
import {ControlledRadioGroup} from "../components/ControlledRadioGroup"
import {Button} from "../components/Button"
import { useForm, SubmitHandler, FormProvider } from "react-hook-form"
import { translate } from "../i18n"
import { createEvent } from "../db/api"
import { primaryTheme } from "../styles/buttons"
import { PatientFlowParamList } from "../navigators/PatientFlowNavigator"

type Props = NativeStackScreenProps<PatientFlowParamList, "MedicalHistoryForm">

export type MedicalHistoryMetadata = {
  doctor: string
  allergies: string
  surgeryHx: string
  chronicConditions: string
  currentMedications: string
  vaccinations: string
}

export function MedicalHistoryForm(props: Props) {
  const { route, navigation } = props
  const { patientId, visitId } = route.params

  const { ...formMethods } = useForm<MedicalHistoryMetadata>({
    defaultValues: {},
  })

  const onSubmit: SubmitHandler<MedicalHistoryMetadata> = (data) => {
    console.log({ data })
    createEvent({
      eventType: "Medical History Full",
      patientId: patientId,
      visitId: visitId,
      isDeleted: false,
      eventMetadata: JSON.stringify(data),
    } as unknown as Event)
      .then((res) => {
        navigation.goBack()
        console.log(res)
      })
      .catch((error) => console.error(error))
  }
  return (
    <Screen preset="scroll" style={$screen}>
      <View style={$formContainer}>
        <FormProvider {...formMethods}>
          <ControlledTextField label={translate("allergies")} name="allergies" />

          <ControlledTextField label={translate("surgeryHx")} name="surgeryHx" />

          <ControlledTextField label={translate("chronicConditions")} name="chronicConditions" />

          <ControlledTextField label={translate("currentMedications")} name="currentMedications" />

          <ControlledTextField label={translate("vaccinations")} name="vaccinations" />

          <Button mode="contained" onPress={formMethods.handleSubmit(onSubmit)}>
            {translate("save")}
          </Button>
        </FormProvider>
      </View>
    </Screen>
  )
}

type MedicalHistoryDisplayProps = {
  metadataObj: MedicalHistoryMetadata
}

export const MedicalHistoryDisplay = (props: MedicalHistoryDisplayProps) => {
  const { metadataObj } = props
  return (
    <View>
      <Text>
        {translate("provider")}: {metadataObj.doctor}{" "}
      </Text>
      <Text>
        {translate("allergies")}: {metadataObj.allergies}{" "}
      </Text>
      <Text>
        {translate("surgeryHx")}: {metadataObj.surgeryHx}
      </Text>
      <Text>
        {translate("chronicConditions")}: {metadataObj.chronicConditions}
      </Text>
      <Text>
        {translate("currentMedications")}: {metadataObj.currentMedications}
      </Text>
      <Text>
        {translate("vaccinations")}: {metadataObj.vaccinations}
      </Text>
    </View>
  )
}

const $screen: ViewStyle = {}

const $formContainer: ViewStyle = {
  rowGap: 10,
  paddingTop: 20,
}
