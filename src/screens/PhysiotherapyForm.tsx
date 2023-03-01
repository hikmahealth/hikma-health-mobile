import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useEffect} from 'react';
import {useForm, SubmitHandler, FormProvider} from 'react-hook-form';
import {View, ViewStyle} from 'react-native';
import {
  Screen,
  Text,
  ControlledTextField,
  HorizontalRadioGroup,
  If,
  Button,
} from '../components';
import {createEvent, getLatestPatientEventByType} from '../db/api';
import {translate} from '../i18n';
import {PatientFlowParamList} from '../navigators/PatientFlowNavigator';
import {primaryTheme} from '../styles/buttons';

export type PhysiotherapyMetadata = {
  doctor: string;
  previousTreatment: boolean;
  previousTreatmentText: string;
  complaint: string;
  findings: string;
  treatmentPlan: string;
  treatmentSession: string;
  recommendations: string;
  referral: boolean;
  referralText: string;
};

type Props = NativeStackScreenProps<PatientFlowParamList, 'PhysiotherapyForm'>;

const yesNoOptions = [
  {label: translate('yes'), value: 'yes'},
  {
    label: translate('no'),
    value: 'no',
  },
];

const yesNoFromBoolean = (val: boolean): string => {
  return val ? 'yes' : 'no';
};

const booleanFromYesNo = (val: string): boolean => {
  return val === 'yes';
};

export const PhysiotherapyForm = (props: Props) => {
  const {navigation, route} = props;
  const {patientId, visitId} = route.params;

  const {...formMethods} = useForm<PhysiotherapyMetadata>({
    defaultValues: {},
  });

  useEffect(() => {
    // Load the most recent Physiotherapy event for this patient and visit
    getLatestPatientEventByType(patientId, 'Physiotherapy')
      .then(res => {
        if (res !== null && res !== '') {
          formMethods.reset(JSON.parse(res));
        }
      })
      .catch(error => {
        console.error(error);
      });
  }, []);

  const onSubmit: SubmitHandler<PhysiotherapyMetadata> = data => {
    createEvent({
      eventType: 'Physiotherapy',
      patientId: patientId,
      visitId: visitId,
      isDeleted: false,
      eventMetadata: JSON.stringify(data),
    })
      .then(res => {
        navigation.goBack();
        console.log(res);
      })
      .catch(error => console.error(error));
  };
  return (
    <Screen preset="scroll" style={$screen}>
      <View style={$formContainer}>
        <FormProvider {...formMethods}>
          <HorizontalRadioGroup
            options={yesNoOptions}
            value={yesNoFromBoolean(formMethods.watch('previousTreatment'))}
            onChange={(value: string) =>
              formMethods.setValue('previousTreatment', booleanFromYesNo(value))
            }
            label={translate('previousTreatment')}
          />

          <If condition={formMethods.watch('previousTreatment') === true}>
            <ControlledTextField label={''} name="previousTreatmentText" />
          </If>

          <ControlledTextField label={translate('findings')} name="findings" />

          <ControlledTextField
            label={translate('treatmentPlan')}
            name="treatmentPlan"
          />

          <ControlledTextField
            label={translate('treatmentSession')}
            name="treatmentSession"
          />

          <ControlledTextField
            label={translate('recommendations')}
            name="recommendations"
          />

          <HorizontalRadioGroup
            options={yesNoOptions}
            value={yesNoFromBoolean(formMethods.watch('referral'))}
            onChange={(value: string) =>
              formMethods.setValue('referral', booleanFromYesNo(value))
            }
            label={translate('referral')}
          />

          <If condition={formMethods.watch('referral') === true}>
            <ControlledTextField label={''} name="referralText" />
          </If>

          <Button
            theme={primaryTheme}
            mode="contained"
            onPress={formMethods.handleSubmit(onSubmit)}>
            {translate('save')}
          </Button>
        </FormProvider>
      </View>
    </Screen>
  );
};

type PhysiotherapyDisplayProps = {
  metadataObj: PhysiotherapyMetadata;
};

export const PhysiotherapyDisplay = (props: PhysiotherapyDisplayProps) => {
  const {metadataObj} = props;
  return (
    <View>
      <Text>
        {translate('provider')}: {metadataObj.doctor}{' '}
      </Text>
      <Text>
        {translate('previousTreatment')}:{' '}
        {metadataObj.referral ? translate('yes') : translate('no')}
        {metadataObj.referral && metadataObj.previousTreatmentText}
        {/* {formatTextDisplay( */}
        {/*   metadataObj.previousTreatment, */}
        {/*   metadataObj.previousTreatmentText, */}
        {/*   language, */}
        {/* )}{' '} */}
      </Text>
      <Text>
        {translate('complaint')}: {metadataObj.complaint}{' '}
      </Text>
      <Text>
        {translate('findings')}: {metadataObj.findings}
      </Text>
      <Text>
        {translate('treatmentPlan')}: {metadataObj.treatmentPlan}
      </Text>
      <Text>
        {translate('treatmentSession')}: {metadataObj.treatmentSession}
      </Text>
      <Text>
        {translate('recommendations')}: {metadataObj.recommendations}
      </Text>
      <Text>
        {translate('referral')}:{' '}
        {metadataObj.referral ? translate('yes') : translate('no')}
        {/* {metadataObj.referral && () } */}
        {/* {formatTextDisplay( */}
        {/*   metadataObj.referral, */}
        {/*   metadataObj.referralText, */}
        {/*   language, */}
        {/* )}{' '} */}
      </Text>
    </View>
  );
};

const $screen: ViewStyle = {};

const $formContainer: ViewStyle = {
  rowGap: 12,
  paddingTop: 20,
  paddingHorizontal: 20,
};
