/**
THIS FORM IS DEPRICATED IN FAVOR OF PATIENT RECORD EDITOR
*/
import React, { FC, useEffect, useState } from "react"
import { observer } from "mobx-react-lite"
import { Alert, Pressable, ViewStyle } from "react-native"
import { SubmitHandler } from "react-hook-form"
import { AppStackScreenProps } from "app/navigators"
import { Button, Screen, Text, View, TextField, Toggle, If } from "app/components"
import { useStores } from "app/models"
import { isValid } from "date-fns"
import { TranslationObject, useRegistrationForm } from "app/hooks/usePatientRegistrationForm"
import PatientModel, { PatientModelData } from "app/db/model/Patient"
import { translate } from "app/i18n"
import { sortBy, upperFirst, omit } from "lodash"
import { DatePickerButton } from "app/components/DatePicker"
import { api } from "app/services/api"
import database from "app/db"
import { LucideArrowRight } from "lucide-react-native"
import { colors } from "app/theme"
import { Q } from "@nozbe/watermelondb"
import { levenshtein } from "app/utils/levenshtein"
import _ from "lodash"
import { getTranslation } from "app/utils/parsers"
import { useSimilarPatientsSearch } from "app/hooks/useSimilarPatientsSearch"
// import { useNavigation } from "@react-navigation/native"
// import { useStores } from "app/models"

const DEFAULT_DOB = (() => {
  // set year, month and date separately to support HERMES engine
  const d = new Date()
  d.setFullYear(1990)
  d.setMonth(0)
  d.setDate(1)
  return d
})()

interface PatientRegistrationFormScreenProps
  extends AppStackScreenProps<"PatientRegistrationForm"> {}

export const PatientRegistrationFormScreen: FC<PatientRegistrationFormScreenProps> = observer(
  function PatientRegistrationFormScreen({ route, navigation }) {
    const { language } = useStores()
    const editPatientId = route?.params?.editPatientId
    const [patientToEdit, setPatientToEdit] = useState<PatientModel | null>(null)

    const { form, state, setField, getPatientRecord, isLoading } = useRegistrationForm(
      language.current,
      patientToEdit || undefined,
    )

    /** Background patient search for similar existing patients */
    const similarPatients = useSimilarPatientsSearch(state.given_name, state.surname)

    // console.log({ patientToEdit })

    /** Fetch the patient record if we are editing an existing patient */
    useEffect(() => {
      if (editPatientId) {
        // get and set the patient
        database.collections
          .get<PatientModel>("patients")
          .find(editPatientId)
          .then((res) => {
            if (res) {
              setPatientToEdit(res)
            } else {
              setPatientToEdit(null)
            }
          })
      }
    }, [editPatientId])

    const onSubmit: SubmitHandler<typeof state> = async (data) => {
      // FIXME: All required fields must be checked at this point
      if (data.given_name.length === 0 || data.surname.length === 0) {
        return Alert.alert("Empty name provided. Please fill in both the names")
      }

      // TODO: support adding the ID of the patient if they are being updated
      const patient = getPatientRecord()
      console.log({ patient })

      try {
        let res: PatientModel
        if (patientToEdit && patientToEdit.id && editPatientId) {
          res = await api.updatePatient(editPatientId, patient)
        } else {
          // patient does not exist, so create a new one
          // res = await registerNewPatient(patient)
          res = await api.registerPatient(patient as PatientModelData)
        }

        Alert.alert("Success", "Patient saved", [
          {
            text: "Done",
            onPress: () => navigation.goBack(),
          },
          {
            text: "Continue to Visits",
            onPress: () => {
              return navigation.replace("NewVisit", {
                patientId: res.id,
                visitDate: new Date().getTime(),
                visitId: null,
              })
            },
          },
        ])
      } catch (error) {
        console.error(error)
        Alert.alert("Error", "An error occurred while saving the patient")
      }
    }

    /** Navigate to the patient file */
    const openPatientFile = (id: string) => () => {
      if (id.length < 5) {
        console.error("Attempting to open a patient file with an invalid patient id")
        return
      }
      navigation.navigate("PatientView", {
        patientId: id,
      })
    }

    const $rtl = language.isRTL ? $rtlStyle : {}

    console.log({ form, fields: form.fields })

    const fields = sortBy(form.fields, ["position"])

    if (isLoading && editPatientId && editPatientId.length > 0) {
      // both editing a patient and loading it
      return <Text style={{ color: "black" }}>{`Loading patient ${editPatientId}`}</Text>
    }

    return (
      <Screen style={$root} keyboardOffset={64} preset="scroll" safeAreaEdges={["bottom"]}>
        <View gap={10} pb={40}>
          {fields
            .filter((field) => field.visible)
            .map((field) => {
              const { fieldType, column } = field
              return (
                <View key={field.id}>
                  {(fieldType === "text" || fieldType === "number") && (
                    <TextField
                      keyboardType={fieldType === "number" ? "number-pad" : "default"}
                      value={state[column]}
                      onChangeText={(t) => setField(column, fieldType === "number" ? Number(t) : t)}
                      label={getTranslation(field.label, language.current)}
                    />
                  )}

                  {field.fieldType === "date" && (
                    <View>
                      <View style={$rtl}>
                        <Text
                          text={getTranslation(field.label, language.current)}
                          preset="formLabel"
                        />
                      </View>
                      <View style={$rtl}>
                        <DatePickerButton
                          locale="jp"
                          modal
                          theme="light"
                          maximumDate={new Date()}
                          title={getTranslation(field.label, language.current)}
                          date={isValid(state[column]) ? state[column] : new Date()}
                          onDateChange={(d) => setField(column, d)}
                        />
                      </View>
                    </View>
                  )}

                  {field.fieldType === "select" && (
                    <View>
                      <View style={$rtl}>
                        <Text
                          text={getTranslation(field.label, language.current)}
                          preset="formLabel"
                        />
                      </View>
                      <View style={$rtl} gap={6} pt={6}>
                        {field.options.map((field) => (
                          <Toggle
                            key={field.en}
                            label={upperFirst(getTranslation(field, language.current))}
                            value={state[column] === getTranslation(field, language.current)}
                            onValueChange={(value) => {
                              if (value) {
                                setField(column, getTranslation(field, language.current))
                              }
                            }}
                            variant="radio"
                          />
                        ))}
                        {/* <RadioButton.Group
                        onValueChange={(value: string) => setField(column, value)}
                        value={state[column]}
                      >
                        {field.options.map((option, idx) => (
                          <RadioButton.Item
                            key={idx}
                            style={$rtl}
                            color={colors.palette.primary500}
                            label={upperFirst(getTranslation(option, language.current))}
                            value={getTranslation(option, language.current)}
                          />
                        ))}
                      </RadioButton.Group> */}
                      </View>
                    </View>
                  )}
                </View>
              )
            })}

          <If condition={similarPatients.length > 0}>
            <View
              gap={8}
              style={{
                backgroundColor: "#ffea99",
                borderRadius: 8,
                padding: 10,
              }}
            >
              <Text
                weight="semiBold"
                text="Similar Existing Patients"
                style={{ marginBottom: 8 }}
              />
              {similarPatients.slice(0, 5).map((patient) => (
                <Pressable
                  key={patient.id}
                  onPress={openPatientFile(patient.id)}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    borderBottomWidth: 1,
                    borderBottomColor: "#7f6600",
                    alignItems: "center",
                  }}
                >
                  <View>
                    <Text text={`${patient.givenName} ${patient.surname}`} />
                    <Text text={`${translate("dob")}: ${patient.dateOfBirth}`} />
                  </View>
                  <LucideArrowRight color={colors.textDim} size={16} />
                </Pressable>
              ))}
            </View>
          </If>

          <Button preset="default" onPress={() => onSubmit(state)} testID="submit">
            {translate("save")}
          </Button>
        </View>
      </Screen>
    )
  },
)

const $root: ViewStyle = {
  flex: 1,
  paddingHorizontal: 10,
}

const $rtlStyle: ViewStyle = { flexDirection: "row-reverse" }
