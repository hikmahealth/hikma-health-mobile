import {StackActions, useNavigation} from '@react-navigation/native';
import {useEffect, useState} from 'react';
import {
  useColorScheme,
  Image,
  View,
  ImageStyle,
  ViewStyle,
  Alert,
} from 'react-native';
import {Button, TextInput} from 'react-native-paper';
import {Screen} from '../components/Screen';
import {Text} from '../components/Text';
import {translate} from '../i18n';
import {HIKMA_API} from '@env';
import {useProviderStore} from '../stores/provider';
import {useSyncStore} from '../stores/sync';
import {syncDB} from '../db/sync';
import {getClinic} from '../db/api';
import {primaryTheme} from '../styles/buttons';

export default function Login() {
  const navigation = useNavigation();
  const isDarkmode = useColorScheme() === 'dark';
  const setSyncStatus = useSyncStore(store => store.setSyncStatus);
  const [provider, setProvider, setClinic, clinic] = useProviderStore(state => [
    state.provider,
    state.setProvider,
    state.setClinic,
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState('admin@hikmahealth.org');
  const [password, setPassword] = useState('HikmaAdmin25!');

  const fetchAndSetClinic = async () => {
    const clinic = (await getClinic())[0];
    clinic && setClinic({id: clinic.id, name: clinic.name});
  };

  // if there is a provider, then navigate the user directly to PatientList page
  useEffect(() => {
    if (!clinic) {
      fetchAndSetClinic();
    }
    if (provider) {
      navigation.dispatch(
        StackActions.replace('PatientList', {
          userId: '###',
        }),
      );
    }
  }, [provider]);

  const signIn = async () => {
    setIsLoading(true);
    const response = await fetch(`${HIKMA_API}/api/login`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
    });
    const result = await response.json();

    // If there is an error message, then there is no user logged in
    if (result.message !== undefined) {
      setIsLoading(false);
      return Alert.alert(
        'Login Failed',
        'Please check your credentials and try again',
      );
    }

    setProvider(result);

    try {
      setSyncStatus(true);
      await syncDB();
      const clinic = (await getClinic())[0];
      clinic && setClinic({id: clinic.id, name: clinic.name});
    } catch (error) {
      setSyncStatus(false);
      setIsLoading(false);
      console.error('Sync failed', error);
      return;
    }

    setSyncStatus(false);
  };

  const launchIcon = isDarkmode
    ? require('./../assets/images/logo_no_text.png')
    : require('./../assets/images/launch_icon.jpg');

  return (
    <Screen preset="fixed">
      <View style={$brandingContainer}>
        <Image source={launchIcon} style={$launchIcon} resizeMode="contain" />
        <Text variant="titleLarge">HIKMA HEALTH</Text>
      </View>

      <View style={$formContainer}>
        <TextInput
          onChangeText={setEmail}
          value={email}
          label="Email Address"
          mode="outlined"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          label="Password"
          mode="outlined"
        />

        <Button
          loading={isLoading}
          disabled={isLoading}
          theme={primaryTheme}
          mode="contained"
          style={$authButton}
          onPress={signIn}>
          {translate('login.signIn')}
        </Button>
      </View>
    </Screen>
  );
}

const $authButton: ViewStyle = {
  marginTop: 10,
};

const $launchIcon: ImageStyle = {
  height: 120,
  width: 120,
};

const $brandingContainer: ViewStyle = {
  paddingTop: '35%',
  paddingBottom: '5%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
};

const $formContainer: ViewStyle = {
  rowGap: 10,
  paddingHorizontal: '10%',
  maxWidth: 1000,
};
