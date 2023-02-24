import {format} from 'date-fns';
import {upperFirst} from 'lodash';
import {useCallback} from 'react';
import {TouchableOpacity, View, ViewStyle} from 'react-native';
import {Avatar} from 'react-native-paper';
import {translate} from '../i18n';
import {primary} from '../styles/colors';
import {Patient} from '../types/Patient';
import {displayName, displayNameAvatar} from '../utils/patient';
import {Text} from './Text';

type PatientListItemProps = {
  patient: Patient;
  language: string;
  onPatientSelected: (patient: Patient) => void;
};

export function PatientListItem(props: PatientListItemProps) {
  const {patient, language, onPatientSelected} = props;

  // use callback function to call when the patient is pressed
  const handlePatientSelected = useCallback(() => {
    onPatientSelected(patient);
  }, [patient.id]);
  return (
    <TouchableOpacity
      style={$patientItemContainer}
      onPress={handlePatientSelected}>
      <View style={$cardContent}>
        <Avatar.Text
          style={{
            backgroundColor: primary,
          }}
          size={64}
          label={displayNameAvatar(patient)}
        />
        <View style={{marginLeft: '3%'}}>
          <Text variant="titleLarge">{displayName(patient)}</Text>
          <View
            style={{
              marginVertical: 2,
              height: 1,
              backgroundColor: '#eee',
            }}
          />
          <Text
            style={{
              flexWrap: 'wrap',
            }}>{`${translate('dob')}:  ${format(
            new Date(patient.dateOfBirth),
            'dd MMM yyyy',
          )}`}</Text>
          <Text>{`${translate('sex')}:  ${upperFirst(patient.sex)}`}</Text>
          <Text>{`${translate('camp')}:  ${patient.camp}`}</Text>
          <Text>{patient.createdAt.toDateString()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const $cardContent: ViewStyle = {
  flex: 1,
  marginHorizontal: 10,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'flex-start',
};

const $patientItemContainer: ViewStyle = {
  flex: 1,
  height: 100,
  width: '100%',
};
