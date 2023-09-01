import { useState, useEffect } from "react"
import { View } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { Text } from "../components/Text"
import { Screen } from "../components/Screen"
import PatientModel from "../db/model/Patient"
import { differenceInYears } from "date-fns"
import { translate } from "../i18n"
import database from "../db"

type AgeGroup =
  | "0-1"
  | "1-4"
  | "5-10"
  | "11-15"
  | "16-20"
  | "21-30"
  | "31-40"
  | "41-50"
  | "51-60"
  | "61-70"
  | "65+"
const ageGroupsList: AgeGroup[] = [
  "0-1",
  "1-4",
  "5-10",
  "11-15",
  "16-20",
  "21-30",
  "31-40",
  "41-50",
  "51-60",
  "61-70",
  "65+",
]
type Report = {
  [key: AgeGroup]: {
    min: number
    max: number
    male: number
    female: number
  }
}

function getAgeGroup(age: number): AgeGroup {
  if (age <= 1) {
    return "0-1"
  } else if (age <= 4) {
    return "1-4"
  } else if (age <= 10) {
    return "5-10"
  } else if (age <= 15) {
    return "11-15"
  } else if (age <= 20) {
    return "16-20"
  } else if (age <= 30) {
    return "21-30"
  } else if (age <= 40) {
    return "31-40"
  } else if (age <= 50) {
    return "41-50"
  } else if (age <= 60) {
    return "51-60"
  } else if (age <= 70) {
    return "61-70"
  } else {
    return "65+"
  }
}

function getAgeGroupRange(ageGroup: AgeGroup): [number, number] {
  switch (ageGroup) {
    case "0-1":
      return [0, 1]
    case "1-4":
      return [1, 4]
    case "5-10":
      return [5, 10]
    case "11-15":
      return [11, 15]
    case "16-20":
      return [16, 20]
    case "21-30":
      return [21, 30]
    case "31-40":
      return [31, 40]
    case "41-50":
      return [41, 50]
    case "51-60":
      return [51, 60]
    case "61-70":
      return [61, 70]
    case "65+":
      return [65, 100]
  }
}

// initialize the report object
const initializeReport = (): Report => {
  return ageGroupsList.reduce((acc, ageGroup) => {
    const [min, max] = getAgeGroupRange(ageGroup)
    return {
      ...acc,
      [ageGroup]: {
        min,
        max,
        male: 0,
        female: 0,
      },
    }
  }, {})
}

// Given a patient and a report, update the report counts for the patient's age group and sex
const updateReport = (patient: PatientModel, report: Report): Report => {
  const patientAge = differenceInYears(new Date(), new Date(patient.dateOfBirth))
  const ageGroup = getAgeGroup(patientAge)
  return {
    ...report,
    [ageGroup]: {
      ...report[ageGroup],
      ...(patient.sex === "male" && { male: report[ageGroup].male + 1 }),
      ...(patient.sex === "female" && { female: report[ageGroup].female + 1 }),
    },
  }
}

const countTotalBySex = (sex: "male" | "female", report: Report): number => {
  return Object.values(report).reduce((acc, ageGroup) => {
    return ageGroup[sex] + acc
  }, 0)
}

// Colors for the sexes in the report
const maleColor = "#1f77b4"
const femaleColor = "#ff7f0e"

export function SummaryStats() {
  const navigation = useNavigation()
  const [report, setReport] = useState<Report>(initializeReport())
  const [loadingReport, setLoadingReport] = useState(true)


  console.log(navigation.isFocused())

  useEffect(() => {
    let subs = database.collections
      .get<PatientModel>("patients")
      .query().observeCount().subscribe(count => {
        // If the count changes, thats when we can refetch the data, as opposed to constant resetting when the patient object changess
        database.collections.get<PatientModel>("patients").query().fetch().then((patients) => {
          const result = patients.reduce(
            (acc, patient) => updateReport(patient, acc),
            initializeReport(),
          )

          setReport({ ...result })
          setLoadingReport(false)
        })
      })

    return () => subs.unsubscribe()
  }, [])

  return (
    <Screen preset="scroll" style={$screen}>
      <Text variant="titleLarge">{translate("summaryStats.ageSexBreakdown")}</Text>

      <View style={{ flexDirection: "row", gap: 20, marginVertical: 15 }}>
        <View style={{ flexDirection: "row" }}>
          <View style={{ width: 20, height: 20, backgroundColor: maleColor, marginRight: 5 }} />
          <Text>Male ({countTotalBySex("male", report)})</Text>
        </View>
        <View style={{ flexDirection: "row" }}>
          <View style={{ width: 20, height: 20, backgroundColor: femaleColor, marginRight: 5 }} />
          <Text>Female ({countTotalBySex("female", report)})</Text>
        </View>
      </View>

      {Object.keys(report).map((group) => {
        const ageGroup = report[group]
        return (
          <View
            style={{ flexDirection: "row", alignItems: "center", marginBottom: 10, width: "80%" }}
          >
            <View style={{ flex: 1 }}>
              <Text>{group}</Text>
            </View>
            <View style={{ width: 20 }} />
            <View style={{ flex: 6 }}>
              <GroupedChartBar
                bars={[
                  { label: "female", value: ageGroup.female, total: 20, color: femaleColor },
                  { label: "male", value: ageGroup.male, total: 10, color: maleColor },
                ]}
              />
            </View>
          </View>
        )
      })}


      <View style={{ height: 20 }} />

    </Screen>
  )
}

type ChartBarProps = {
  label: string
  value: number
  total: number
  color: string
}

const ChartBar = (props: ChartBarProps) => {
  const { label, value, total, color = "#ccc" } = props
  const percent = total === 0 ? 0 : 100 * (value / total)
  const width = `${percent.toFixed(1)}%`
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginRight: 10 }}>
      <View
        style={{
          height: 30,
          width: width === "0.0%" ? 4 : width,
          backgroundColor: color,
          marginRight: 4,
        }}
      />
      <Text>{value} </Text>
      <Text variant="bodySmall">({width})</Text>
    </View>
  )
}

const GroupedChartBar = (props: { bars: ChartBarProps[] }) => {
  const total = props.bars.reduce((acc, curr) => acc + curr.value, 0)
  return (
    <View style={{ flexDirection: "column", paddingVertical: 2 }}>
      {props.bars.map((bar) => (
        <ChartBar {...bar} key={bar.label} total={total} />
      ))}
    </View>
  )
}

const $screen = {
  paddingTop: 10,
}

// TODO: Performance fix: As the number of patients grows, this will become slow. We should page the queries and load a few patients at a time while generating the reports iteratively.
