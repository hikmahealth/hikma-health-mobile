import { FC, useEffect, useState } from "react"
import { ViewStyle, StatusBar, Pressable, Alert } from "react-native"
import { LegendList } from "@legendapp/list"
import { Picker } from "@react-native-picker/picker"
import { useIsFocused } from "@react-navigation/native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useSelector } from "@xstate/react"
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react-native"

import { If } from "@/components/If"
import { PatientListItem } from "@/components/PatientListItem"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { View } from "@/components/View"
import { usePatientRecordEditor } from "@/hooks/usePatientRecordEditor"
import { usePatientsList } from "@/hooks/usePatientsList"
import { translate } from "@/i18n/translate"
import { PatientNavigatorParamList } from "@/navigators/PatientNavigator"
import { languageStore } from "@/store/language"
import { providerStore } from "@/store/provider"
import { colors } from "@/theme/colors"
import { useSafeArea, useSafeAreaInsets } from "react-native-safe-area-context"

interface PatientsListScreenProps
  extends NativeStackScreenProps<PatientNavigatorParamList, "PatientsList"> {}

export const PatientsListScreen: FC<PatientsListScreenProps> = ({ navigation }) => {
  const { language, isRTL } = useSelector(languageStore, (state) => state.context)
  const { id: providerId } = useSelector(providerStore, (state) => state.context)
  const isFocused = useIsFocused()

  const { formFields, patientRecord } = usePatientRecordEditor(undefined, language)
  const {
    patients,
    searchFilter,
    getNextPagePatients,
    resetSearchFilter,
    totalPatientsCount,
    setSearchField,
    searchParams,
    onChangeSearchParam,
    resetSearchParams,
    isLoading: isPatientListLoading,
  } = usePatientsList(30, patientRecord.fields, providerId)
  const [isExpandedSearch, setIsExpandedSearch] = useState(false)

  // On colapse expanded search, set year of birth and sex to empty
  useEffect(() => {
    if (!isExpandedSearch) {
      setSearchField("yearOfBirth", "")
      setSearchField("sex", "")
      resetSearchParams()
    }
  }, [isExpandedSearch])

  /**
   * Open patient details screen by forwarding the patientID to the patient details screen
   * @param {string} patientId - The patient ID
   */
  const openPatientDetails = (patientId: string) => {
    navigation.navigate("PatientView", { patientId })
  }

  const openPatientRegisterForm = () => {
    navigation.navigate("PatientRecordEditor", { editPatientId: undefined })
  }

  const handlePatientSelected = (id: string) => {
    navigation.navigate("PatientView", { patientId: id })
  }

  const handlePatientLongPress = (id: string) => {
    // TODO: Implement patient long press
  }

  const openPatientEditOptions = (patientId: string) => {
    Alert.alert(
      translate("patientList:managePatient"),
      "",
      [
        {
          text: translate("common:delete"),
          onPress: () => {
            return Alert.alert(
              "Delete not allowed",
              "Deleting patients in currently not allowed. Contact your administrator",
              [{ text: "OK" }],
              {
                cancelable: true,
              },
            )
            // Alert.alert(
            //   translate("patientList.deletePatientQuestion"),
            //   translate("patientList.confirmDeletePatient"),
            //   [
            //     { text: translate("common:cancel") },
            //     {
            //       text: translate("common:delete"),
            //       onPress: () => {
            //         patientApi.deleteById(patientId)
            //       },
            //     },
            //   ],
            //   {
            //     cancelable: true,
            //   },
            // )
          },
        },
      ],
      {
        cancelable: true,
      },
    )
  }

  const insets = useSafeAreaInsets()

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={colors.palette.neutral200} />
      <LegendList
        contentContainerStyle={$patientList}
        onRefresh={getNextPagePatients}
        refreshing={false}
        testID="patientList"
        ListHeaderComponent={
          <View pb={10} pt={6} gap={4}>
            <TextField
              RightAccessory={() =>
                searchFilter.query.length > 0 ? (
                  <Pressable
                    style={{ alignSelf: "center", marginRight: 10, marginLeft: 10 }}
                    onPress={resetSearchFilter}
                  >
                    <XIcon color={colors.palette.neutral700} size={16} />
                  </Pressable>
                ) : (
                  <SearchIcon
                    style={{ alignSelf: "center", marginRight: 10, marginLeft: 10 }}
                    color={colors.palette.neutral700}
                    size={16}
                  />
                )
              }
              value={searchFilter.query}
              onChangeText={(query) => setSearchField("query", query)}
              placeholderTx="patientList:nameSearch"
            />

            <View gap={8}>
              <If condition={isExpandedSearch}>
                {formFields
                  .filter((f) => f.isSearchField)
                  // ignore date fields for now
                  // FIXME: Add support for date field filters
                  // .filter((f) => f.type !== "date")
                  .map((field) => {
                    const { type } = field
                    const keyboardType = (() => {
                      if (type === "number" || type === "date") {
                        return "number-pad"
                      } else {
                        return "default"
                      }
                    })()
                    return (
                      <View direction="row" gap={8} key={field.id}>
                        <View flex={1}>
                          <TextField
                            value={searchParams[field.id] || ""}
                            // onChangeText={(yob) => setSearchField("yearOfBirth", yob)}
                            onChangeText={(t) => onChangeSearchParam(field.id, t)}
                            placeholder={
                              field.type === "date" ? `${field.label} (Year only)` : field.label
                            }
                            keyboardType={keyboardType}
                          />
                        </View>
                      </View>
                    )
                  })}
                {isPatientListLoading && <Text text="Loading ..." />}
              </If>
            </View>

            <View>
              {isExpandedSearch && false && (
                <View direction="row" gap={8}>
                  <View flex={1}>
                    <TextField
                      value={searchFilter.yearOfBirth}
                      onChangeText={(yob) => setSearchField("yearOfBirth", yob)}
                      placeholderTx="common:yearOfBirth"
                      keyboardType="number-pad"
                    />
                  </View>

                  <View flex={1}>
                    <Picker
                      selectedValue={searchFilter.sex}
                      mode="dialog"
                      onValueChange={(sex) => setSearchField("sex", sex)}
                    >
                      <Picker.Item label={translate("common:sex")} value="" />
                      <Picker.Item label={translate("common:male")} value="male" />
                      <Picker.Item label={translate("common:female")} value="female" />
                    </Picker>
                  </View>
                </View>
              )}
            </View>

            <View direction="row" justifyContent="space-between" alignItems="flex-start">
              <Text
                text={`${translate("common:showing")} ${
                  patients.length
                } / ${totalPatientsCount.toLocaleString()}`}
              />
              <View alignItems="flex-end">
                <Pressable onPress={() => setIsExpandedSearch((ex) => !ex)}>
                  <View direction="row" alignItems="flex-end" gap={8}>
                    <Text
                      size="xs"
                      tx={
                        isExpandedSearch
                          ? "patientList:hideSearchOptions"
                          : "patientList:showSearchOptions"
                      }
                    />
                    {!isExpandedSearch ? (
                      <ChevronDownIcon size={18} color={colors.palette.neutral800} />
                    ) : (
                      <ChevronUpIcon size={18} color={colors.palette.neutral800} />
                    )}
                  </View>
                </Pressable>
              </View>
            </View>
          </View>
        }
        ItemSeparatorComponent={() => <View style={$separator} />}
        ListFooterComponent={() => <View style={{ height: 40 }} />}
        data={patients}
        recycleItems={false}
        extraData={`${isFocused ? "focused" : "not_focused"}_${patients.length}_${totalPatientsCount}_${isPatientListLoading ? "loading" : "loaded"}`}
        // the key contains the updatedAt, to ensure that the list is updated when the patient data changes
        keyExtractor={(item, index) => `${item.id}_${item.updatedAt}`}
        renderItem={({ item }) => (
          <PatientListItem
            onPatientLongPress={openPatientEditOptions}
            patient={item}
            isRTL={isRTL}
            onPatientSelected={openPatientDetails}
          />
        )}
      />

      <Pressable onPress={openPatientRegisterForm} style={$newVisitFAB}>
        <PlusIcon color={"white"} size={20} style={{ marginRight: 10 }} />
        <Text color="white" size="sm" text={translate("newPatient:newPatient")} />
      </Pressable>
    </>
  )

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={colors.palette.neutral200} />
      {/*<Text text={patients.length.toString()} />*/}
      {/* FIXME: This screen is sometimes blank */}
      <LegendList
        contentContainerStyle={$patientList}
        data={patients}
        renderItem={({ item }) => (
          <PatientListItem
            patient={item}
            onPatientSelected={handlePatientSelected}
            onPatientLongPress={handlePatientLongPress}
          />
        )}
        // Recommended props (Improves performance)
        keyExtractor={(item) => item.id}
        recycleItems={true}
        ListFooterComponent={() => <View style={{ height: 40 }} />}
        ItemSeparatorComponent={() => <View style={$separator} />}
        // Recommended if data can change
        maintainVisibleContentPosition
      />

      <Pressable
        onPress={openPatientRegisterForm}
        style={({ pressed }) => [
          $newVisitFAB,
          pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
        ]}
      >
        <PlusIcon color={"white"} size={20} style={{ marginRight: 10 }} />
        <Text color="white" size="sm" text={translate("newPatient:newPatient")} />
      </Pressable>
    </>
  )
}

const $patientList = {
  paddingHorizontal: 12,
}

const $newVisitFAB: ViewStyle = {
  display: "flex",
  flexDirection: "row",
  position: "absolute",
  bottom: 60,
  right: 24,
  elevation: 4,
  zIndex: 100,
  borderRadius: 10,
  padding: 14,
  backgroundColor: colors.palette.primary500,
  justifyContent: "center",
  alignItems: "center",
}

const $separator: ViewStyle = {
  height: 1,
  backgroundColor: colors.border,
  marginVertical: 6,
}
