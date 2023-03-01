import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {FormProvider, SubmitHandler, useForm} from 'react-hook-form';
import {View, ViewStyle} from 'react-native';
import {
  Screen,
  ControlledTextField,
  ControlledRadioGroup,
  Text,
  Button,
} from '../components';
import {Examination, Event} from '../types';
import {translate} from '../i18n';
import {createEvent} from '../db/api';
import {PatientFlowParamList} from '../navigators/PatientFlowNavigator';

type Props = NativeStackScreenProps<PatientFlowParamList, 'ExaminationForm'>;

export function ExaminationForm(props: Props) {
  const {route, navigation} = props;
  const {patientId, visitId, providerId} = route.params;
  const {...formMethods} = useForm<Examination>({
    defaultValues: {
      doctor: 'Dr. Doctor',
      examination: '',
      generalObservations: '',
      diagnosis: '',
      treatment: '',
      covid19: false,
      referral: false,
      referralText: '',
    },
  });

  const onSubmit: SubmitHandler<Examination> = data => {
    console.log({data});
    // @ts-ignore
    createEvent({
      patientId: patientId,
      visitId,
      eventType: 'Examination',
      eventMetadata: JSON.stringify({
        ...data,
        // The radio options work with string versions of the booleans so we are convertin into appropriate format
        covid19: JSON.parse(data.covid19 as unknown as string),
        referral: JSON.parse(data.referral as unknown as string),
      }),
    } as unknown as Event)
      .then(res => {
        navigation.goBack();
        console.log(res);
      })
      .catch(error => console.error(error));
  };

  return (
    <Screen preset="scroll">
      <View style={$formContainer}>
        <FormProvider {...formMethods}>
          <ControlledTextField
            label={translate('examination')}
            name="examination"
          />
          <ControlledTextField
            label={translate('generalObservations')}
            name="generalObservations"
          />
          <ControlledTextField
            label={translate('diagnosis')}
            name="diagnosis"
          />
          <ControlledTextField
            label={translate('treatment')}
            name="treatment"
          />
          <ControlledRadioGroup
            label={translate('covid19')}
            name="covid19"
            options={[
              {
                label: translate('yes'),
                value: 'true',
              },
              {
                label: translate('no'),
                value: 'false',
              },
            ]}
          />
          <ControlledRadioGroup
            label={translate('referral')}
            name="referral"
            options={[
              {
                label: translate('yes'),
                value: 'true',
              },
              {
                label: translate('no'),
                value: 'false',
              },
            ]}
          />
          {eval(formMethods.watch('referral') as unknown as string) && (
            <ControlledTextField
              multiline
              numberOfLines={5}
              label={''}
              name="referralText"
            />
          )}
          <Button mode="contained" onPress={formMethods.handleSubmit(onSubmit)}>
            {translate('save')}
          </Button>
        </FormProvider>
      </View>
    </Screen>
  );
}

type ExaminationDisplayProps = {
  metadataObj: Examination;
};

export const ExaminationDisplay = (props: ExaminationDisplayProps) => {
  const {metadataObj} = props;
  return (
    <View>
      <Text>
        {translate('provider')}: {metadataObj.doctor}{' '}
      </Text>
      <Text>
        {translate('examination')}: {metadataObj.examination}{' '}
      </Text>
      <Text>
        {translate('generalObservations')}: {metadataObj.generalObservations}
      </Text>
      <Text>
        {translate('diagnosis')}: {metadataObj.diagnosis}
      </Text>
      <Text>
        {translate('treatment')}: {metadataObj.treatment}
      </Text>
      <Text>
        {translate('covid19')}:{' '}
        {metadataObj.referral ? translate('yes') : translate('no')}
      </Text>
      <Text>
        {translate('referral')}:{' '}
        {metadataObj.referral ? translate('yes') : translate('no')}
      </Text>
      <Text>{metadataObj.referralText}</Text>
    </View>
  );
};

const $formContainer: ViewStyle = {
  rowGap: 10,
  paddingTop: 20,
};
