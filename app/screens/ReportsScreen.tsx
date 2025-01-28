import React, { FC, useEffect, useMemo, useState } from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle } from "react-native"
import { AppStackScreenProps } from "../navigators"
import { Screen, Text, View, getDiagnosesFromFormData } from "../components"
import EventModel from "../db/model/Event"
import database from "../db"
import PatientModel from "../db/model/Patient"
import { Q } from "@nozbe/watermelondb"
import { useImmer } from "use-immer"
import { subDays } from "date-fns"
// import { useStores } from "../models"

type DBSimpleReports = {
  reports: {
    sexDistribution: {
      male: number
      female: number
    }
    ageDistribution: {
      "0-5": number
      "6-12": number
      "13-18": number
      "19-30": number
      "31-50": number
      "51-65": number
      "66-80": number
      "81+": number
    }
    // only show top 5 diagnoses
    diagnosisDistribution: {
      [diag: string]: number
    }
    totalPatients: number
  }
  isLoading: boolean
}

/**
 * Returns a simple report of the data in the database.
 * @param {Date} startDate
 * @param {Date | undefined} endDate
 * @returns {DBSimpleReports}
 */
function useDBSimpleReports(startDate: Date, endDate: Date = new Date()): DBSimpleReports {
  const [events, setEvents] = useState<EventModel[]>([])
  const [patients, setPatients] = useState<PatientModel[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    database.collections
      .get<EventModel>("events")
      .query(Q.where("created_at", Q.between(startDate.getTime(), endDate.getTime())))
      .fetch()
      .then((evs) => {
        setEvents(evs)
      })

    database.collections
      .get<PatientModel>("patients")
      .query()
      .fetch()
      .then((pats) => {
        setPatients(pats)
        setIsLoading(false)
      })

    return () => {}
  }, [startDate, endDate])

  const eventsWithDiagnoses = useMemo(() => {
    const diags = events.map((event) => getDiagnosesFromFormData(event.formData))
    return diags.flat().filter((diagnosis) => diagnosis !== undefined)
  }, [startDate, endDate, events])

  // sex distribution
  const patientSexDistribution: { female: number; male: number } = useMemo(() => {
    return patients.reduce(
      (acc, patient) => {
        const pSex = patient.sex
        return {
          ...acc,
          [pSex]: acc[pSex] + 1,
        }
      },
      { female: 0, male: 0 },
    )
  }, [patients])

  return {
    reports: {
      sexDistribution: patientSexDistribution,
      ageDistribution: {
        "0-5": getAgeDistribution(patients)["0-5"],
        "6-12": getAgeDistribution(patients)["6-12"],
        "13-18": getAgeDistribution(patients)["13-18"],
        "19-30": getAgeDistribution(patients)["19-30"],
        "31-50": getAgeDistribution(patients)["31-50"],
        "51-65": getAgeDistribution(patients)["51-65"],
        "66-80": getAgeDistribution(patients)["66-80"],
        "81+": getAgeDistribution(patients)["81+"],
      },
      diagnosisDistribution: eventsWithDiagnoses.reduce((acc, diag) => {
        const diagKey = `${diag.desc} (${diag.code})`
        return {
          ...acc,
          [diagKey]: (acc[diagKey] || 0) + 1,
        }
      }, {}),
      totalPatients: patients.length,
    },
    isLoading: false,
  }
}

// Colors for the sexes in the report
const maleColor = "#1f77b4"
const femaleColor = "#ff7f0e"

interface ReportsScreenProps extends AppStackScreenProps<"Reports"> {}

export const ReportsScreen: FC<ReportsScreenProps> = observer(function ReportsScreen({}) {
  // const { someStore, anotherStore } = useStores()
  const [dates, updateDates] = useImmer({
    startDate: subDays(new Date(), 31),
    endDate: new Date(),
  })
  const { reports, isLoading } = useDBSimpleReports(dates.startDate, dates.endDate)

  return (
    <Screen style={$root} preset="scroll">
      <View>
        <Text size="lg">Sex Distribution</Text>
        <View pr={100}>
          <GroupedChartBar
            bars={[
              {
                label: "female",
                value: reports.sexDistribution.female,
                total: reports.totalPatients,
                color: femaleColor,
              },
              {
                label: "male",
                value: reports.sexDistribution.male,
                total: reports.totalPatients,
                color: maleColor,
              },
            ]}
          />
        </View>
      </View>

      <View pt={22}>
        <Text size="lg">Age Distribution</Text>
        <View pr={100}>
          <GroupedChartBar
            bars={[
              {
                label: "0-5",
                value: reports.ageDistribution["0-5"],
                total: reports.totalPatients,
                color: "#831843",
              },
              {
                label: "6-12",
                value: reports.ageDistribution["6-12"],
                total: reports.totalPatients,
                color: "#831843",
              },
              {
                label: "13-18",
                value: reports.ageDistribution["13-18"],
                total: reports.totalPatients,
                color: "#831843",
              },
              {
                label: "19-30",
                value: reports.ageDistribution["19-30"],
                total: reports.totalPatients,
                color: "#831843",
              },
              {
                label: "31-50",
                value: reports.ageDistribution["31-50"],
                total: reports.totalPatients,
                color: "#831843",
              },
              {
                label: "51-65",
                value: reports.ageDistribution["51-65"],
                total: reports.totalPatients,
                color: "#831843",
              },
              {
                label: "66-80",
                value: reports.ageDistribution["66-80"],
                total: reports.totalPatients,
                color: "#831843",
              },
              {
                label: "81+",
                value: reports.ageDistribution["81+"],
                total: reports.totalPatients,
                color: "#831843",
              },
            ]}
          />
        </View>
      </View>

      <View pt={22}>
        <Text size="lg">Diagnosis Distribution</Text>
        <View pr={100}>
          <GroupedChartBar
            bars={Object.keys(reports.diagnosisDistribution)
              .map((diag) => ({
                // for the label get the value inside the parenthesis
                label: diag.split("(")[1].split(")")[0],
                value: reports.diagnosisDistribution[diag],
                total: reports.totalPatients,
                color: "#831843",
              }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 5)}
          />
        </View>
      </View>
    </Screen>
  )
})

type ChartBarProps = {
  label: string
  value: number
  total: number
  color?: string
}

const GroupedChartBar = (props: { bars: ChartBarProps[] }) => {
  const total = props.bars.reduce((acc, curr) => acc + curr.value, 0)
  return (
    <View style={{ flexDirection: "column", paddingVertical: 2 }} gap={1}>
      {props.bars.map((bar) => (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View flex={3}>
            <Text size="xs">{bar.label}</Text>
          </View>
          <View flex={7}>
            <ChartBar {...bar} key={bar.label} total={total} />
          </View>
        </View>
      ))}
    </View>
  )
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
      <Text size="xs">({width})</Text>
    </View>
  )
}

/**
 * Given a set of patients return the count per age group
 * Age groups are defined as per DBSimpleReports["reports"]["ageDistribution"]
 * @param {PatientModel[]} patients
 * @returns {DBSimpleReports["reports"]["ageDistribution"]}
 */
function getAgeDistribution(
  patients: PatientModel[],
): DBSimpleReports["reports"]["ageDistribution"] {
  const currentYear = new Date().getFullYear()
  return patients.reduce(
    (acc, patient) => {
      // date of birth is stored as YYYY-MM-DD
      const birthYear = parseInt(patient.dateOfBirth?.split("-")?.[0])
      if (isNaN(birthYear)) {
        // skip this patient
        return acc
      }

      const age = currentYear - birthYear

      if (age <= 5) {
        acc["0-5"] += 1
      } else if (age <= 12) {
        acc["6-12"] += 1
      } else if (age <= 18) {
        acc["13-18"] += 1
      } else if (age <= 30) {
        acc["19-30"] += 1
      } else if (age <= 50) {
        acc["31-50"] += 1
      } else if (age <= 65) {
        acc["51-65"] += 1
      } else if (age <= 80) {
        acc["66-80"] += 1
      } else {
        acc["81+"] += 1
      }
      return acc
    },
    {
      "0-5": 0,
      "6-12": 0,
      "13-18": 0,
      "19-30": 0,
      "31-50": 0,
      "51-65": 0,
      "66-80": 0,
      "81+": 0,
    },
  )
}

const $root: ViewStyle = {
  flex: 1,
  padding: 12,
}
