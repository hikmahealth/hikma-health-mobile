import { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack"
import { format } from "date-fns"
import { useCallback, useEffect, useState } from "react"
import { View, ViewStyle, FlatList } from "react-native"
import { Avatar, List, FAB } from "react-native-paper"
import { RootStackParamList } from "../../App"
import { PatientSummary } from "../components/PatientSummary"
import {Screen} from "../components/Screen"
import {Text} from "../components/Text"
import {ControlledTextField} from "../components/ControlledTextField"
import {ControlledRadioGroup} from "../components/ControlledRadioGroup"
import {Button} from "../components/Button"
import { createVisit, getLatestPatientEventByType } from "../db/api"
import { translate, TxKeyPath } from "../i18n"
import { Event, Patient } from "../types"
import { useProviderStore } from "../stores/provider"
import { displayName, displayNameAvatar } from "../utils/patient"
import { calculateAgeInYears } from "../utils/dateUtils"
import { primary } from "../styles/colors"

type Props = NativeStackScreenProps<RootStackParamList, "PatientView">

type PatientLink = {
  labelTx: TxKeyPath
  route: keyof RootStackParamList
  descriptionTx: TxKeyPath
  iconName: string
  params: Partial<RootStackParamList[keyof RootStackParamList]>
}

const patientLinks = (patientId: string, patient: Patient, visitId: string): PatientLink[] => [
  {
    labelTx: "patientFile.visitHistory",
    route: "VisitList",
    descriptionTx: "patientFile.visitHistoryDescription",
    iconName: "hospital-building",
    params: {
      patientId,
      patient,
    },
  },
  {
    labelTx: "patientFile.medicalHistory",
    route: "SnapshotList",
    descriptionTx: "patientFile.medicalHistoryDescription",
    iconName: "stethoscope",
    params: {
      patientId,
      eventType: "Medical History Full",
    },
  },
  {
    labelTx: "patientFile.complaint",
    route: "SnapshotList",
    descriptionTx: "patientFile.complaintDescription",
    iconName: "chat-question-outline",
    params: {
      patientId,
      eventType: "Complaint",
    },
  },
  {
    labelTx: "patientFile.examination",
    route: "SnapshotList",
    descriptionTx: "patientFile.examinationDescription",
    iconName: "test-tube",
    params: {
      patientId,
      eventType: "Examination",
    },
  },
  {
    labelTx: "patientFile.medicine",
    route: "SnapshotList",
    descriptionTx: "patientFile.medicineDescription",
    iconName: "pill",
    params: {
      patientId,
      eventType: "Medicine",
    },
  },
]

export function PatientView(props: Props) {
  const { route, navigation } = props
  const { patient } = route.params
  const [clinic, provider] = useProviderStore((store) => [store.clinic, store.provider])

  const goToEditPatient = () => {
    navigation.navigate("NewPatient", { patient })
  }
  const goToNewPatientVisit = () => {
    if (!provider || !patient || !clinic) {
      // TODO: Handle error
      return
    }
    createVisit({
      providerId: provider.id,
      patientId: patient.id,
      clinicId: clinic.id,
      isDeleted: false,
      checkInTimestamp: new Date().getTime(),
    })
      .then((res) => {
        navigation.navigate("NewVisit", {
          patientId: patient.id,
          patientAge: calculateAgeInYears(new Date(patient.dateOfBirth)),
          providerId: provider.id,
          visitId: res.id,
        })
        console.log(res)
      })
      .catch((error) => console.error(error))
  }

  let links = patientLinks(patient.id, patient, "")

  const renderItem = useCallback(
    ({ item }: { item: PatientLink }) => <LinkItem link={item} navigation={navigation} />,
    [],
  )

  return (
    <>
      <Screen preset="fixed" style={$screen}>
        <PatientFileSummary patient={patient} goToEditPatient={goToEditPatient} />

        <FlatList
          data={links}
          contentContainerStyle={$linksContainer}
          renderItem={renderItem}
          keyExtractor={(item) => item.labelTx}
        />
      </Screen>
      <FAB icon="plus" label={translate("newVisit")} style={$fab} onPress={goToNewPatientVisit} />
    </>
  )
}

const LinkItem = ({
  link,
  navigation,
}: {
  link: PatientLink
  navigation: NativeStackNavigationProp<any>
}) => {
  return (
    <List.Item
      key={link.labelTx}
      title={translate(link.labelTx)}
      right={(props) => <List.Icon {...props} icon="chevron-right" />}
      onPress={() => navigation.navigate(link.route, link.params)}
      description={translate(link.descriptionTx)}
      left={(props) => <List.Icon {...props} icon={link.iconName} />}
    />
  )
}

const PatientFileSummary = ({
  patient,
  goToEditPatient,
}: {
  patient: Patient
  goToEditPatient: () => void
}) => {
  return (
    <View style={$summaryContainer}>
      <View style={$avatarContainer}>
        <Avatar.Text
          style={{ backgroundColor: primary }}
          size={96}
          label={displayNameAvatar(patient)}
        />
      </View>
      <View style={$summaryTextContainer}>
        <View style={$nameRow}>
          <Text variant="titleLarge">{displayName(patient)}</Text>
          <Button icon="pencil" mode="text" onPress={goToEditPatient}>
            Edit
          </Button>
        </View>
      <Text>{`${translate("dob")}:  ${format(new Date(patient.dateOfBirth), "yyyy MMM dd")}`}</Text>
      <Text>{`${translate("sex")}:  ${translate(patient.sex)}`}</Text>
        <Text>{`${translate("camp")}:  ${patient.camp || ""}`}</Text>
        <PatientSummary patientId={patient.id} />
      </View>
    </View>
  )
}

const $avatarContainer: ViewStyle = {
  // flex: 1,
}

const $summaryTextContainer: ViewStyle = {
  flex: 4,
}

const $nameRow: ViewStyle = {
  display: "flex",
  // flex: 1,
  // flexGrow: 1,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  // width: '100%',
}

const $summaryContainer: ViewStyle = {
  display: "flex",
  flexDirection: "row",
  columnGap: 14,
}

const $screen: ViewStyle = {
  padding: 24,
}

const $linksContainer: ViewStyle = {
  paddingTop: 32,
  rowGap: 8,
}

const $fab: ViewStyle = {
  position: "absolute",
  margin: 16,
  right: 4,
  bottom: 10,
}
