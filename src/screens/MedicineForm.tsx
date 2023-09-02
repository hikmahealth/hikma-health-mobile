import { Picker } from "@react-native-picker/picker"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useForm, FormProvider } from "react-hook-form"
import { View, ViewStyle } from "react-native"
import { RootStackParamList } from "../../App"
import {Screen} from "../components/Screen"
import {Text} from "../components/Text"
import {ControlledTextField} from "../components/ControlledTextField"
import {ControlledRadioGroup} from "../components/ControlledRadioGroup"
import {Button} from "../components/Button"
import { createEvent } from "../db/api"
import { translate } from "../i18n"
import { PatientFlowParamList } from "../navigators/PatientFlowNavigator"
import { primaryTheme } from "../styles/buttons"

type Props = NativeStackScreenProps<PatientFlowParamList, "MedicineForm">

type MedicineType =
  | "tablet"
  | "syrup"
  | "ampule"
  | "suppository"
  | "cream"
  | "bottle"
  | "drops"
  | "spray"
  | "gel"
  | "lotion"
const medicineTypes: MedicineType[] = [
  "tablet",
  "syrup",
  "ampule",
  "suppository",
  "cream",
  "bottle",
  "drops",
  "spray",
  "gel",
  "lotion",
]

export type MedicineMetadata = {
  doctor: string
  medication: string
  type: MedicineType
  dosage: string
  days: number
}

export function MedicineForm(props: Props) {
  const { navigation, route } = props
  const { patientId, visitId } = route.params

  const { ...formMethods } = useForm<MedicineMetadata>({
    defaultValues: {
      doctor: "Dr. Doctor",
      medication: "",
      type: "tablet",
      dosage: "",
      days: 0,
    },
  })

  const onSubmit = (data: MedicineMetadata) => {
    createEvent({
      patientId: patientId,
      visitId,
      isDeleted: false,
      eventType: "Medicine",
      eventMetadata: {
        ...data,
        days: Number(data.days),
      },
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
          <ControlledTextField label="Medicine" name="medication" />
          <Picker
            selectedValue={formMethods.watch("type")}
            onValueChange={(value) => formMethods.setValue("type", value)}
            style={{}}
          >
            {medicineTypes.map((type) => (
              <Picker.Item label={translate(type)} value={translate(type)} key={type} />
            ))}
          </Picker>
          <ControlledTextField label="Dosage" name="dosage" />
          <ControlledTextField label="Days" name="days" keyboardType="number-pad" />

          <Button mode="contained" onPress={formMethods.handleSubmit(onSubmit)}>
            {translate("save")}
          </Button>
        </FormProvider>
      </View>
    </Screen>
  )
}

type MedicineDisplayProps = {
  metadataObj: MedicineMetadata
}

export const MedicineFormDisplay = ({ metadataObj }: MedicineDisplayProps) => {
  return (
    <View>
      <Text>
        {translate("provider")}: {metadataObj.doctor}{" "}
      </Text>
      <Text>
        {translate("medication")}: {metadataObj.medication}{" "}
      </Text>
      <Text>
        {translate("type")}: {metadataObj.type}
      </Text>
      <Text>
        {translate("dosage")}: {metadataObj.dosage}
      </Text>
      <Text>
        {translate("days")}: {metadataObj.days}
      </Text>
    </View>
  )
}

const $formContainer: ViewStyle = {
  rowGap: 10,
  paddingTop: 20,
}
