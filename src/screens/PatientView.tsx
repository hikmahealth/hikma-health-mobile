import { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack"
import { format } from "date-fns"
import { useCallback, useEffect, useState } from "react"
import { View, ViewStyle, FlatList, Pressable, Alert } from "react-native"
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import RNPrint from 'react-native-print';
import { Avatar, List, FAB } from "react-native-paper"
import { RootStackParamList } from "../../App"
import { PatientSummary } from "../components/PatientSummary"
import { Screen } from "../components/Screen"
import { Text } from "../components/Text"
import { ControlledTextField } from "../components/ControlledTextField"
import { ControlledRadioGroup } from "../components/ControlledRadioGroup"
import { Button } from "../components/Button"
import { createVisit, getLatestPatientEventByType } from "../db/api"
import { translate, TxKeyPath } from "../i18n"
import { Event, Patient } from "../types"
import { useProviderStore } from "../stores/provider"
import { displayName, displayNameAvatar } from "../utils/patient"
import { calculateAgeInYears } from "../utils/dateUtils"
import { primary } from "../styles/colors"
import { localeDate } from "../utils/formatDate"
import EventFormModel from "../db/model/EventForm"
import { useDatabase } from "@nozbe/watermelondb/hooks"
import { Q } from "@nozbe/watermelondb"
import VisitModel from "../db/model/Visit";
import EventModel from "../db/model/Event";
import { getEventDisplayPrint } from "../components/EventFormDisplay";

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
  // {
  //   labelTx: "patientFile.medicalHistory",
  //   route: "SnapshotList",
  //   descriptionTx: "patientFile.medicalHistoryDescription",
  //   iconName: "stethoscope",
  //   params: {
  //     patientId,
  //     eventType: "Medical History Full",
  //   },
  // },
  // {
  //   labelTx: "patientFile.complaint",
  //   route: "SnapshotList",
  //   descriptionTx: "patientFile.complaintDescription",
  //   iconName: "chat-question-outline",
  //   params: {
  //     patientId,
  //     eventType: "Complaint",
  //   },
  // },
  // {
  //   labelTx: "patientFile.examination",
  //   route: "SnapshotList",
  //   descriptionTx: "patientFile.examinationDescription",
  //   iconName: "test-tube",
  //   params: {
  //     patientId,
  //     eventType: "Examination",
  //   },
  // },
  // {
  //   labelTx: "patientFile.medicine",
  //   route: "SnapshotList",
  //   descriptionTx: "patientFile.medicineDescription",
  //   iconName: "pill",
  //   params: {
  //     patientId,
  //     eventType: "Medicine",
  //   },
  // },
]

export function PatientView(props: Props) {
  const { route, navigation } = props
  const { patient } = route.params
  const [clinic, provider] = useProviderStore((store) => [store.clinic, store.provider])
  const [snapshotForms, setSnapshotForms] = useState<EventFormModel[]>([])
  const database = useDatabase()

  useEffect(() => {
    database.get<EventFormModel>("event_forms")
      .query(
        Q.where("language", translate("languageCode")),
        Q.where("is_snapshot_form", true)
      ).fetch().then((forms) => {
        setSnapshotForms(forms)
      })

  }, [])



  const fetchPatientData = async (patientId: string, ignoreEmptyVisits: boolean): Promise<{ visit: VisitModel, events: EventModel[] }[]> => {
    const visits = await database
      .get<VisitModel>("visits")
      .query(Q.and(Q.where("patient_id", patientId), Q.where("is_deleted", false)))
      .fetch()

    const events = await database.get<EventModel>("events")
      .query(Q.and(Q.where("patient_id", patientId), Q.where("is_deleted", false)))
      .fetch()


    const results = visits.map(visit => {
      return {
        visit,
        events: events.filter(ev => ev.visitId === visit.id)
      }
    })

    if (ignoreEmptyVisits) {
      return results.filter(res => res.events.length > 0)
    }
    return results;
  }


  const downloadFile = async () => {
    let options = {
      html: '<h1>Patient Report</h1>',
      fileName: 'test',
      directory: 'Documents',
    };
    printHTML()

    // let file = await RNHTMLtoPDF.convert(options)
    // console.log(file.filePath);
    // Alert.alert(file.filePath);
  }


  async function printHTML() {
    fetchPatientData(patient.id, true).then(async (result) => {
      const visitsList = result.map(({ events, visit }) => {
        const eventRows = events.map(ev => {
          const evs = getEventDisplayPrint(ev);
          console.log(evs)
          return `
          <tr style="padding-bottom: 10px;">
            <td style="vertical-align: top;">${ev.eventType}</td>
            <td style="vertical-align: top;">${visit.providerName}</td>
            <td colspan={4}>${evs}</td>
          </tr>
              
            `
        }).join("")
        return `
            <div>
              ${format(visit.checkInTimestamp, "dd MMM yyyy")}
              <br />
              <table style="border-collapse: separate; border-spacing: 15px 15px;">
                <tr>
                  <th>Name</th>
                  <th>Provider</th>
                  <th colspan="4">Data</th>
                </tr>
          
                ${eventRows}
              </table>
            </div>
          `
      }).join("")
      // const visitsList_ = result.map(visit =>
      //   `${visit.providerName} \n
      //     ${translate("visitDate")}: ${format(visit.checkInTimestamp, "dd MMM yyyy")}`
      // )


      console.log(visitsList)
      await RNPrint.print({
        html: `
      <div>
        <h1>${patient.givenName} ${patient.surname}</h1>
        <h2>${translate("dob")}: ${localeDate(new Date(patient.dateOfBirth), "yyyy MMM dd", {})}</h2>
        <h2>${translate("sex")}: ${translate(patient.sex)}</h2>

      <br />
      <div>
        <h3>Visits</h3>
        
        ${visitsList}
      </div>
      </div>`
      })
    })
  }

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
      providerName: provider.name,
      patientId: patient.id,
      clinicId: clinic.id,
      isDeleted: false,
      metadata: {},
      checkInTimestamp: new Date().getTime(),
    })
      .then((res) => {
        navigation.navigate("NewVisit", {
          patientId: patient.id,
          patientAge: calculateAgeInYears(new Date(patient.dateOfBirth)),
          providerId: provider.id,
          visitId: res.id,
          visitDate: new Date().getTime()
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
      <Screen preset="scroll" style={$screen}>
        <PatientFileSummary patient={patient} goToEditPatient={goToEditPatient} downloadFile={downloadFile} />

        <FlatList
          data={links}
          contentContainerStyle={$linksContainer}
          renderItem={renderItem}
          keyExtractor={(item) => item.labelTx}
        />
        {
          snapshotForms.map(form => (
            <List.Item
              key={form.id}
              title={form.name}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate("SnapshotList", {
                patientId: patient.id, eventType: form.name
              })}
              description={form.description}
              left={(props) => <List.Icon {...props} icon={"form-select"} />}
            />
          ))
        }
      </Screen>
      <FAB icon="plus" color="white" label={translate("patientView.newVisit")} style={$fab} onPress={goToNewPatientVisit} />
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
  downloadFile,
}: {
  patient: Patient
  goToEditPatient: () => void
  downloadFile: () => void
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
            {translate("edit")}
          </Button>
        </View>
        <Text>{`${translate("dob")}: ${localeDate(new Date(patient.dateOfBirth), "yyyy MMM dd", {})}`}</Text>
        <Text>{`${translate("sex")}: ${translate(patient.sex)}`}</Text>
        <Text>{`${translate("camp")}: ${patient.camp || ""}`}</Text>
        <PatientSummary patientId={patient.id} />

        <Button icon="download" mode="text" onPress={downloadFile}>
          {`Download Patient History`}
        </Button>
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
  backgroundColor: primary,
  margin: 16,
  right: 4,
  bottom: 10,
}
