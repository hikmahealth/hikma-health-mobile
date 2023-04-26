import React, { useEffect, useState } from "react"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { FormProvider, SubmitHandler, useForm } from "react-hook-form"
import { useDatabase } from "@nozbe/watermelondb/hooks"
import { View, ViewStyle } from "react-native"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"
import SectionedMultiSelect from "react-native-sectioned-multi-select"
import { Screen } from "../components/Screen"
import { Text } from "../components/Text"
import { ControlledTextField } from "../components/ControlledTextField"
import { ControlledRadioGroup } from "../components/ControlledRadioGroup"
import { ControlledDatePickerButton } from "../components/DatePicker"
import { Button } from "../components/Button"
import { translate } from "../i18n"
import { PatientFlowParamList } from "../navigators/PatientFlowNavigator"
import EventFormModel from "../db/model/EventForm"
import { ControlledSelectField } from "../components/ControlledSelectField"
import { createEvent } from "../db/api"
import { DiagnosisPickerButton, ICD10Entry } from "./DiagnosisPicker"
import { MedicationEntry, MedicationsFormItem } from "./MedicationEditor"

type Props = NativeStackScreenProps<PatientFlowParamList, "EventForm">

type FormData = {
  name: string
  description: string
  type: string
}

// Take the medications array and add a new medication if there is no medication with its id, otherswise update the medication
const updateMedications = (medications: MedicationEntry[], newMedication: MedicationEntry) => {
  const medicationIndex = medications.findIndex((m) => m.id === newMedication.id)
  if (medicationIndex === -1) {
    return [...medications, newMedication]
  } else {
    return medications.map((m, i) => (i === medicationIndex ? newMedication : m))
  }
}

export function EventFormScreen(props: Props) {
  const { navigation, route } = props
  const { patientId, formId, visitId, diagnoses: selectedDiagnoses, medication } = route.params
  const [eventForm, setEventForm] = useState<EventFormModel | null>(null)
  const [diagnoses, setDiagnoses] = useState<ICD10Entry[]>([])
  const [medications, setMedications] = useState<MedicationEntry[]>([])

  const { ...formMethods } = useForm()
  const database = useDatabase()

  // if route has diagnoses, set diagnoses to route diagnoses
  useEffect(() => {
    if (selectedDiagnoses && selectedDiagnoses.length > 0) {
      setDiagnoses(selectedDiagnoses)
    }
    if (medication) {
      setMedications((s) => updateMedications(s, medication))
    }
  }, [selectedDiagnoses, medication])

  const onSubmit: SubmitHandler<FormData> = (data) => {
    // if diagnosis is in form, add diagnoses to data
    if (eventForm?.metadata.find((f) => f.fieldType === "diagnosis")) {
      data.diagnosis = diagnoses
    }

    // if medication is in form, add medications to data
    if (eventForm?.metadata.find((f) => f.fieldType === "medicine")) {
      data.medications = medications
    }
    createEvent({
      eventType: eventForm.name,
      patientId,
      visitId,
      isDeleted: false,
      eventMetadata: JSON.stringify(data),
    })
      .then((res) => {
        navigation.goBack()
      })
      .catch((err) => {
        console.error("error", err)
      })
  }

  useEffect(() => {
    database
      .get<EventFormModel>("event_forms")
      .find(formId)
      .then((form) => {
        const formObj = {
          name: form.name,
          description: form.description,
          id: form.id,
          metadata: JSON.parse(form.metadata),
        }
        console.log(
          "form",
          formObj.metadata.map((f) => f.fields),
        )
        setEventForm(formObj)
      })
      .catch((err) => {
        console.error("error", err)
        setEventForm(null)
      })
  }, [])

  const deleteMedication = (id: string) => {
    setMedications((s) => s.filter((m) => m.id !== id))
  }

  return (
    <Screen preset="scroll">
      <FormProvider {...formMethods}>
        <View style={$formContainer}>
          {eventForm &&
            eventForm.metadata.map((field) => {
              if (field.inputType === "text") {
                return (
                  <ControlledTextField
                    key={field.id}
                    name={field.name}
                    label={field.name}
                    mode="outlined"
                  />
                )
              } else if (field.inputType === "number") {
                return (
                  <ControlledTextField
                    key={field.id}
                    name={field.name}
                    label={field.name}
                    mode="outlined"
                    keyboardType="numeric"
                  />
                )
              } else if (field.inputType === "radio") {
                return (
                  <ControlledRadioGroup
                    key={field.id}
                    name={field.name}
                    label={field.name}
                    options={field.options}
                  />
                )
              } else if (field.inputType === "checkbox") {
                return (
                  <ControlledRadioGroup
                    key={field.id}
                    name={field.name}
                    label={field.name}
                    options={field.options}
                  />
                )
              } else if (field.inputType === "date") {
                return (
                  <>
                    <Text variant="labelLarge">{field.name}</Text>
                    <ControlledDatePickerButton
                      key={field.id}
                      name={field.name}
                      label={field.name}
                      keyboardType="numeric"
                    />
                  </>
                )
              } else if (field.inputType === "select" && field.fieldType !== "diagnosis") {
                return (
                  <ControlledSelectField
                    key={field.id}
                    name={field.name}
                    label={field.name}
                    options={field.options}
                  />
                )
              } else if (field.inputType === "dropdown" && field.fieldType === "diagnosis") {
                return <DiagnosisPickerButton key={field.id} value={diagnoses || []} />
              } else if (field.inputType === "textarea") {
                return (
                  <ControlledTextField
                    key={field.id}
                    name={field.name}
                    label={field.name}
                    multiline
                    mode="outlined"
                    numberOfLines={4}
                  />
                )
              } else if (field.inputType === "input-group" && field.fieldType === "medicine") {
                return (
                  <MedicationsFormItem
                    key={field.id}
                    value={medications || []}
                    deleteEntry={deleteMedication}
                    viewOnly={false}
                  />
                )
              } else {
                return <Text>Not implemented yet</Text>
              }
            })}
          <Button mode="contained" onPress={formMethods.handleSubmit(onSubmit)}>
            {translate("save")}
          </Button>
        </View>
      </FormProvider>
    </Screen>
  )
}
const $flex1: ViewStyle = {
  flex: 1,
}

const $formContainer: ViewStyle = {
  rowGap: 10,
  paddingTop: 20,
}
