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
import { Controller, useForm } from "react-hook-form"
import DropDownPicker from "react-native-dropdown-picker"
import Toast from "react-native-root-toast"
import { useImmer } from "use-immer"

import Peer from "@/models/Peer"

import { usePermissionGuard } from "@/hooks/usePermissionGuard"
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
import { useCreateEvent } from "@/hooks/useCreateEvent"
import { useUpdateEvent } from "@/hooks/useUpdateEvent"
import { translate } from "@/i18n/translate"
import Appointment from "@/models/Appointment"
import Event from "@/models/Event"
import EventForm from "@/models/EventForm"
import ICDEntry from "@/models/ICDEntry"
import Prescription from "@/models/Prescription"
import { PatientNavigatorParamList } from "@/navigators/PatientNavigator"
import { useDataAccess } from "@/providers/DataAccessProvider"
import { languageStore } from "@/store/language"
import { providerStore } from "@/store/provider"
import { colors } from "@/theme/colors"
import {
  resolveFormTranslations,
  getOptionId,
  type ResolvedFormTranslations,
} from "@/utils/eventFormTranslations"
import { sanitizeFieldName, unsanitizeFormData } from "@/utils/fieldNameSanitizer"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"

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

interface EventFormScreenProps extends NativeStackScreenProps<
  PatientNavigatorParamList,
  "EventForm"
> {}

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

  // console.log({
  //   patientId,
  //   formId,
  //   visitId,
  //   eventId,
  //   visitDate,
  //   appointmentId,
  //   departmentId,
  // })

  const language = useSelector(languageStore, (state) => state.context.language)
  const provider = useSelector(providerStore, (state) => state.context)
  const { isOnline } = useDataAccess()
  const createEventMutation = useCreateEvent()
  const updateEventMutation = useUpdateEvent()
  const { can, checkEditEvent } = usePermissionGuard()

  const { paddingTop: safeAreaPaddingTop } = useSafeAreaInsetsStyle(["top"])

  // get the provider/user who created the form or the event
  const eventProvider = useEventProvider(eventId)
  const { control, handleSubmit, setValue, getValues, watch } = useForm<
    Record<string, string | number | Date | any[]>
  >({
    defaultValues: {},
  })
  // Debug: log all form state changes
  useEffect(() => {
    const subscription = watch((formValues, { name, type }) => {
      console.log("[FormState change]", { changedField: name, type, formValues })
    })
    return () => subscription.unsubscribe()
  }, [watch])

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
        setValue(sanitizeFieldName(field.name), field.value)
      })
    }
  }, [formState, form])

  const [loading, setLoading] = useState(false)

  // New event creation is always allowed; editing respects isEditable
  const isEditing = eventId !== null
  const canSaveForm = useMemo(() => {
    if (!form || loading) return false
    if (isEditing && form.isEditable === false) return false
    return true
  }, [form, loading, isEditing])

  // Show a toast when trying to edit a non-editable form
  useEffect(() => {
    if (isEditing && form && form.isEditable === false) {
      Toast.show("Form is not editable", {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
        shadow: true,
        animation: true,
        hideOnPress: true,
        delay: 0,
      })
    }
  }, [isEditing, form?.isEditable])

  const onSubmit = async (rawData: Record<string, any>) => {
    const data = unsanitizeFormData(rawData)
    console.log("onSubmit", data)
    if (loading) {
      return
    }

    // Permission check: editing an existing event vs creating a new one
    if (isEditing && eventProvider) {
      const editResult = checkEditEvent(eventProvider.providerId)
      if (!editResult.ok) {
        Toast.show(editResult.error.message, {
          duration: Toast.durations.SHORT,
          position: Toast.positions.BOTTOM,
        })
        return
      }
    } else if (!isEditing && !can("event:create")) {
      Toast.show("You do not have permission to create events", {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
      })
      return
    }

    // Validate required fields before submission
    if (form) {
      const missingFields = EventForm.getMissingRequiredFields({
        formFields: form.formFields,
        data,
        diagnoses,
        medicines,
        fileUploads,
      })
      if (missingFields.length > 0) {
        console.log(
          "[EventForm] Missing required fields:",
          missingFields,
          "Form data:",
          JSON.stringify(data, null, 2),
        )
        Toast.show(`Please fill in required fields: ${missingFields.join(", ")}`, {
          duration: Toast.durations.LONG,
          position: Toast.positions.BOTTOM,
          shadow: true,
          animation: true,
          hideOnPress: true,
          delay: 0,
        })
        return
      }
    }

    setLoading(true)

    const formData =
      form?.formFields
        .filter((field) => !EventForm.isDisplayOnly(field))
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
      let resVisitId: string | null = visitId

      if (isOnline) {
        // Online path: use DataProvider mutation
        if (eventId) {
          await updateEventMutation.mutateAsync({
            id: eventId,
            data: { formData: formData as any, metadata: {} },
          })
        } else {
          const res = await createEventMutation.mutateAsync({
            patientId,
            visitId,
            eventType: form?.name || "",
            formId,
            formData: formData as any,
            clinicId: Option.getOrUndefined(provider.clinic_id),
            providerId: provider.id,
            providerName: provider.name,
            checkInTimestamp: visitDate,
            recordedByUserId: provider.id,
          })
          resVisitId = res.visitId
        }
      } else {
        // Offline path: existing WatermelonDB writes
        const res = await Event.DB.create(
          newEvent,
          visitId,
          Option.getOrUndefined(provider.clinic_id) || "",
          provider.id,
          provider.name,
          visitDate,
          eventId,
        )
        resVisitId = res.visitId
      }

      // Update the appointment with the visitId (shared by both paths)
      if (appointmentId) {
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
        Appointment.DB.markComplete(appointmentId, provider.id, resVisitId ?? "", {
          preserveStatus: departmentId ? true : false,
        }).catch((e) => {
          console.error("Error updating appointment with visitId", e)
          Sentry.captureException(e)
        })
      }

      if (visitId) {
        navigation.goBack()
      } else {
        navigation.popTo("NewVisit", { patientId, visitDate, visitId: resVisitId })
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

  // Resolve translations for the form fields based on the user's language
  const resolved = useMemo<ResolvedFormTranslations | null>(() => {
    if (!form) return null
    return resolveFormTranslations(form, language)
  }, [form, language])

  /** Get the translated or original description for a field, or undefined if empty */
  const getFieldDescription = useCallback(
    (field: EventForm.FieldItem): string | undefined => {
      const desc = resolved?.fieldDescriptions[field.id] || field.description
      return desc || undefined
    },
    [resolved],
  )

  // Helper to get translated items for select/dropdown fields, preserving original values
  const getTranslatedItems = useCallback(
    (field: EventForm.FieldItem) => {
      const items = Option.isOption(field.options)
        ? Option.getOrElse(field.options, () => [])
        : field.options || []
      if (!resolved?.optionLabels[field.id]) return items
      return items.map((option: any) => {
        if (typeof option === "string") return option
        const key = getOptionId(option)
        const translatedLabel = resolved.optionLabels[field.id]?.[key]
        return translatedLabel ? { ...option, label: translatedLabel } : option
      })
    },
    [resolved],
  )

  // set the title of the page
  useEffect(() => {
    navigation.setOptions({
      title: resolved?.formName ?? form?.name ?? "Event Form",
    })
  }, [resolved?.formName, form?.name, navigation])

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
    try {
      // Initialize upload state
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
      const apiUrl = await Peer.getActiveUrl()
      if (!apiUrl) throw new Error("No server URL configured")
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

  return (
    <BottomSheetModalProvider>
      <Screen style={$root} preset="scroll">
        <View gap={12} pb={24}>
          {form.formFields.map((field, idx) => {
            // console.log(field.fieldType, "as a ", field.inputType, "options: ", field.options)
            // console.log("is Multi", field.multi)
            return (
              <View key={`formField-${idx}`}>
                {/* Static text display (read-only) */}
                <If condition={field.fieldType === "text"}>
                  <Text
                    text={resolved?.fieldNames[field.id] ?? field.content ?? field.name}
                    size={field.size ?? "md"}
                  />
                  {getFieldDescription(field) ? (
                    <Text text={getFieldDescription(field)} size="xs" color={colors.textDim} />
                  ) : null}
                </If>

                {/* Visual separator / divider */}
                <If condition={field.fieldType === "separator"}>
                  <View py={8}>
                    <View style={$separator} />
                  </View>
                </If>

                <If
                  condition={
                    (field.inputType === "text" || field.inputType === "number") &&
                    field.fieldType !== "text" &&
                    field.fieldType !== "separator"
                  }
                >
                  <Controller
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextField
                        label={resolved?.fieldNames[field.id] ?? field.name}
                        description={getFieldDescription(field)}
                        onChangeText={onChange}
                        keyboardType={field.inputType === "number" ? "number-pad" : "default"}
                        onBlur={onBlur}
                        required={field.required}
                        value={value}
                      />
                    )}
                    name={sanitizeFieldName(field.name) as never}
                    control={control}
                  />
                </If>
                <If condition={field.inputType === "textarea"}>
                  <Controller
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextField
                        label={resolved?.fieldNames[field.id] ?? field.name}
                        description={getFieldDescription(field)}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        required={field.required}
                        value={value}
                        multiline
                      />
                    )}
                    name={sanitizeFieldName(field.name) as never}
                    control={control}
                  />
                </If>

                <If condition={field.inputType === "select" && field.fieldType !== "diagnosis"}>
                  <Controller
                    name={sanitizeFieldName(field.name) as never}
                    control={control}
                    render={({ field: { value, onChange } }) => {
                      const isMulti = Option.isOption(field.multi)
                        ? Option.getOrElse(field.multi, () => false)
                        : field.multi || false
                      return (
                        <View style={{}}>
                          <Text
                            text={resolved?.fieldNames[field.id] ?? field.name}
                            preset="formLabel"
                            withAsterisk={field.required}
                          />
                          {getFieldDescription(field) ? (
                            <Text
                              text={getFieldDescription(field)}
                              size="xs"
                              color={colors.textDim}
                            />
                          ) : null}
                          <DropDownPicker
                            open={isOpen(field.id)}
                            value={multiPickerValue(value, isMulti)}
                            searchable
                            closeAfterSelecting
                            style={$dropDownStyle}
                            modalTitle={resolved?.fieldNames[field.id] ?? field.name}
                            multiple={isMulti}
                            modalContentContainerStyle={[
                              $modalContentContainerStyle,
                              { paddingTop: safeAreaPaddingTop },
                            ]}
                            mode="BADGE"
                            searchPlaceholder={
                              translate("common:search", { defaultValue: "Search" }) + "..."
                            }
                            searchTextInputStyle={$inputWrapperStyle as unknown as TextStyle}
                            closeOnBackPressed
                            onClose={closeDialogue}
                            items={sortBy(getTranslatedItems(field), ["label"])}
                            setOpen={openDialogue(field.id)}
                            listMode="MODAL"
                            // setValue={(callback) => {
                            //   const pickerValue = multiPickerValue(value, isMulti)
                            //   const result = callback(pickerValue || "")
                            //   const newValue =
                            //     isMulti && Array.isArray(result) ? result.join("; ") : result
                            //   onChange(newValue)
                            // }}
                            setValue={(callback) => {
                              const pickerValue = multiPickerValue(
                                getValues(sanitizeFieldName(field.name)) as any,
                                Option.getOrElse(field.multi, () => false),
                              )
                              const data = callback(pickerValue || "")
                              const newValue =
                                field.multi && Array.isArray(data) ? data.join("; ") : data
                              setValue(sanitizeFieldName(field.name) as never, newValue as never)
                            }}
                          />
                        </View>
                      )
                    }}
                  />
                </If>

                <If condition={field.inputType === "checkbox"}>
                  <Controller
                    render={({ field: { value } }) => (
                      <View gap={4}>
                        <View mt={4} />
                        <Checkbox
                          label={resolved?.fieldNames[field.id] ?? field.name}
                          value={value}
                          onValueChange={(value) => {
                            if (value) {
                              setValue(sanitizeFieldName(field.name) as never, value as never)
                            } else {
                              setValue(sanitizeFieldName(field.name) as never, "" as never)
                            }
                          }}
                        />
                        {getFieldDescription(field) ? (
                          <Text
                            text={getFieldDescription(field)}
                            size="xs"
                            color={colors.textDim}
                          />
                        ) : null}
                      </View>
                    )}
                    name={sanitizeFieldName(field.name) as never}
                    control={control}
                  />
                </If>

                {/* File UPLOADS ARE NOT SUPPORTED YET */}
                <If condition={field.inputType === "file" && false}>
                  <Controller
                    render={() => (
                      <View gap={4}>
                        <Text
                          text={resolved?.fieldNames[field.id] ?? field.name}
                          preset="formLabel"
                        />
                        {getFieldDescription(field) ? (
                          <Text
                            text={getFieldDescription(field)}
                            size="xs"
                            color={colors.textDim}
                          />
                        ) : null}
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
                    name={sanitizeFieldName(field.name) as never}
                    control={control}
                  />
                </If>

                <If condition={field.inputType === "date"}>
                  <Controller
                    render={({ field: { onChange, value } }) => (
                      <View style={{}}>
                        <Text
                          text={resolved?.fieldNames[field.id] ?? field.name}
                          preset="formLabel"
                          withAsterisk={field.required}
                        />
                        {getFieldDescription(field) ? (
                          <Text
                            text={getFieldDescription(field)}
                            size="xs"
                            color={colors.textDim}
                          />
                        ) : null}
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
                    name={sanitizeFieldName(field.name) as never}
                    control={control}
                  />
                </If>

                <If condition={field.inputType === "radio"}>
                  <Controller
                    render={({ field: { value } }) => (
                      <View gap={4}>
                        <Text
                          text={resolved?.fieldNames[field.id] ?? field.name}
                          preset="formLabel"
                          withAsterisk={field.required}
                        />
                        {getFieldDescription(field) ? (
                          <Text
                            text={getFieldDescription(field)}
                            size="xs"
                            color={colors.textDim}
                          />
                        ) : null}
                        <View mt={4} />
                        {getTranslatedItems(field).map((option: any) => (
                          <Radio
                            key={option.value}
                            label={option.label}
                            value={value === option.value}
                            onValueChange={(value) => {
                              if (value) {
                                setValue(
                                  sanitizeFieldName(field.name) as never,
                                  option.value as never,
                                )
                              } else {
                                // set the default value to an empty string
                                setValue(sanitizeFieldName(field.name) as never, "" as never)
                              }
                            }}
                          />
                        ))}
                      </View>
                    )}
                    name={sanitizeFieldName(field.name) as never}
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
                    required={field.required}
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
    let cancelled = false
    let formSub: { unsubscribe: () => void } | null = null
    let formReady = false
    let eventReady = !eventId // no event to load = already ready

    const checkReady = () => {
      if (!cancelled && formReady && eventReady) {
        setIsLoading(false)
      }
    }

    /** Subscribe to the form */
    database.collections
      .get<EventFormModel>("event_forms")
      .find(formId)
      .then((record) => {
        if (cancelled) return
        formSub = record.observe().subscribe((form) => {
          if (!cancelled) {
            setForm(form)
            formReady = true
            checkReady()
          }
        })
      })
      .catch((error) => {
        console.error(error)
        if (!cancelled) {
          setForm(null)
          formReady = true
          checkReady()
        }
      })

    /** Subscribe to the event if it exists */
    const eventSub = eventId
      ? database.collections
          .get<EventModel>("events")
          .findAndObserve(eventId)
          .subscribe((event) => {
            if (cancelled) return
            updateFormState((d) => {
              const draft = d || ({} as any)
              draft.formId = event.formId
              draft.visitId = event.visitId
              draft.patientId = event.patientId
              draft.formData = event.formData
              draft.createdAt = event.createdAt
              draft.updatedAt = event.updatedAt
              draft.id = event.id
              return draft
            })
            eventReady = true
            checkReady()
          })
      : null

    return () => {
      cancelled = true
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

const $separator: ViewStyle = {
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral400,
  marginTop: 4,
}
