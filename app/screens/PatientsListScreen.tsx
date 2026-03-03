import { FC, useEffect, useState } from "react"
import { ViewStyle, StatusBar, Pressable, Alert } from "react-native"
import { LegendList } from "@legendapp/list"
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
import { useDataProviderPatients } from "@/hooks/useDataProviderPatients"
import { translate } from "@/i18n/translate"
import Patient from "@/models/Patient"
import { PatientNavigatorParamList } from "@/navigators/PatientNavigator"
import { languageStore } from "@/store/language"
import { providerStore } from "@/store/provider"
import { colors } from "@/theme/colors"
import Toast from "react-native-root-toast"
import { usePermissionGuard } from "@/hooks/usePermissionGuard"

interface PatientsListScreenProps
  extends NativeStackScreenProps<PatientNavigatorParamList, "PatientsList"> {}

export const PatientsListScreen: FC<PatientsListScreenProps> = ({ navigation }) => {
  const { language, isRTL } = useSelector(languageStore, (state) => state.context)
  const { id: providerId } = useSelector(providerStore, (state) => state.context)
  const isFocused = useIsFocused()
  const { can } = usePermissionGuard()

  const { formFields, patientRecord } = usePatientRecordEditor(undefined, language)
  const {
    patients,
    totalCount,
    isLoading,
    searchFilter,
    setSearchField,
    resetSearchFilter,
    loadMore,
    expandedSearchAvailable,
    searchParams,
    onChangeSearchParam,
    resetSearchParams,
  } = useDataProviderPatients(30, patientRecord.fields, providerId)

  const [isExpandedSearch, setIsExpandedSearch] = useState(false)

  // On collapse expanded search, clear extended search fields
  useEffect(() => {
    if (!isExpandedSearch) {
      setSearchField("yearOfBirth", "")
      setSearchField("sex", "")
      resetSearchParams()
    }
  }, [isExpandedSearch])

  const openPatientDetails = (patientId: string) => {
    navigation.navigate("PatientView", { patientId })
  }

  const openPatientRegisterForm = () => {
    if (!can("patient:register")) {
      Toast.show("You do not have permission to register new patients", {
        position: Toast.positions.BOTTOM,
      })
      return
    }
    navigation.navigate("PatientRecordEditor", { editPatientId: undefined })
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
          },
        },
      ],
      {
        cancelable: true,
      },
    )
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={colors.palette.neutral200} />
      <LegendList
        contentContainerStyle={$patientList}
        onRefresh={loadMore}
        refreshing={false}
        testID="patientList"
        // getFixedItemSize={()}
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

            {expandedSearchAvailable && (
              <View gap={8}>
                <If condition={isExpandedSearch}>
                  {formFields
                    .filter((f) => f.isSearchField)
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
                  {isLoading && <Text text="Loading ..." />}
                </If>
              </View>
            )}

            <View direction="row" justifyContent="space-between" alignItems="flex-start">
              <Text
                text={`${translate("common:showing")} ${
                  patients.length
                } / ${totalCount.toLocaleString()}`}
              />
              {expandedSearchAvailable && (
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
              )}
            </View>
          </View>
        }
        ItemSeparatorComponent={() => <View style={$separator} />}
        ListFooterComponent={() => <View style={{ height: 40 }} />}
        data={patients}
        recycleItems={false}
        extraData={`${isFocused ? "focused" : "not_focused"}_${patients.length}_${totalCount}_${isLoading ? "loading" : "loaded"}`}
        keyExtractor={(item: Patient.T) => `${item.id}_${item.updatedAt}`}
        renderItem={({ item }: { item: Patient.T }) => (
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
