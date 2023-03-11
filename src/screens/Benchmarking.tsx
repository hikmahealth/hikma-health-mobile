import {useDatabase} from '@nozbe/watermelondb/hooks';
import {omit} from 'lodash';
import {useState} from 'react';
import {Alert, View, ViewStyle} from 'react-native';
import {TextInput} from 'react-native-paper';
import {Text} from '../components/Text';
import {Button} from '../components/Button';
import {Screen} from '../components/Screen';
import EventModel from '../db/model/Event';
import PatientModel from '../db/model/Patient';
import VisitModel from '../db/model/Visit';
import {useProviderStore} from '../stores/provider';
import {Patient} from '../types';
import {generateEvent} from '../utils/generators/events';
import {generatePatient} from '../utils/generators/patients';
import {generateVisit} from '../utils/generators/visits';

export function Benchmarking() {
  const database = useDatabase();
  const [patientsCount, setPatientsCount] = useState(2_500);
  const [eventsPerPatient, setEventsPerPatient] = useState(0);
  const [provider, clinic] = useProviderStore(store => [
    store.provider,
    store.clinic,
  ]);
  const [loading, setLoading] = useState(false);

  const deleteAllData = async () => {
    Alert.alert('Delete all data?', '', [
      {
        text: 'Cancel',
      },
      {
        text: 'Delete',
        onPress: async () => {
          setLoading(true);
          await database.write(async () => database.unsafeResetDatabase());
        },
      },
    ]);
  };

  const saveData = async () => {
    const patients = Array.from({length: patientsCount}, generatePatient).map(
      p => omit(p, ['id', 'createdAt', 'updatedAt']),
    ) as Patient[];
    console.log(provider, clinic);
    if (provider === null || clinic === null) {
      Alert.alert(
        'Error',
        'Please your account is not registered with any clinic',
      );
      setLoading(false);
      return;
    }
    const clinicId = clinic.id;
    const providerId = provider.id;
    const doctor = provider.name;

    console.warn('Starting the data save');

    // database.write(async () => {
    const batchPatientRegistrations = patients.map(patient => {
      //   const patient = patients[0];
      return database
        .get<PatientModel>('patients')
        .prepareCreate(newPatient => {
          newPatient.givenName = patient.givenName;
          newPatient.surname = patient.surname;
          newPatient.sex = patient.sex;
          newPatient.phone = patient.phone;
          newPatient.country = patient.country;
          newPatient.camp = patient.camp;
          newPatient.hometown = patient.hometown;
          newPatient.dateOfBirth = patient.dateOfBirth;
        });
    });

    let batchVisits =
      eventsPerPatient === 0
        ? []
        : batchPatientRegistrations.map(patient => {
            const visit = generateVisit(patient.id, providerId, clinicId);
            return database
              .get<VisitModel>('visits')
              .prepareCreate(newVisit => {
                newVisit.patientId = visit.patientId;
                newVisit.clinicId = visit.clinicId;
                newVisit.providerId = visit.providerId;
                newVisit.checkInTimestamp = visit.checkInTimestamp;
              });
          });

    let batchEvents = batchVisits.flatMap(visit => {
      const eventsList = Array.from({length: eventsPerPatient}, () =>
        generateEvent(visit.patientId, visit.id, doctor),
      );

      return eventsList.map(event => {
        return database.get<EventModel>('events').prepareCreate(newEvent => {
          newEvent.patientId = event.patientId;
          newEvent.visitId = event.visitId;
          newEvent.eventType = event.eventType;
          newEvent.eventMetadata = event.eventMetadata;
          newEvent.isDeleted = event.isDeleted;
        });
      });
    });

    const res = await database.write(
      async () =>
        await database.batch([
          ...batchPatientRegistrations,
          ...batchVisits,
          ...batchEvents,
        ]),
    );

    setLoading(false);
  };

  const submit = () => {
    // const data = generateBenchmarkingData(patientsCount, eventsPerPatient);

    Alert.alert(
      `${patientsCount} patients ready to save in the database. Proceed?`,
      '',
      [
        {
          text: 'Cancel',
        },
        {
          text: 'Proceed',
          onPress: () => {
            setLoading(true);
            setTimeout(saveData, 100);
          },
        },
      ],
    );

    // console.log(JSON.stringify(data, null, 2));
    // console.log(data.length, data[0].events.length);
  };
  return (
    <Screen preset="fixed">
      <View style={$formContainer}>
        <Text>{provider ? provider.name : ''}</Text>
        <Text>{clinic ? clinic.name : ''} </Text>
        <Text>
          Create {patientsCount.toLocaleString()} patients, each with{' '}
          {eventsPerPatient} events in their visits.
        </Text>

        <TextInput
          label="How many patients?"
          value={String(patientsCount)}
          onChangeText={t => setPatientsCount(+t)}
        />
        <TextInput
          label="How many events per patients (vistits with complaints, medications, etc..)?"
          value={String(eventsPerPatient)}
          onChangeText={t => setEventsPerPatient(+t)}
        />

        <Button loading={loading} onPress={submit} mode="contained">
          Generate
        </Button>

        {/* <Button onPress={deleteAllData} loading={loading} mode="text"> */}
        {/*   Delete All Data */}
        {/* </Button> */}
      </View>
    </Screen>
  );
}

const $formContainer: ViewStyle = {
  rowGap: 10,
  padding: 8,
};
