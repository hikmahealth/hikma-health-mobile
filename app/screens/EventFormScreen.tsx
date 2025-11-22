import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ActivityIndicator, Alert, TextStyle, ViewStyle } from "react-native"
import * as DocumentPicker from "expo-document-picker"
import {
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet"
import { CommonActions } from "@react-navigation/native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import * as Sentry from "@sentry/react-native"
import { useSelector } from "@xstate/react"
import { isValid } from "date-fns"
import { Option } from "effect"
import { sortBy } from "es-toolkit/compat"
import { LucideAlertCircle } from "lucide-react-native"
import { _ } from "node_modules/@faker-js/faker/dist/airline-CLphikKp"
import { Controller, useForm } from "react-hook-form"
import DropDownPicker from "react-native-dropdown-picker"
import { useImmer } from "use-immer"

import { getHHApiUrl } from "app/utils/storage"

import { Button } from "@/components/Button"
import { DatePickerButton } from "@/components/DatePicker"
import { DiagnosisEditor, DiagnosisPickerButton } from "@/components/DiagnosisEditor"
import { If } from "@/components/If"
import { MedicationEditor, MedicationsFormItem } from "@/components/MedicationEditor"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField, $inputWrapperStyle } from "@/components/TextField"
import { Checkbox } from "@/components/Toggle/Checkbox"
import { Radio } from "@/components/Toggle/Radio"
import { View } from "@/components/View"
import database from "@/db"
import EventModel from "@/db/model/Event"
import EventFormModel from "@/db/model/EventForm"
import { translate } from "@/i18n/translate"
import Appointment from "@/models/Appointment"
import Event from "@/models/Event"
import ICDEntry from "@/models/ICDEntry"
import Prescription from "@/models/Prescription"
import { PatientNavigatorParamList } from "@/navigators/PatientNavigator"
import { languageStore } from "@/store/language"
import { providerStore } from "@/store/provider"
import { colors } from "@/theme/colors"
import Toast from "react-native-root-toast"

type ModalState =
  | { activeModal: null }
  | { activeModal: "medication"; medication: Prescription.MedicationEntry }
  | { activeModal: "diagnoses" }

// File upload state type
type FileUploadState = {
  isUploading: boolean
  isComplete: boolean
  fileName: string | null
  fileId: string | null
  error: string | null
}

/**
Hook to manage multiple open pickers by Id
*/
export function useOpenDialogue() {
  const [openId, setOpenId] = useState<null | string>(null)

  const isOpen = useCallback((id: string) => openId === id, [openId])

  const openDialogue = useCallback((id: string) => () => setOpenId(id), [])

  const closeDialogue = useCallback(() => setOpenId(null), [])

  return {
    isOpen,
    openId,
    openDialogue,
    closeDialogue,
  }
}

/**
 * Hook to get the provider for an event
 * @param eventId
 * @returns
 */
export function useEventProvider(
  eventId?: string | null,
): { providerId: string; providerName: string } | null {
  const [provider, setProvider] = useState<{ providerId: string; providerName: string } | null>(
    null,
  )
  useEffect(() => {
    if (eventId) {
      Event.DB.getProvider(eventId).then(setProvider)
    } else {
      setProvider(null)
    }
  }, [eventId])
  return provider
}

interface EventFormScreenProps
  extends NativeStackScreenProps<PatientNavigatorParamList, "EventForm"> {}

export const EventFormScreen: FC<EventFormScreenProps> = ({ navigation, route }) => {
  const {
    patientId,
    formId,
    visitId = null,
    // formData,
    eventId = null,
    visitDate = new Date().getTime(),
    appointmentId = null,
    departmentId = null,
  } = route.params

  console.log({
    patientId,
    formId,
    visitId,
    eventId,
    visitDate,
    appointmentId,
    departmentId,
  })

  const language = useSelector(languageStore, (state) => state.context.language)
  const provider = useSelector(providerStore, (state) => state.context)

  // get the provider/user who created the form or the event
  const eventProvider = useEventProvider(eventId)
  const { control, handleSubmit, setValue, getValues, watch } = useForm<
    Record<string, string | number | Date | any[]>
  >({
    defaultValues: {},
  })
  const [diagnoses, setDiagnoses] = useState<ICDEntry.T[]>([])
  const [medicines, setMedicines] = useState<Prescription.MedicationEntry[]>([])

  // File upload states for each field
  const [fileUploads, setFileUploads] = useState<Record<string, FileUploadState>>({})

  const { form, state: formState, isLoading } = useEventForm(formId, visitId, patientId, eventId)
  const { isOpen, openDialogue, closeDialogue } = useOpenDialogue()

  const bottomSheetModalRef = useRef<BottomSheetModal>(null)

  const snapPoints = useMemo(() => ["90%", "90%"], [])

  const [modalState, updateModalState] = useImmer<ModalState>({
    activeModal: null,
  })

  // callbacks
  // const handlePresentModalPress = useCallback(() => {
  // bottomSheetModalRef.current?.present()
  // }, [])
  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        updateModalState((draft) => {
          draft.activeModal = null
        })
      }
    },
    [updateModalState],
  )

  const openMedicationEditor = useCallback(
    (medication?: Prescription.MedicationEntry) => {
      updateModalState((draft) => {
        draft.activeModal = "medication"
        if (draft.activeModal === "medication" && medication) {
          draft.medication = medication
        }
      })
      bottomSheetModalRef.current?.present()
    },
    [updateModalState],
  )

  const openDiagnosesEditor = useCallback(() => {
    updateModalState((draft) => {
      draft.activeModal = "diagnoses"
    })
    bottomSheetModalRef.current?.present()
  }, [updateModalState])

  const updateDiagnoses = useCallback(
    (diagnoses: ICDEntry.T[]) => {
      setDiagnoses(diagnoses)
      updateModalState((draft) => {
        draft.activeModal = null
      })
      bottomSheetModalRef.current?.dismiss()
    },
    [updateModalState],
  )

  useEffect(() => {
    if (form && formState) {
      formState.formData.map((field) => {
        if (field.fieldType === "diagnosis") {
          const diagnosisValue = Array.isArray(field?.value) ? field.value : []
          setDiagnoses(diagnosisValue as ICDEntry.T[])
        } else if (field.fieldType === "medicine") {
          const medicineValue = Array.isArray(field?.value) ? field.value : []
          setMedicines(medicineValue as Prescription.MedicationEntry[])
        }
        setValue(field.name, field.value)
      })
    }
  }, [formState, form])

  const [loading, setLoading] = useState(false)

  // This determines if the form can be saved - forms are editable by default unless explicitly marked as non-editable
  const canSaveForm = useMemo(() => {
    if (loading) {
      return false
    }
    // If eventId is null, this is a new form being created, so it should be editable
    // Otherwise, respect the form's isEditable property
    if (form?.isEditable === false) {
      Toast.show("Form is not editable", {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
        shadow: true,
        animation: true,
        hideOnPress: true,
        delay: 0,
      })
      return false
    }
    return (eventId === null || form?.isEditable) ?? false
  }, [form?.isEditable, loading, eventId])

  console.log("canSaveForm", canSaveForm)

  const onSubmit = async (data: Record<string, any>) => {
    console.log("onSubmit", data)
    if (loading) {
      return
    }

    setLoading(true)

    const formData =
      form?.formFields
        .map((field) => ({
          fieldId: field.id,
          fieldType: field.fieldType,
          value:
            field.inputType === "file"
              ? fileUploads[field.name]?.fileId || ""
              : data[field.name] || "",
          inputType: field.inputType,
          name: field.name,
        }))
        .filter(
          (field) =>
            field.name.toLowerCase() !== "diagnosis" &&
            field.name.toLowerCase() !== "medications" &&
            field.fieldType.toLowerCase() !== "diagnosis" &&
            field.name.toLowerCase() !== "medicine" &&
            field.fieldType.toLowerCase() !== "medicine",
        ) || []

    // if the form has medicine and diagnosis fields, add them to the form data
    const medicineField = form?.formFields.find((field) => field.fieldType === "medicine")
    const diagnosisField = form?.formFields.find((field) => field.fieldType === "diagnosis")
    if (medicineField) {
      // add the medications state array to the form data
      formData.push({
        fieldId: medicineField.id,
        value: medicines,
        fieldType: medicineField.fieldType,
        inputType: "input-group",
        name: medicineField.name,
      })
    }
    if (diagnosisField) {
      // add the diagnoses state array to the form data
      formData.push({
        fieldId: diagnosisField.id,
        value: diagnoses,
        fieldType: diagnosisField.fieldType,
        inputType: "input-group",
        name: diagnosisField.name,
      })
    }

    const newEvent: EventModel = {
      formId,
      visitId: visitId || "",
      eventType: form?.name || "",
      patientId,
      formData,
    }

    try {
      const res = await Event.DB.create(
        newEvent,
        visitId,
        Option.getOrUndefined(provider.clinic_id) || "",
        provider.id,
        provider.name,
        visitDate,
        eventId,
      )

      // Update the appointment with the visitId
      if (appointmentId) {
        // Function is async and we are not waiting for it, and if it fails we dont care too much and dont want it to block the user from continuing
        if (departmentId) {
          Appointment.DB.updateAppointmentDepartmentStatus(
            appointmentId,
            departmentId,
            provider.id,
            "completed",
          ).catch((e) => {
            console.error("Error updating appointment department status", e)
            Sentry.captureException(e)
          })
        }
        // If an appointment does not have a departmentId, means it is not connected to a department and can just be completed.
        // if  departmentId is present, do not update the appointment status
        Appointment.DB.markComplete(appointmentId, provider.id, res.visitId, {
          preserveStatus: departmentId ? true : false,
        }).catch((e) => {
          console.error("Error updating appointment with visitId", e)
          Sentry.captureException(e)
        })
      }

      // React-Navigation 6 shortcut to passing a parameter to the previous screen
      // here we pop the screen and pass the visit ID to the previous screen
      // navigation.dispatch((state) => {
      //   const prevRoute = state.routes[state.routes.length - 2]
      //   return CommonActions.navigate({
      //     name: prevRoute.name,
      //     params: {
      //       ...prevRoute.params,
      //       visitId: res.visitId,
      //     },
      //     merge: true,
      //   })
      // })
      if (visitId) {
        navigation.goBack()
      } else {
        navigation.popTo("NewVisit", { patientId, visitDate, visitId: res.visitId })
      }
    } catch (e) {
      console.error(e)
      Alert.alert("Error connecting to the database")
      Sentry.captureException(e, {
        level: "error",
        extra: {
          formId,
          visitId,
          patientId,
          eventId,
        },
      })
    } finally {
      setLoading(false)
    }
  }

  // set the title of the page
  useEffect(() => {
    navigation.setOptions({
      title: form?.name ?? "Event Form",
    })
  }, [form?.name, navigation])

  const updateMedication = useCallback(
    (medication: Prescription.MedicationEntry) => {
      // set the medication in the form
      // setValue("medicine" as never, medication)
      // the form has a medicine field that is an array of medications, so we need to get the current value of the field and add the new medication to it if the current array does not have the same medication id
      const currentMedications = medicines
      const medicationExists = currentMedications.find(
        (m: Prescription.MedicationEntry) => m.id === medication.id,
      )
      if (!medicationExists) {
        setMedicines((meds) => [...meds, medication])
      } else {
        setMedicines((meds) => meds.map((m) => (m.id === medication.id ? medication : m)))
      }
      updateModalState((draft) => {
        draft.activeModal = null
      })
      bottomSheetModalRef.current?.dismiss()
    },
    [medicines, updateModalState],
  )

  const medicineOptions = useMemo(() => {
    const res = form?.formFields.find((field) => field.fieldType === "medicine")?.options || []

    if (Option.isOption(res)) {
      return Option.getOrElse(res, () => [])
    }
    return []
  }, [form?.formFields])

  // Handle file selection and upload
  const handleFileUpload = async (fieldName: string) => {
    console.log(`Starting file upload for field: ${fieldName}`)
    try {
      // Initialize upload state
      console.log("Initializing upload state")
      setFileUploads((prev) => ({
        ...prev,
        [fieldName]: {
          isUploading: true,
          isComplete: false,
          fileName: null,
          fileId: null,
          error: null,
        },
      }))

      // Pick document
      console.log("Opening document picker")
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*", // Allow any file type
        copyToCacheDirectory: true,
      })

      if (result.canceled) {
        console.log("Document picking canceled by user")
        setFileUploads((prev) => ({
          ...prev,
          [fieldName]: {
            isUploading: false,
            isComplete: false,
            fileName: null,
            fileId: null,
            error: null,
          },
        }))
        return
      }

      const file = result.assets[0]
      console.log(`File selected: ${file.name}, type: ${file.mimeType}, size: ${file.size} bytes`)

      // Create FormData object
      console.log("Creating FormData for upload")
      const formData = new FormData()
      formData.append("file", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
      } as any)

      // Upload to server
      const apiUrl = await getHHApiUrl()
      console.log(`Uploading to ${apiUrl}/v1/api/forms/resources`)
      const response = await fetch(`${apiUrl}/v1/api/forms/resources`, {
        method: "PUT",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      console.log(`Server response status: ${response.status}`)
      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`)
      }

      const responseData = await response.json()
      console.log("Upload successful, response data:", responseData)

      // Update state with successful upload
      console.log(`Updating state for successful upload of ${file.name}`)
      setFileUploads((prev) => ({
        ...prev,
        [fieldName]: {
          isUploading: false,
          isComplete: true,
          fileName: file.name,
          fileId: responseData.id, // Assuming the API returns an id field
          error: null,
        },
      }))

      // Update form control value
      console.log(`Setting form value for ${fieldName} to ${responseData.id}`)
      setValue(fieldName as never, responseData.id as never)
    } catch (error: unknown) {
      console.error("File upload error:", error)
      Sentry.captureException(error)

      // Update state with error
      const errorMessage = error instanceof Error ? error.message : "Failed to upload file"
      console.log(`Updating state for failed upload: ${errorMessage}`)
      setFileUploads((prev) => ({
        ...prev,
        [fieldName]: {
          isUploading: false,
          isComplete: false,
          fileName: null,
          fileId: null,
          error: errorMessage,
        },
      }))

      Alert.alert("Upload Error", "Failed to upload file. Please try again.")
    }
  }

  if (isLoading) return <Text>Loading...</Text>
  if (!form) {
    return (
      <View alignItems="center" pt={40} justifyContent="center">
        <LucideAlertCircle size={60} color={colors.textDim} />
        <Text size="lg">Form does not exist. </Text>
      </View>
    )
  }

  // console.log({ form: form.formFields })
  return (
    <BottomSheetModalProvider>
      <Screen style={$root} preset="scroll">
        <View gap={12} pb={24}>
          {form.formFields.map((field, idx) => {
            console.log(field.fieldType, "as a ", field.inputType, "options: ", field.options)
            console.log("is Multi", field.multi)
            return (
              <View key={`formField-${idx}`}>
                <If condition={field.inputType === "text" || field.inputType === "number"}>
                  <Controller
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextField
                        label={field.name}
                        onChangeText={onChange}
                        keyboardType={field.inputType === "number" ? "number-pad" : "default"}
                        onBlur={onBlur}
                        value={value}
                      />
                    )}
                    name={field.name as never}
                    control={control}
                  />
                </If>
                <If condition={field.inputType === "textarea"}>
                  <Controller
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextField
                        label={field.name}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        value={value}
                        multiline
                      />
                    )}
                    name={field.name as never}
                    control={control}
                  />
                </If>

                <If condition={field.inputType === "select" && field.fieldType !== "diagnosis"}>
                  <View style={{}}>
                    <Text text={field.name} preset="formLabel" />
                    <DropDownPicker
                      open={isOpen(field.id)}
                      // value={multiPickerValue(getValues(field.name) as any, field.multi || false)}
                      value={multiPickerValue(
                        watch(field.name) as any,
                        Option.isOption(field.multi)
                          ? Option.getOrElse(field.multi, () => false)
                          : field.multi || false,
                      )}
                      searchable
                      closeAfterSelecting
                      style={$dropDownStyle}
                      modalTitle={field.name}
                      multiple={
                        Option.isOption(field.multi)
                          ? Option.getOrElse(field.multi, () => false)
                          : field.multi || false
                      }
                      modalContentContainerStyle={$modalContentContainerStyle}
                      mode="BADGE"
                      searchPlaceholder={
                        translate("common:search", { defaultValue: "Search" }) + "..."
                      }
                      searchTextInputStyle={$inputWrapperStyle as unknown as TextStyle}
                      closeOnBackPressed
                      onClose={closeDialogue}
                      items={sortBy(
                        Option.isOption(field.options)
                          ? Option.getOrElse(field.options, () => [])
                          : field.options || [],
                        ["label"],
                      )}
                      setOpen={openDialogue(field.id)}
                      listMode="MODAL"
                      // setValue={onChange}
                      setValue={(callback) => {
                        const pickerValue = multiPickerValue(
                          getValues(field.name) as any,
                          Option.getOrElse(field.multi, () => false),
                        )
                        const data = callback(pickerValue || "")

                        const newValue = field.multi && Array.isArray(data) ? data.join("; ") : data

                        setValue(field.name as never, newValue as never)
                      }}
                    />
                  </View>
                </If>

                <If condition={field.inputType === "checkbox"}>
                  <Controller
                    render={({ field: { value } }) => (
                      <View gap={4}>
                        <View mt={4} />
                        <Checkbox
                          label={field.name}
                          value={value}
                          onValueChange={(value) => {
                            if (value) {
                              setValue(field.name as never, value as never)
                            } else {
                              // set the default value to an empty string
                              setValue(field.name as never, "" as never)
                            }
                          }}
                        />
                      </View>
                    )}
                    name={field.name as never}
                    control={control}
                  />
                </If>

                {/* File UPLOADS ARE NOT SUPPORTED YET */}
                <If condition={field.inputType === "file" && false}>
                  <Controller
                    render={() => (
                      <View gap={4}>
                        <Text text={field.name} preset="formLabel" />
                        <View>
                          {fileUploads[field.name]?.isUploading ? (
                            <View
                              direction="row"
                              alignItems="center"
                              gap={8}
                              style={$inputWrapperStyle as unknown as ViewStyle}
                            >
                              <ActivityIndicator size="small" color={colors.palette.primary400} />
                              <Text text="Uploading..." />
                            </View>
                          ) : fileUploads[field.name]?.isComplete ? (
                            <View
                              direction="row"
                              alignItems="center"
                              justifyContent="space-between"
                            >
                              <Text text={fileUploads[field.name]?.fileName || "File uploaded"} />
                              <Button
                                text="Replace"
                                style={$fileButtonStyle}
                                preset="default"
                                onPress={() => handleFileUpload(field.name)}
                              />
                            </View>
                          ) : (
                            <Button
                              text="Select File"
                              preset="default"
                              style={$fileButtonStyle}
                              onPress={() => handleFileUpload(field.name)}
                            />
                          )}
                          {fileUploads[field.name]?.error && (
                            <Text
                              text={fileUploads[field.name]?.error || ""}
                              color={colors.error}
                            />
                          )}
                        </View>
                      </View>
                    )}
                    name={field.name as never}
                    control={control}
                  />
                </If>

                <If condition={field.inputType === "date"}>
                  <Controller
                    render={({ field: { onChange, value } }) => (
                      <View style={{}}>
                        <Text text={field.name} preset="formLabel" />
                        <View>
                          <DatePickerButton
                            date={isValid(new Date(value)) ? new Date(value) : new Date()}
                            mode="date"
                            theme="light"
                            onDateChange={onChange}
                          />
                        </View>
                      </View>
                    )}
                    name={field.name as never}
                    control={control}
                  />
                </If>

                <If condition={field.inputType === "radio"}>
                  <Controller
                    render={({ field: { value } }) => (
                      <View gap={4}>
                        <Text text={field.name} preset="formLabel" />
                        <View mt={4} />
                        {(Option.isOption(field.options)
                          ? Option.getOrElse(field.options, () => [])
                          : Array.isArray(field.options)
                            ? field.options
                            : []
                        ).map((option: any) => (
                          <Radio
                            key={option.value}
                            label={option.label}
                            value={value === option.value}
                            onValueChange={(value) => {
                              if (value) {
                                setValue(field.name as never, option.value as never)
                              } else {
                                // set the default value to an empty string
                                setValue(field.name as never, "" as never)
                              }
                            }}
                          />
                        ))}
                      </View>
                    )}
                    name={field.name as never}
                    control={control}
                  />
                </If>

                <If condition={field.inputType === "input-group" && field.fieldType === "medicine"}>
                  <MedicationsFormItem
                    openMedicationEditor={openMedicationEditor}
                    deleteEntry={(med) => {
                      setMedicines((meds) => meds.filter((m) => m.id !== med))
                    }}
                    value={medicines}
                    onEditEntry={(med) => openMedicationEditor(med)}
                    viewOnly={false}
                  />
                </If>

                <If condition={field.fieldType === "diagnosis"}>
                  <DiagnosisPickerButton
                    language={language}
                    openDiagnosisPicker={openDiagnosesEditor}
                    key={field.id}
                    value={diagnoses || []}
                  />
                </If>
              </View>
            )
          })}

          {/* Information about the user who filled out the form or the user who created the event in the first place as a fallback */}
          <If condition={eventProvider !== null}>
            <View gap={4} py={6} direction="row">
              <Text text="Created by:" />
              <Text text={eventProvider?.providerName} />
            </View>
          </If>

          <Button
            preset="default"
            disabled={!canSaveForm}
            onPress={handleSubmit(onSubmit)}
            testID="submit"
          >
            {loading ? translate("common:loading") : translate("common:save")}
          </Button>
        </View>
      </Screen>

      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={1}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
      >
        <BottomSheetScrollView style={{}}>
          <If condition={modalState.activeModal === "medication"}>
            <MedicationEditor
              medication={
                modalState.activeModal === "medication"
                  ? ((modalState as any).medication as Prescription.MedicationEntry)
                  : undefined
              }
              medicineOptions={medicineOptions}
              onSubmit={updateMedication}
            />
          </If>
          <If condition={modalState.activeModal === "diagnoses"}>
            <DiagnosisEditor language={language} onSubmit={updateDiagnoses} diagnoses={diagnoses} />
          </If>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </BottomSheetModalProvider>
  )
}

// TODO: Add support for the following
// - [ ] Date input
// - [ ] Diagnosis input
// - [ ] Medication input
// - [ ] Update radio & checkbox options
// - [ ] Support for editing an existing event

type EventFormState = {
  form: EventFormModel | null
  // fields: EventFormModel["formFields"]
  // setFieldValue: (fieldId: string, value: any) => void
  // getFieldValue: (fieldId: string) => any
  state: EventModel | null
  isLoading: boolean
}

// FIXME: MUST REFACTOR & remove all unused code
/**
 * Hook to manage and update an event form
 * TODO: add support for editing an existing event form
 *
 * @param formId - The form ID
 * @param visitId - The visit ID
 * @param patientId - The patient ID
 * @param eventId - If this is an existing event, the event ID to edit or null if this is a new event
 */
function useEventForm(
  formId: string,
  visitId: string | null,
  patientId: string,
  eventId: string | null,
): EventFormState {
  const [form, setForm] = useState<EventFormModel | null>(null)
  const [formState, updateFormState] = useImmer<EventModel | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    /** Subscribe to the form */
    let formSub: any
    database.collections
      .get<EventFormModel>("event_forms")
      .find(formId)
      .then((record) => {
        formSub = record.observe().subscribe((form) => {
          setForm(form)
        })
      })
      .catch((error) => {
        console.error(error)
        setForm(null)
      })
      .finally(() => {
        setIsLoading(false)
      })

    /** Subscribe to the event if it exists. If there is no event, create a new one */
    const eventSub = eventId
      ? database.collections
          .get<EventModel>("events")
          .findAndObserve(eventId)
          .subscribe((event) => {
            updateFormState((d) => {
              const draft = d || ({} as any)
              // if (draft) {
              draft.formId = event.formId
              draft.visitId = event.visitId
              draft.patientId = event.patientId
              draft.formData = event.formData
              draft.createdAt = event.createdAt
              draft.updatedAt = event.updatedAt
              draft.id = event.id
              return draft
              // }
              // return event
            })
          })
      : null

    return () => {
      formSub?.unsubscribe()
      eventSub?.unsubscribe()
      setIsLoading(true)
      setForm(null)
    }
  }, [formId, eventId])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getFieldValue = useCallback(
    (fieldId: string) => {
      return formState?.formData.find((field) => field.fieldId === fieldId)?.value
    },
    [formState?.formData],
  )

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setFieldValue = useCallback((fieldId: string, value: any) => {
    updateFormState((draft) => {
      if (draft) {
        const field = draft.formData.find((field) => field.fieldId === fieldId)
        if (field) {
          field.value = value
        }
      }
    })
  }, [])

  return {
    form: form,
    isLoading,
    // fields: form?.formFields ?? [],
    state: formState,
    // getFieldValue: getFieldValue,
    // setFieldValue,
  }
}

/**
Given a form value and whether or not it supports multiple inputs, return the properly formatted value for the dropdown picker
*/
function multiPickerValue(
  formValue: string | string[],
  isMulti: boolean,
  delim = "; ",
): string | string[] {
  if (isMulti === false) {
    return String(formValue)
  }
  if (formValue?.length > 0 && typeof formValue === "string") {
    return formValue.split(delim)
  }
  return []
}

const $root: ViewStyle = {
  flex: 1,
  padding: 10,
}

const $dropDownStyle: ViewStyle = {
  marginTop: 4,
  borderWidth: 1,
  borderRadius: 4,
  backgroundColor: colors.palette.neutral200,
  borderColor: colors.palette.neutral400,
  zIndex: 990000,
  flex: 1,
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

const $fileButtonStyle: ViewStyle = {
  flex: 1,
}
