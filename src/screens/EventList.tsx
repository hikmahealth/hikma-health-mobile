import {useDatabase} from '@nozbe/watermelondb/hooks';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useEffect, useState} from 'react';
import {FAB} from 'react-native-paper';
import {
  Alert,
  View,
  FlatList,
  ViewStyle,
  TouchableOpacity,
  ToastAndroid,
} from 'react-native';
import {RootStackParamList} from '../../App';
import {Text, Screen} from '../components';
import EventModel from '../db/model/Event';
import {translate} from '../i18n';
import {Event, EventTypes} from '../types';
import {Q} from '@nozbe/watermelondb';
import {getEventDisplay} from '../components/EventFormDisplay';
import {calculateAgeInYears} from '../utils/dateUtils';

type Props = NativeStackScreenProps<RootStackParamList, 'EventList'>;

export function EventList(props: Props) {
  const {navigation, route} = props;
  const {visit, providerId, clinicId, patient} = route.params;

  const [eventsList, setEventsList] = useState<Event[]>([]);

  const database = useDatabase();

  useEffect(() => {
    database
      .get<EventModel>('events')
      .query(Q.where('visit_id', visit.id))
      .fetch()
      .then(res => {
        setEventsList(res);
      })
      .catch(error => {
        setEventsList([]);
        Alert.alert('Error', 'Something went wrong. Please try again.');
      });
  }, []);

  const keyExtractor = (item, index) => index.toString();

  const goToNewPatientVisit = () => {
    // createVisit({
    //   providerId,
    //   patientId: patient.id,
    //   clinicId,
    //   checkInTimestamp: new Date().getTime(),
    // })
    //   .then(res => {
    navigation.navigate('NewVisit', {
      patientId: patient.id,
      patientAge: calculateAgeInYears(new Date(patient.dateOfBirth)),
      providerId,
      visitId: visit.id,
    });
    // console.log(res);
    // })
    // .catch(error => console.error(error));
  };

  const editEvent = (event: Event) => {
    // FIXME: Implement these screens
    ToastAndroid.show('Not implemented yet', ToastAndroid.SHORT);
    return;
    switch (event.eventType) {
      case 'Vitals':
        props.navigation.navigate('EditVitals', {event, userName});
        break;
      case 'Examination Full':
        props.navigation.navigate('EditExamination', {
          event,
          language,
          userName,
        });
        break;
      case 'Medicine':
        props.navigation.navigate('EditMedicine', {event, language, userName});
        break;
      case 'Medical History Full':
        props.navigation.navigate('EditMedicalHistory', {
          event,
          language,
          userName,
        });
        break;
      case 'Physiotherapy':
        props.navigation.navigate('EditPhysiotherapy', {
          event,
          userName,
        });
        break;
      case 'Complaint':
      case 'Dental Treatment':
      case 'Notes':
        props.navigation.navigate('EditOpenTextEvent', {event});
      default:
        break;
    }
  };

  const renderItem = ({item}: {item: Event}) => {
    const display = getEventDisplay(item);
    const time = new Date(item.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    return (
      <TouchableOpacity style={{}} onLongPress={() => editEvent(item)}>
        <View style={{}}>
          <View style={{margin: 10}}>
            <Text>{`${item.eventType}, ${time}`}</Text>
            <View
              style={{
                marginVertical: 5,
                borderBottomColor: 'black',
                borderBottomWidth: 1,
              }}
            />
            {display}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // console.warn(eventsList?.[0]?.patientId);
  // console.log({eventsList});
  // console.log(eventsList?.[0]);

  return (
    <>
      <Screen preset="fixed">
        <FlatList
          keyExtractor={keyExtractor}
          data={eventsList}
          renderItem={item => renderItem(item)}
        />
      </Screen>

      <FAB
        icon="plus"
        label={translate('newEntry')}
        style={$fab}
        onPress={goToNewPatientVisit}
      />
    </>
  );
}
const $fab: ViewStyle = {
  position: 'absolute',
  margin: 16,
  right: 4,
  bottom: 10,
};
