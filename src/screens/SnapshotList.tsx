import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {View, ViewStyle, TouchableOpacity, FlatList} from 'react-native';
import {RootStackParamList} from '../../App';
import {Text} from '../components/Text';
import {Screen} from '../components/Screen';
import {useEffect, useState} from 'react';
import {getAllPatientEventsByType} from '../db/api';
import {getEventDisplay} from '../components/EventFormDisplay';
import {Event} from '../types';
import {parseMetadata} from '../utils/parsers';
import {Divider} from 'react-native-paper';

type Props = NativeStackScreenProps<RootStackParamList, 'SnapshotList'>;

export function SnapshotList(props: Props) {
  const {route, navigation} = props;
  const {patientId, eventType, events = []} = route.params;

  const [list, setList] = useState<Event[]>(events);

  const fetchEventData = async () => {
    const res = await getAllPatientEventsByType(patientId, eventType);
    setList(res);
  };

  useEffect(() => {
    setTimeout(() => {
      fetchEventData();
    }, 100);
  }, [patientId]);

  const renderItem = ({item}: {item: Event}) => {
    const {eventType, eventMetadata} = item;
    const {doctor} = parseMetadata<{doctor: string}>(eventMetadata) || {
      doctor: '',
    };
    const display = getEventDisplay(item);

    const time = new Date(item.updatedAt).toLocaleString([], {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    return (
      <TouchableOpacity
        style={$card}
        // onLongPress={() => editEvent(item)}
      >
        <View style={$cardContent}>
          <View style={{margin: 10}}>
            <Text>{`${eventType}, ${
              !!doctor ? doctor + ',' : ''
            } ${time} `}</Text>
            <Divider style={$eventTypeDivider} />
            {/* <View */}
            {/*   style={{ */}
            {/*     marginVertical: 5, */}
            {/*     borderBottomColor: 'black', */}
            {/*     borderBottomWidth: 1, */}
            {/*   }} */}
            {/* /> */}
            {display}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const keyExtractor = (item: Event) => item.id;

  return (
    <Screen preset="fixed" style={$screen}>
      <FlatList
        keyExtractor={keyExtractor}
        data={list}
        renderItem={item => renderItem(item)}
      />
    </Screen>
  );
}

const $screen: ViewStyle = {};

const $eventTypeDivider: ViewStyle = {
  marginVertical: 8,
};

const $card: ViewStyle = {
  margin: 10,
  padding: 10,
  // height: 'auto',
  // shadowColor: '#000',
  // shadowOffset: {
  //   width: 0,
  //   height: 2,
  // },
  // shadowOpacity: 0.25,
  // shadowRadius: 3.84,
  // elevation: 5,
  borderColor: '#EAEAEA',
  borderWidth: 0.5,
  borderRadius: 12,
  // backgroundColor: '#FFFFFF',
};

const $cardContent: ViewStyle = {
  flex: 1,
  marginHorizontal: 10,
  flexDirection: 'row',
  // textAlign: 'center',
  alignItems: 'center',
  justifyContent: 'flex-start',
};
