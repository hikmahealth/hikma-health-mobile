import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useMemo, useState} from 'react';
import {View, ViewStyle} from 'react-native';
import {MapOrEntries, useMap} from 'usehooks-ts';
import {Divider} from 'react-native-paper';
import {Text} from '../components/Text';
import {Button} from '../components/Button';
import {Screen} from '../components/Screen';
import {ControlledTextField} from '../components/ControlledTextField';
import {HorizontalRadioGroup} from '../components/HorizontalRadioGroup';
import {If} from '../components/If';
import {translate, TxKeyPath} from '../i18n';
import {Collapsible} from '../components/Collapsible';
import {subDays} from 'date-fns';
import {DatePickerButton} from '../components/DatePicker';
import {createEvent} from '../db/api';
import {primaryTheme} from '../styles/buttons';
import {PatientFlowParamList} from '../navigators/PatientFlowNavigator';

type Props = NativeStackScreenProps<PatientFlowParamList, 'Covid19Form'>;
// const emergencyResult = () => {
//   return chestPain || confusion || bluish;
// };

// const testAndIsolate = () => {
//   return (
//     fever ||
//     dryCough ||
//     diffBreathing ||
//     soreThroat ||
//     exposureKnown ||
//     travel ||
//     diabetes ||
//     cardioDisease ||
//     pulmonaryDisease ||
//     renalDisease ||
//     malignancy ||
//     pregnant ||
//     immunocompromised
//   );
// };

export type Covid19FormMetadata = {
  fever: boolean;
  dryCough: boolean;
  diffBreathing: boolean;
  soreThroat: boolean;
  nausea: boolean;
  symptomsDate: boolean;
  chestPain: boolean;
  confusion: boolean;
  bluish: boolean;
  fatigue: boolean;
  aches: boolean;
  headache: boolean;
  age: number;
  diabetes: boolean;
  changeTasteSmell: boolean;
  cardioDisease: boolean;
  pulmonaryDisease: boolean;
  renalDisease: boolean;
  malignancy: boolean;
  pregnant: boolean;
  immunocompromised: boolean;
  exposureKnown: boolean;
  travel: boolean;
  travelDeparture: boolean;
  travelReturn: boolean;
  seekCare: boolean;
  testAndIsolate: boolean;
};

const symptomQuestionItems = [
  // Write the options that were used to render the above commented out jsx
  'chestPain',
  'confusion',
  'bluish',
  'fever',
  'dryCough',
  'diffBreathing',
  'soreThroat',
  'nausea',
  'fatigue',
  'aches',
  'headache',
  'changeTasteSmell',
];

const riskFactorQuestionItems = [
  'diabetes',
  'cardioDisease',
  'pulmonaryDisease',
  'renalDisease',
  'malignancy',
  'pregnant',
  'immunocompromised',
  'exposureKnown',
  'travel',
];

const yesNoOptions = [
  {label: translate('yes'), value: 'yes'},
  {
    label: translate('no'),
    value: 'no',
  },
];

const symptomValues: MapOrEntries<string, boolean> = symptomQuestionItems.map(
  sy => [sy, false],
);
const riskFactorValues: MapOrEntries<string, boolean> =
  riskFactorQuestionItems.map(rf => [rf, false]);

export function Covid19Form(props: Props) {
  const {navigation, route} = props;
  const {patientId, patientAge, visitId} = route.params;
  const [syMap, syActions] = useMap<string, boolean>(symptomValues);
  const [rfMap, rfActions] = useMap<string, boolean>(riskFactorValues);
  const [firstSymptomOnsetDate, setFirstSymptomOnsetDate] = useState(
    subDays(new Date(), 5),
  );
  const [travelDeparture, setTravelDeparture] = useState(
    subDays(new Date(), 21),
  );
  const [travelReturn, setTravelReturn] = useState(subDays(new Date(), 14));

  const emergencyResult = useMemo(() => {
    // if the patient has chestPain, confusion or is bluish
    return (
      syMap.get('chestPain') || syMap.get('confusion') || syMap.get('bluish')
    );
  }, [syMap.get('chestPain'), syMap.get('confusion'), syMap.get('bluish')]);

  const testAndIsolate = useMemo(() => {
    const dangerSigns = [
      'dryCough',
      'diffBreathing',
      'soreThroat',
      'exposureKnown',
      'travel',
      'diabetes',
      'cardioDisease',
      'renalDisease',
      'malignancy',
      'pregnant',
      'immunocompromised',
    ];
    return dangerSigns.some(
      symptom => syMap.get(symptom) || rfMap.get(symptom),
    );
  }, []);

  const submit = () => {
    createEvent({
      patientId,
      visitId,
      isDeleted: false,
      eventType: 'COVID-19 Screening',
      eventMetadata: JSON.stringify({
        ...Object.fromEntries(syMap),
        ...Object.fromEntries(rfMap),
        age: patientAge,
        seekCare: emergencyResult,
        testAndIsolate: testAndIsolate,
      }),
    })
      .then(res => {
        navigation.goBack();
      })
      .catch(error => {
        console.warn(error);
      });
  };

  return (
    <Screen preset="scroll" style={$screen}>
      <View style={{rowGap: 16}}>
        {symptomQuestionItems.map((symptom, index) => (
          <HorizontalRadioGroup
            key={symptom}
            options={yesNoOptions}
            value={syMap.get(symptom) === true ? 'yes' : 'no'}
            label={translate(symptom as TxKeyPath)}
            onChange={val => {
              console.log(val, symptom);
              syActions.set(symptom, val === 'yes' ? true : false);
            }}
          />
        ))}

        <View>
          <Text variant="labelLarge">{translate('symptomsDate')}</Text>
          <DatePickerButton
            date={firstSymptomOnsetDate}
            onDateChange={setFirstSymptomOnsetDate}
          />
        </View>

        <Divider style={$sectionDivider} />
        <Collapsible label={translate('riskFactors')}>
          <View style={{rowGap: 16}}>
            {riskFactorQuestionItems.map((symptom, index) => (
              <HorizontalRadioGroup
                key={symptom}
                options={yesNoOptions}
                value={rfMap.get(symptom) === true ? 'yes' : 'no'}
                label={translate(symptom as TxKeyPath)}
                onChange={val =>
                  rfActions.set(symptom, val === 'yes' ? true : false)
                }
              />
            ))}
          </View>

          <If condition={rfMap.get('travel') === true}>
            <View style={{flexDirection: 'row', columnGap: 10, paddingTop: 32}}>
              <View style={{flex: 1}}>
                <Text variant="labelLarge">{translate('symptomsDate')}</Text>
                <DatePickerButton
                  date={travelDeparture}
                  onDateChange={setTravelDeparture}
                />
              </View>

              <View style={{flex: 1}}>
                <Text variant="labelLarge">{translate('symptomsDate')}</Text>
                <DatePickerButton
                  date={travelReturn}
                  onDateChange={setTravelReturn}
                />
              </View>
            </View>
          </If>
        </Collapsible>
        <Divider style={$sectionDivider} />

        <Button mode="contained" onPress={submit}>
          {translate('save')}
        </Button>
      </View>
    </Screen>
  );
}

type Covid19DisplayProps = {
  metadataObj: Covid19FormMetadata;
};

export const Covid19Display = (props: Covid19DisplayProps) => {
  const {metadataObj} = props;
  return (
    <View>
      <Text style={{fontWeight: 'bold'}}>
        {metadataObj.seekCare && translate('seekCare')}
        {metadataObj.testAndIsolate && translate('testIsolate')}
        {!metadataObj.testAndIsolate &&
          !metadataObj.testAndIsolate &&
          translate('noAction')}
      </Text>
      {!!metadataObj.fever ? (
        <Text>
          {translate('fever')}: {translate('yes')}
        </Text>
      ) : null}
      {!!metadataObj.dryCough ? (
        <Text>
          {translate('dryCough')}: {translate('yes')}
        </Text>
      ) : null}
      {!!metadataObj.diffBreathing ? (
        <Text>
          {translate('diffBreathing')}: {translate('yes')}
        </Text>
      ) : null}
      {!!metadataObj.soreThroat ? (
        <Text>
          {translate('soreThroat')}: {translate('yes')}
        </Text>
      ) : null}
      {!!metadataObj.nausea ? (
        <Text>
          {translate('nausea')}: {translate('yes')}
        </Text>
      ) : null}
      {!!metadataObj.symptomsDate ? (
        <Text>
          {translate('symptomsDate')}: {translate('yes')}
        </Text>
      ) : null}
      {!!metadataObj.chestPain ? (
        <Text>
          {translate('chestPain')}: {translate('yes')}
        </Text>
      ) : null}
      {!!metadataObj.confusion ? (
        <Text>
          {translate('confusion')}: {translate('yes')}
        </Text>
      ) : null}
      {!!metadataObj.bluish ? (
        <Text>
          {translate('bluish')}: {translate('yes')}
        </Text>
      ) : null}
      {!!metadataObj.fatigue ? (
        <Text>
          {translate('fatigue')}: {translate('yes')}
        </Text>
      ) : null}
      {!!metadataObj.aches ? (
        <Text>
          {translate('aches')}: {translate('yes')}
        </Text>
      ) : null}
      {!!metadataObj.headache ? (
        <Text>
          {translate('headache')}: {translate('yes')}
        </Text>
      ) : null}
      {!!metadataObj.changeTasteSmell ? (
        <Text>
          {translate('changeTasteSmell')}: {translate('yes')}
        </Text>
      ) : null}
      {!!metadataObj.diabetes ? (
        <Text>
          {translate('diabetes')}: {translate('yes')}
        </Text>
      ) : null}
      {!!metadataObj.cardioDisease ? (
        <Text>
          {translate('cardioDisease')}: {translate('yes')}
        </Text>
      ) : null}
      {!!metadataObj.pulmonaryDisease ? (
        <Text>
          {translate('pulmonaryDisease')}: {translate('yes')}
        </Text>
      ) : null}
      {!!metadataObj.renalDisease ? (
        <Text>
          {translate('renalDisease')}: {translate('yes')}
        </Text>
      ) : null}
      {!!metadataObj.malignancy ? (
        <Text>
          {translate('malignancy')}: {translate('yes')}
        </Text>
      ) : null}
      {!!metadataObj.pregnant ? (
        <Text>
          {translate('pregnant')}: {translate('yes')}
        </Text>
      ) : null}
      {!!metadataObj.immunocompromised ? (
        <Text>
          {translate('immunocompromised')}: {translate('yes')}
        </Text>
      ) : null}
      {!!metadataObj.exposureKnown ? (
        <Text>
          {translate('exposureKnown')}: {translate('yes')}
        </Text>
      ) : null}
      {!!metadataObj.travel ? (
        <Text>
          {translate('travel')}: {/* {metadataObj.travel , language)} */}
        </Text>
      ) : null}
    </View>
  );
};

const $screen: ViewStyle = {
  paddingHorizontal: 20,
  marginVertical: 20,
};

const $sectionDivider: ViewStyle = {
  marginVertical: 20,
};
