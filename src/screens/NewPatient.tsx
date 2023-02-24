import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, RadioButton} from 'react-native-paper';
import {Alert, View} from 'react-native';
import {SubmitHandler, useForm, FormProvider} from 'react-hook-form';
import {Screen} from '../components/Screen';
import {Text} from '../components/Text';
import {RootStackParamList} from '../../App';
import {format} from 'date-fns';
import {translate} from '../i18n';
import {ViewStyle} from 'react-native/types';
import {ControlledDatePickerButton} from '../components/DatePicker';
import Patient from '../db/model/Patient';
import {registerNewPatient, updatePatientWithId} from '../db/api';
import {ControlledTextField} from '../components';
import {primaryTheme} from '../styles/buttons';
import {primary} from '../styles/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'NewPatient'>;

const DEFAULT_DOB = (() => {
  // set year, month and date separately to support HERMES engine
  const d = new Date();
  d.setFullYear(1990);
  d.setMonth(0), d.setDate(1);
  return d;
})();

type NewPatientForm = Omit<Patient, 'dateOfBirth'> & {
  dateOfBirth: Date;
};

export default function NewPatientScreen(props: Props) {
  const {navigation, route} = props;
  const {patient: patientToEdit} = route.params;

  const {...formMethods} = useForm<NewPatientForm>({
    defaultValues: patientToEdit
      ? {...patientToEdit, dateOfBirth: new Date(patientToEdit.dateOfBirth)}
      : {
          id: '',
          givenName: '',
          surname: '',
          sex: 'male',
          camp: '',
          phone: '',
          country: '',
          hometown: '',
          dateOfBirth: DEFAULT_DOB,
        },
  });

  const onSubmit: SubmitHandler<NewPatientForm> = async data => {
    if (data.givenName.length === 0 || data.surname.length === 0) {
      return Alert.alert(
        'Empty name provided. Please fill in both the given name and surname',
      );
    }
    const patient = {
      ...data,
      dateOfBirth: format(data.dateOfBirth, 'yyyy-MM-dd'),
    };
    console.log({patient});

    try {
      let res: any;
      if (patientToEdit && patientToEdit.id) {
        // patient already exists, so update it
        res = await updatePatientWithId(patient.id, patient);
      } else {
        res = await registerNewPatient(patient);
      }

      console.log(res);
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'An error occurred while saving the patient');
    }
  };

  return (
    <Screen preset="scroll">
      <View style={$formContainer}>
        <FormProvider {...formMethods}>
          <ControlledTextField
            // style={{backgroundColor: 'rgba(0,0,0, 0.05)'}}
            mode="outlined"
            label={translate('firstName')}
            name="givenName"
          />

          <ControlledTextField
            // style={{backgroundColor: 'rgba(0,0,0, 0.05)'}}
            mode="outlined"
            label={translate('surname')}
            name="surname"
          />

          <ControlledTextField
            // style={{backgroundColor: 'rgba(0,0,0, 0.05)'}}
            mode="outlined"
            label={translate('phone')}
            name="phone"
          />

          <ControlledTextField
            // style={{backgroundColor: 'rgba(0,0,0, 0.05)'}}
            mode="outlined"
            label={translate('country')}
            name="country"
          />

          <ControlledTextField
            mode="outlined"
            // style={{backgroundColor: 'rgba(0,0,0, 0.05)'}}
            label={translate('hometown')}
            name="hometown"
          />

          <ControlledTextField
            mode="outlined"
            // style={{backgroundColor: 'rgba(0,0,0, 0.05)'}}
            label={translate('camp')}
            name="camp"
          />

          <View>
            <Text tx="dob" variant="labelLarge" />
            <ControlledDatePickerButton name="dateOfBirth" />
          </View>

          <View>
            <Text tx="sex" variant="labelLarge" />
            <RadioButton.Group
              onValueChange={val => formMethods.setValue('sex', val)}
              value={formMethods.watch('sex')}>
              <RadioButton.Item color={primary} label="Male" value="male" />
              <RadioButton.Item color={primary} label="Female" value="female" />
            </RadioButton.Group>
          </View>
          <Button
            mode="contained"
            onPress={formMethods.handleSubmit(onSubmit)}
            theme={primaryTheme}>
            {translate('save')}
          </Button>
        </FormProvider>
      </View>
    </Screen>
  );
}

const $formContainer: ViewStyle = {
  rowGap: 16,
  paddingTop: 20,
};
