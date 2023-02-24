import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {List} from 'react-native-paper';
import {View, ViewStyle} from 'react-native';
import {RootStackParamList, VisitScreensProps} from '../../App';
import {Text, Screen} from '../components';
import {translate, TxKeyPath} from '../i18n';
import {useProviderStore} from '../stores/provider';

type Props = NativeStackScreenProps<RootStackParamList, 'NewVisit'>;

// medicalHistory, complaint, vitals, examination, medicineDispensed, physiotherapy, dentalTreatment, notes, covid19Screening

const patientVisitLinks = (
  visitId: string,
  patientId: string,
  providerId: string,
  patientAge: number,
): {
  labelTx: TxKeyPath;
  route: keyof RootStackParamList;
  descriptionTx: TxKeyPath;
  iconName: string;
  params: VisitScreensProps | (VisitScreensProps & {patientAge: number});
}[] => [
  {
    labelTx: 'newVisitScreen.medicalHistory',
    route: 'MedicalHistoryForm',
    descriptionTx: 'patientFile.medicalHistoryDescription',
    iconName: 'hospital-building',
    params: {
      eventType: 'Medical History Full',
      visitId,
      patientId,
      providerId,
    },
  },
  {
    labelTx: 'newVisitScreen.complaint',
    route: 'OpenTextEvent',
    descriptionTx: 'newVisitScreen.complaintDescription',
    iconName: 'stethoscope',
    params: {
      eventType: 'Medical History Full',
      visitId,
      patientId,
      providerId,
    },
  },
  {
    labelTx: 'newVisitScreen.vitals',
    route: 'VitalsForm',
    descriptionTx: 'newVisitScreen.vitalsDescription',
    iconName: 'eye-outline',
    params: {
      visitId,
      patientId,
      providerId,
    },
  },
  {
    labelTx: 'newVisitScreen.examination',
    route: 'ExaminationForm',
    descriptionTx: 'newVisitScreen.examinationDescription',
    iconName: 'test-tube',
    params: {
      visitId,
      patientId,
      providerId,
    },
  },
  {
    labelTx: 'newVisitScreen.medicineDispensed',
    route: 'MedicineForm',
    descriptionTx: 'newVisitScreen.medicineDispensedDescription',
    iconName: 'pill',
    params: {
      visitId,
      patientId,
      providerId,
    },
  },
  {
    labelTx: 'newVisitScreen.physiotherapy',
    route: 'PhysiotherapyForm',
    descriptionTx: 'newVisitScreen.physiotherapyDescription',
    iconName: 'arm-flex-outline',
    params: {
      visitId,
      patientId,
      providerId,
    },
  },
  {
    labelTx: 'newVisitScreen.dentalTreatment',
    route: 'OpenTextEvent',
    descriptionTx: 'newVisitScreen.dentalTreatmentDescription',
    iconName: 'tooth-outline',
    params: {
      eventType: 'Dental Treatment',
      visitId,
      patientId,
      providerId,
    },
  },
  {
    labelTx: 'newVisitScreen.notes',
    route: 'OpenTextEvent',
    descriptionTx: 'newVisitScreen.notesDescription',
    iconName: 'file-document-edit-outline',
    params: {
      eventType: 'Notes',
      visitId,
      patientId,
      providerId,
    },
  },
  {
    labelTx: 'newVisitScreen.covid19Screening',
    route: 'Covid19Form',
    descriptionTx: 'newVisitScreen.covid19ScreeningDescription',
    iconName: 'virus',
    params: {
      visitId,
      patientId,
      patientAge,
      providerId,
    },
  },
];

export function NewVisit(props: Props) {
  const {navigation, route} = props;
  const {patientId, visitId, patientAge} = route.params;
  const provider = useProviderStore(store => store.provider);

  const providerId = provider?.id;

  const goToScreen =
    (route: keyof RootStackParamList, params: VisitScreensProps) => () =>
      navigation.navigate(route, params);

  // TODO: handle provider not found
  if (!providerId) return <Text>Provider not found</Text>;

  const links = patientVisitLinks(visitId, patientId, providerId, patientAge);

  return (
    <Screen preset="scroll" style={$screen}>
      <View style={$linksContainer}>
        {links.map(link => (
          <List.Item
            key={link.labelTx}
            title={translate(link.labelTx)}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={goToScreen(link.route, link.params)}
            description={translate(link.descriptionTx)}
            left={props => <List.Icon {...props} icon={link.iconName} />}
          />
        ))}
      </View>
    </Screen>
  );
}

const $screen: ViewStyle = {
  paddingHorizontal: 24,
};

const $linksContainer: ViewStyle = {
  paddingTop: 32,
  rowGap: 8,
};
