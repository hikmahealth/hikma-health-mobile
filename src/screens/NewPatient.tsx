import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { RadioButton } from "react-native-paper"
import { Alert, View } from "react-native"
import { SubmitHandler, useForm, FormProvider } from "react-hook-form"
import { Screen } from "../components/Screen"
import { Text } from "../components/Text"
import { ControlledTextField } from "../components/ControlledTextField"
import { Button } from "../components/Button"
import { RootStackParamList } from "../../App"
import { format, isValid } from "date-fns"
import { translate } from "../i18n"
import { useLanguageStore } from "../stores/language"
import { ViewStyle } from "react-native/types"
import { ControlledDatePickerButton, DatePickerButton } from "../components/DatePicker"
import Patient from "../db/model/Patient"
import { registerNewPatient, updatePatientWithId } from "../db/api"
import { omit, sortBy, upperFirst } from "lodash"
import { useRegistrationForm } from "../hooks/useRegistrationForm"
import { TextInput } from "../components/TextInput"
import { colors } from "../theme/colors"
import PatientModel from "../db/model/Patient"

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
  const [isRtl, language] = useLanguageStore((state) => [state.isRtl, state.language])

  const { form, state, setField } = useRegistrationForm(language, patientToEdit)

console.log("PATIENT: ", patientToEdit)
  
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


  const onSubmit = async (data: typeof state) => {
    if (data.given_name.length === 0 || data.surname.length === 0) {
      return Alert.alert("Empty name provided. Please fill in both the names")
    }


    // TODO: support adding the ID of the patient if they are being updated
    const patient: Partial<PatientModel> = {
      givenName: data.given_name,
      surname: data.surname,
      sex: data.sex,
      country: data.country,
      dateOfBirth: format(data.date_of_birth, "yyyy-MM-dd"),
      additionalData: omit(data, ["given_name", "surname", "date_of_birth", "sex", "country"])
    }
    // console.log({ patient })

    try {
      let res: any
      if (patientToEdit && patientToEdit.id) {
        // patient already exists, so update it
        res = await updatePatientWithId(patientToEdit.id, {
          id: patientToEdit.id,
          ...patient
        })
      } else {
        res = await registerNewPatient(patient)
      }

      navigation.goBack()
    } catch (error) {
      console.error(error)
      Alert.alert("Error", "An error occurred while saving the patient")
    }
  }

  const $rtl = isRtl ? $rtlStyle : {}

  const fields = sortBy(form.fields, ["position"])

  return (
    <Screen style={$screen} preset="scroll">
      <View style={$formContainer}>
        {
          fields.map(field => {
            const { label, fieldType, column } = field;
            return (
              <View key={field.id}>
                {
                  (fieldType === "text" || fieldType === "number") && (
                    <TextInput
                      mode="outlined"
                      keyboardType={fieldType === "number" ? "number-pad" : "default"}
                      value={state[column]}
                      onChangeText={(t) => setField(column, fieldType === "number" ? Number(t) : t)}
                      label={getTranslation(field.label, language)} />
                  )
                }

                {
                  field.fieldType === "date" && (
                    <View>
                      <View style={$rtl}>
                        <Text text={getTranslation(field.label, language)} variant="labelLarge" />
                      </View>
                      <View style={$rtl}>

                        <DatePickerButton modal date={isValid(state[column]) ? state[column] : new Date()} onDateChange={d => setField(column, d)} />
                      </View>
                    </View>
                  )
                }


                {
                  field.fieldType === "select" && (
                    <View>
                      <View style={$rtl}>
                        <Text text={getTranslation(field.label, language)} variant="labelLarge" />
                      </View>
                      <View style={$rtl}>
                        <RadioButton.Group
                          onValueChange={(value: string) => setField(column, value)}
                          value={state[column]}
                        >
                          {
                            field.options.map((option, idx) => (
                              <RadioButton.Item
                                key={idx}
                                style={$rtl}
                                color={colors.palette.primary500}
                                label={upperFirst(getTranslation(option, language))}
                                value={getTranslation(option, language)} />
                            ))
                          }
                        </RadioButton.Group>
                      </View>
                    </View>

                  )
                }

              </View>
            )
          })
        }

        <Button mode="contained" labelStyle={{ color: "#fff" }} onPress={() => onSubmit(state)} testID="submit">
          {translate("save")}
        </Button>
      </View>
    </Screen>

  )


  // ignore for now

  return (
    <Screen style={$screen} preset="scroll">
      <View style={$formContainer}>
        <FormProvider {...formMethods}>
          <ControlledTextField
            mode="outlined"
            testID="firstName"
            label={translate("firstName")}
            name="givenName"
          />

          <ControlledTextField
            mode="outlined"
            testID="surname"
            label={translate("surname")}
            name="surname"
          />

          <ControlledTextField
            mode="outlined"
            testID="phone"
            label={translate("phone")}
            name="phone"
          />

          <ControlledTextField
            mode="outlined"
            testID="country"
            label={translate("country")}
            name="country"
          />

          <ControlledTextField
            mode="outlined"
            testID="hometown"
            label={translate("hometown")}
            name="hometown"
          />

          <ControlledTextField
            mode="outlined"
            testID="camp"
            label={translate("camp")}
            name="camp"
          />

          <View>
            <View style={$rtl}>
              <Text tx="dob" variant="labelLarge" />
            </View>
            <View style={$rtl}>
              <ControlledDatePickerButton testID="dateOfBirth" name="dateOfBirth" />
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
                <RadioButton.Item style={$rtl} color={primary} label={upperFirst(translate("male"))} testID="sex.male" value="male" />
                <RadioButton.Item style={$rtl} color={primary} label={upperFirst(translate("female"))} testID="sex.female" value="female" />
              </RadioButton.Group>
            </View>
          </View>
          <Button mode="contained" labelStyle={{ color: "#fff" }} onPress={formMethods.handleSubmit(onSubmit)} testID="submit">
            {translate("save")}
          </Button>
        </FormProvider>
      </View>
    </Screen>
  )
}


/**
Given a language key, return the expanded version of the key

@param {useRegistrationForm.LanguageKey} language
@returns {string}
*/
function friendlyLang(language: useRegistrationForm.LanguageKey): string {
  switch (language) {
    case "es": {
      return "Spanish"
    }
    case "ar": {
      return "Arabic"
    }
    case "en": {
      return "English"
    }
    default: {
      return language
    }
  }
}


/**
Given a translation object and a language key to, return that language label, or default to the english version.
If the english version does not exist, return any.

@param {useRegistrationForm.TranslationObject} translations
@param {string} language
@return {string} translation
*/
function getTranslation(translations: useRegistrationForm.TranslationObject, language: string): string {
  const translationKeys = Object.keys(translations);

  // in the case of no translations, return an empty string
  if (translationKeys.length === 0) {
    return ""
  } if (language in translations) {
    return translations[language]
  } else if (translations.en) {
    return translations.en
  } else {
    return translations[translationKeys[0]]
  }
}



// const $rtl = { transform: [{ scaleX: -1 }] }
const $rtlStyle: ViewStyle = { flexDirection: "row-reverse" }


const $screen: ViewStyle = {
}

const $formContainer: ViewStyle = {
  rowGap: 16,
  paddingVertical: 20,
}
