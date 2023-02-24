import {Screen} from '../components/Screen';
import {Text} from '../components/Text';
import {FAB, Searchbar} from 'react-native-paper';
import {
  FlatList,
  Platform,
  StyleSheet,
  useColorScheme,
  View,
  ViewStyle,
} from 'react-native';
import {translate} from '../i18n';
import {useCallback, useEffect, useState} from 'react';
import {PatientListItem} from '../components/PatientListItem';
import {generatePatient, generatePatients} from '../utils/generators/patients';
import {Patient} from '../types/Patient';
import {useNavigation} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useDatabase} from '@nozbe/watermelondb/hooks';
import {RootStackParamList} from '../../App';
import PatientModel from '../db/model/Patient';
import {Q} from '@nozbe/watermelondb';
import {FlashList} from '@shopify/flash-list';
import ClinicModel from '../db/model/Clinic';
import EventModel from '../db/model/Event';
import {sortBy} from 'lodash';
import {primary} from '../styles/colors';
// import database from '../db';

type Props = NativeStackScreenProps<RootStackParamList, 'PatientList'>;

// const patients = generatePatients(50);
const RESULTS_PER_PAGE = 20;
const INITIAL_RESULTS_PER_PAGE = 60;

const ITEM_HEIGHT = 100;

export default function PatientList(props: Props) {
  const {navigation} = props;
  const [searchQuery, onChangeSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPatientsCount, setTotalPatientsCount] = useState(0);
  const [patients, setPatients] = useState<Patient[]>([]);
  // TODO: replace with real language
  const language = 'en';

  const database = useDatabase();

  const openPatientFile = useCallback((patient: Patient) => {
    return navigation.navigate('PatientView', {
      patient: {
        id: patient.id,
        sex: patient.sex,
        camp: patient.camp,
        phone: patient.phone,
        country: patient.country,
        surname: patient.surname,
        hometown: patient.hometown,
        givenName: patient.givenName,
        dateOfBirth: patient.dateOfBirth,
        createdAt: new Date(patient.createdAt).getTime(),
        updatedAt: new Date(patient.updatedAt).getTime(),
      },
    });
  }, []);

  const goToNewPatient = useCallback(() => {
    navigation.navigate('NewPatient', {patient: undefined});
  }, []);

  useEffect(() => {
    const patientsSubscribe = database
      .get<PatientModel>('patients')
      .query(
        // Q.skip(RESULTS_PER_PAGE * currentPage),
        Q.sortBy('updated_at', Q.desc),
        Q.take(INITIAL_RESULTS_PER_PAGE + RESULTS_PER_PAGE * currentPage),
      )
      .observe()
      .subscribe((patients: PatientModel[]) => {
        console.warn('sub');
        setPatients(patients as unknown as Patient[]);
      });

    // database.get<EventModel>('events').query().fetch().then(console.log);
    return () => {
      patientsSubscribe.unsubscribe();
    };
  }, [currentPage]);

  const searchWithQuery = useCallback((query: string) => {
    if (query.length > 0) {
      setIsSearching(true);
      database
        .get<PatientModel>('patients')
        .query(
          // Q.skip(RESULTS_PER_PAGE * currentPage),
          Q.where('given_name', Q.like(`${Q.sanitizeLikeString(query)}%`)),
          Q.sortBy('created_at', Q.desc),
          Q.take(50),
        )
        .fetch()
        .then((patients: PatientModel[]) => {
          // console.warn('sub');
          setPatients(patients as unknown as Patient[]);
        });
    } else {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const sub = database
      .get<PatientModel>('patients')
      .query()
      .observeCount()
      .subscribe(res => setTotalPatientsCount(res));

    return () => {
      sub.unsubscribe();
    };
  }, []);

  const getNextPagePatients = () => {
    console.log('fetch more patients');
    if (searchQuery.length > 0) {
      return;
    }
    setCurrentPage(currentPage => currentPage + 1);
    // TODO: fetch more patients
  };

  const renderItem = useCallback(
    ({item}: {item: Patient}) => (
      <PatientListItem
        patient={item}
        key={item.id}
        onPatientSelected={openPatientFile}
        language={language}
      />
    ),
    [],
  );

  return (
    <>
      <Screen preset="auto">
        {/* <FlatList */}
        <FlashList
          // renderItem={({item}) => <Text>{item.title}</Text>}
          onRefresh={getNextPagePatients}
          refreshing={false}
          // initialNumToRender={10}
          // windowSize={10}
          ItemSeparatorComponent={() => <View style={$separator} />}
          ListHeaderComponent={
            <HeaderSearch
              submitSearch={searchWithQuery}
              totalPatientsCount={totalPatientsCount}
            />
          }
          // keyExtractor={item => item.id}
          data={patients}
          estimatedItemSize={100}
          // initialNumToRender={10}
          // onEndReached={getNextPagePatients}
          // renderItem={renderItem}
          renderItem={({item}: {item: Patient}) => (
            <PatientListItem
              patient={item}
              // key={item.id}
              onPatientSelected={openPatientFile}
              language={language}
            />
          )}
        />
      </Screen>
      <FAB
        icon="plus"
        color="white"
        label={translate('newPatient')}
        style={$fab}
        onPress={goToNewPatient}
      />
    </>
  );
}
const HeaderSearch = ({submitSearch, totalPatientsCount}) => {
  const [searchQuery, onChangeSearchQuery] = useState('');
  const theme = useColorScheme();

  const isDark = theme === 'dark';
  return (
    <View
      style={[
        $searchBarContainer,
        {backgroundColor: isDark ? 'transparent' : '#fff'},
      ]}>
      <Searchbar
        placeholder={translate('patientSearch')}
        onChangeText={onChangeSearchQuery}
        clearButtonMode="always"
        clearIcon={'close'}
        onIconPress={() => submitSearch(searchQuery)}
        value={searchQuery}
      />
      <Text>{totalPatientsCount.toLocaleString()} Patients</Text>
    </View>
  );
};

const $fab: ViewStyle = {
  position: 'absolute',
  backgroundColor: primary,
  margin: 16,
  right: 4,
  bottom: 10,
};

const $searchBarContainer: ViewStyle = {
  backgroundColor: 'white',
  padding: 10,
};

const $separator: ViewStyle = {
  height: 1,
  backgroundColor: '#ECECEC',
  marginVertical: 24,
};
