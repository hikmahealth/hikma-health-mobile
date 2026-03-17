import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Pressable, TextStyle, ViewStyle } from "react-native"
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetModalProvider,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet"

import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useSelector } from "@xstate/react"
import { formatRelative } from "date-fns"
import { Option } from "effect"
import { upperFirst } from "es-toolkit/compat"
import { ChevronRight, LucideCheckCheck, LucideFilter } from "lucide-react-native"
import { useImmerReducer } from "use-immer"

import { Button } from "@/components/Button"
import { DatePickerButton } from "@/components/DatePicker"
import { If } from "@/components/If"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Radio } from "@/components/Toggle/Radio"
import { View } from "@/components/View"

import EventModel from "@/db/model/Event"
import { useEventForms } from "@/hooks/useEventForms"
import { useProviderVisitEvents } from "@/hooks/useProviderVisitEvents"
import { useVisitEvents } from "@/hooks/useVisitEvents"
import Event from "@/models/Event"
import EventForm from "@/models/EventForm"
import Language from "@/models/Language"
import { PatientNavigatorParamList } from "@/navigators/PatientNavigator"
import { useDataAccess } from "@/providers/DataAccessProvider"
import { languageStore } from "@/store/language"
import { colors } from "@/theme/colors"
import { toDateSafe } from "@/utils/date"
import { resolveFormTranslations } from "@/utils/eventFormTranslations"
import { formatDate } from "@/utils/formatDate"

interface NewVisitScreenProps extends NativeStackScreenProps<
  PatientNavigatorParamList,
  "NewVisit"
> {}

type Filters = {
  language: Language.LanguageName | "all"
}

const initialFiltersState: Filters = {
  language: "all",
}

type FiltersAction = { type: "setLanguage"; language: Filters["language"] } | { type: "reset" }

function filtersReducer(draft: Filters, action: FiltersAction) {
  switch (action.type) {
    case "setLanguage":
      draft.language = action.language
      break
    case "reset":
      return initialFiltersState
    default:
      return draft
  }
}

export const NewVisitScreen: FC<NewVisitScreenProps> = ({ route, navigation }) => {
  const { patientId, visitDate, appointmentId, departmentId } = route.params
  const visitId = Option.fromNullable(route.params.visitId)
  const language = useSelector(languageStore, (store) => store.context.language)
  const { isOnline } = useDataAccess()
  const [eventDate, setEventDate] = useState<number>(visitDate)

  // User can filter forms on their visit screens
  const [filters, setFilters] = useImmerReducer(filtersReducer, initialFiltersState)

  // Offline: WatermelonDB observable events. Online: React Query events.
  const visitIdStr = Option.isSome(visitId) ? (visitId.value as string) : null
  const { events: offlineEvents, isLoading: _isLoadingOfflineEvents } = useVisitEvents(visitIdStr)
  const onlineEvents = useProviderVisitEvents(
    isOnline ? visitIdStr : null,
    isOnline ? patientId : null,
  )
  const eventsList = isOnline ? ((onlineEvents.data ?? []) as any) : offlineEvents
  const _isLoadingEvents = isOnline ? onlineEvents.isLoading : _isLoadingOfflineEvents

  // Manually setting the language to none, as we add a new feature to forms to support multiple languages
  // FIXME: Must develop a permanent fix decide
  const formLanguageFilter =
    filters.language === "all" ? Option.none() : Option.some(filters.language)
  const { forms, isLoading: _isLoadingForms } = useEventForms(formLanguageFilter)

  console.log({ forms })

  const snapPoints = useMemo(() => ["40%", "40%"], [])
  // ref
  const bottomSheetModalRef = useRef<BottomSheetModal>(null)

  // callbacks
  const handlePresentModalPress = useCallback(() => {
    bottomSheetModalRef.current?.present()
  }, [])
  const handleSheetChanges = useCallback((index: number) => {
    console.log("handleSheetChanges", index)
  }, [])

  const handleLanguageFilterChange = useCallback(
    (lang: Filters["language"]) => {
      setFilters({ type: "setLanguage", language: lang })
    },
    [setFilters],
  )

  /** If we are updating an existing visit, then we are just adding an event. update the title to reflect this */
  useEffect(() => {
    if (Option.isSome(visitId) && (visitId.value as string).length > 3) {
      navigation.setOptions({
        // TODO: Localize
        title: "Add Event",
      })
    }
  }, [visitId, navigation])

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={1} appearsOnIndex={2} />,
    [],
  )

  // TODO: Add provider check, make sure a provider is signed in and exists

  return (
    <BottomSheetModalProvider>
      <Screen style={$root} preset="scroll">
        <View gap={8} pt={0}>
          <DatePickerButton
            date={new Date(eventDate)}
            theme="light"
            maximumDate={new Date()}
            onDateChange={(d) => setEventDate(d.getTime())}
          />

          <View direction="row" justifyContent="flex-end">
            <Pressable testID="open-filters-btn" onPress={handlePresentModalPress}>
              <View direction="row" alignItems="center" gap={10}>
                <Text text="Filters" color={colors.palette.primary400} size="sm" />
                <LucideFilter size={16} color={colors.palette.primary400} />
              </View>
            </Pressable>
          </View>

          {forms.map((form, idx) => {
            const formT = EventForm.fromDB(form)
            const resolved = resolveFormTranslations(formT, language)
            const formEntries = eventsList.filter((eventData: any) => eventData.formId === form.id)
            return (
              <EventFormItem
                key={`formItem-${idx}`}
                form={formT}
                translatedName={resolved.formName}
                translatedDescription={resolved.formDescription}
                entries={formEntries}
                onPress={() => {
                  navigation.navigate("EventForm", {
                    visitId: Option.isSome(visitId) ? (visitId.value as string) : null,
                    patientId,
                    formId: form.id,
                    eventId: null,
                    appointmentId,
                    departmentId,
                  })
                }}
              />
            )
          })}
        </View>

        <View my={10} />

        <Button tx="newVisit:completeVisit" onPress={() => navigation.goBack()} />
        <View style={$bottomPadding} />
      </Screen>

      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={1}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        onChange={handleSheetChanges}
      >
        <BottomSheetView style={{}}>
          <View p={10}>
            <Text preset="formLabel">Select form language</Text>
            <View gap={4} pt={10}>
              <Radio
                label="English"
                value={filters.language === "en"}
                onValueChange={() => handleLanguageFilterChange("en")}
              />
              <Radio
                label="Arabic"
                value={filters.language === "ar"}
                onValueChange={() => handleLanguageFilterChange("ar")}
              />
              <Radio
                label="Spanish"
                value={filters.language === "es"}
                onValueChange={() => handleLanguageFilterChange("es")}
              />
              <Radio
                label="Show all languages"
                value={filters.language === "all"}
                onValueChange={() => handleLanguageFilterChange("all")}
              />
            </View>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </BottomSheetModalProvider>
  )
}

type EventFormItemProps = {
  form: EventForm.T
  translatedName: string
  translatedDescription: string
  entries: EventModel[]
  onPress: () => void
}

/**
 * EventForm Item
 */
function EventFormItem({
  form,
  translatedName,
  translatedDescription,
  onPress,
  entries = [],
}: EventFormItemProps) {
  return (
    <View style={$formListItem}>
      <Pressable onPress={onPress} style={$formListItemBtn}>
        <View direction="row" flexWrap="wrap" justifyContent="space-between">
          <View direction="row" justifyContent="space-between" gap={8}>
            <View direction="row" flexWrap="wrap" gap={6}>
              {entries.length > 0 && <LucideCheckCheck color="green" />}
              <Text weight="bold" style={$eventFormTitle}>
                {translatedName}
              </Text>
            </View>
            {/*<View justifyContent="flex-end">
              <View
                alignContent="center"
                justifyContent="center"
                alignItems="center"
                style={$languageBadge}
              >
                <Text text={form.language} color="white" size="xxs" />
              </View>
            </View>*/}
          </View>
          <Text size="xs">{translatedDescription}</Text>
        </View>
        <ChevronRight color={colors.palette.neutral500} />
      </Pressable>

      <If condition={entries.length > 0}>
        <View mt={6}>
          <Text size="xs" weight="bold" text="Entries" />

          {entries.map((eventEntry, index) => {
            const currentTime = new Date()
            const label = `${index + 1}. ${upperFirst(formatRelative(toDateSafe(eventEntry.createdAt, currentTime), currentTime))}`
            return <Text size="xxs" text={label} key={eventEntry.id} />
          })}
        </View>
      </If>
    </View>
  )
}

const $root: ViewStyle = {
  flex: 1,
  padding: 10,
  paddingTop: 0,
}

const $formListItem: ViewStyle = {
  padding: 10,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
}

const $eventFormTitle: TextStyle = {
  flexWrap: "wrap",
}

const $formListItemBtn: ViewStyle = {
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingRight: 10,
}

const $languageBadge: ViewStyle = {
  backgroundColor: colors.palette.primary400,
  paddingVertical: 0,
  borderRadius: 5,
  paddingHorizontal: 5,
}

const $bottomPadding: ViewStyle = {
  height: 100,
}
