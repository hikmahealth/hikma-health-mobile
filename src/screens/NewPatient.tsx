import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { RadioButton } from "react-native-paper"
import { Alert, View } from "react-native"
import { SubmitHandler, useForm, FormProvider } from "react-hook-form"
import { Screen } from "../components/Screen"
import { Text } from "../components/Text"
import { ControlledTextField } from "../components/ControlledTextField"
import { Button } from "../components/Button"
import { RootStackParamList } from "../../App"
import { format } from "date-fns"
import { translate } from "../i18n"
import { useLanguageStore } from "../stores/language"
import { ViewStyle } from "react-native/types"
import { ControlledDatePickerButton } from "../components/DatePicker"
import Patient from "../db/model/Patient"
import { registerNewPatient, updatePatientWithId } from "../db/api"
import { primary } from "../styles/colors"
import { upperFirst } from "lodash"

type Props = NativeStackScreenProps<RootStackParamList, "NewPatient">

const DEFAULT_DOB = (() => {
  // set year, month and date separately to support HERMES engine
  const d = new Date()
  d.setFullYear(1990)
  d.setMonth(0), d.setDate(1)
  return d
})()


type NewPatientForm = Omit<Patient, "dateOfBirth"> & {
  dateOfBirth: Date
}

export default function NewPatientScreen(props: Props) {
  const { navigation, route } = props
  const { patient: patientToEdit } = route.params
  const isRtl = useLanguageStore((state) => state.isRtl)

  const { ...formMethods } = useForm<NewPatientForm>({
    defaultValues: patientToEdit
      ? { ...patientToEdit, dateOfBirth: new Date(patientToEdit.dateOfBirth) }
      : {
        id: "",
        givenName: "",
        surname: "",
        sex: "male",
        camp: "",
        phone: "",
        country: "",
        hometown: "",
        dateOfBirth: DEFAULT_DOB,
      },
  })

  const onSubmit: SubmitHandler<NewPatientForm> = async (data) => {
    if (data.givenName.length === 0 || data.surname.length === 0) {
      return Alert.alert("Empty name provided. Please fill in both the given name and surname")
    }
    const patient = {
      ...data,
      dateOfBirth: format(data.dateOfBirth, "yyyy-MM-dd"),
    }
    // console.log({ patient })

    try {
      let res: any
      if (patientToEdit && patientToEdit.id) {
        // patient already exists, so update it
        res = await updatePatientWithId(patient.id, patient)
      } else {
        res = await registerNewPatient(patient)
      }

      console.log(res)
      navigation.goBack()
    } catch (error) {
      console.error(error)
      Alert.alert("Error", "An error occurred while saving the patient")
    }
  }

  const $rtl = isRtl ? $rtlStyle : {}

  return (
    <Screen preset="scroll">
      <View style={$formContainer}>
        <FormProvider {...formMethods}>
          <ControlledTextField
            mode="outlined"
            label={translate("firstName")}
            name="givenName"
          />

          <ControlledTextField
            mode="outlined"
            label={translate("surname")}
            name="surname"
          />

          <ControlledTextField
            mode="outlined"
            label={translate("phone")}
            name="phone"
          />

          <ControlledTextField
            mode="outlined"
            label={translate("country")}
            name="country"
          />

          <ControlledTextField
            mode="outlined"
            label={translate("hometown")}
            name="hometown"
          />

          <ControlledTextField
            mode="outlined"
            label={translate("camp")}
            name="camp"
          />

          <View>
            <View style={$rtl}>
              <Text tx="dob" variant="labelLarge" />
            </View>
            <View style={$rtl}>
              <ControlledDatePickerButton name="dateOfBirth" />
            </View>
          </View>

          <View>
            <View style={$rtl}>
              <Text tx="sex" variant="labelLarge" />
            </View>
            <View style={$rtl}>
              <RadioButton.Group
                onValueChange={(val) => formMethods.setValue("sex", val)}
                value={formMethods.watch("sex")}
              >
                <RadioButton.Item style={$rtl} color={primary} label={upperFirst(translate("male"))} value="male" />
                <RadioButton.Item style={$rtl} color={primary} label={upperFirst(translate("female"))} value="female" />
              </RadioButton.Group>
            </View>
          </View>
          <Button mode="contained" labelStyle={{ color: "#fff" }} onPress={formMethods.handleSubmit(onSubmit)}>
            {translate("save")}
          </Button>
        </FormProvider>
      </View>
    </Screen>
  )
}

// const $rtl = { transform: [{ scaleX: -1 }] }
const $rtlStyle: ViewStyle = { flexDirection: "row-reverse" }

const $formContainer: ViewStyle = {
  rowGap: 16,
  paddingVertical: 20,
}
