import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useForm, SubmitHandler, FormProvider} from 'react-hook-form';
import {View, Alert, ViewStyle} from 'react-native';
import {Text} from '../components/Text';
import {Button} from '../components/Button';
import {Screen} from '../components/Screen';
import {ControlledTextField} from '../components/ControlledTextField';
import {createEvent} from '../db/api';
import {translate} from '../i18n';
import {PatientFlowParamList} from '../navigators/PatientFlowNavigator';
import {EventTypes, Event} from '../types/Event';

type Props = NativeStackScreenProps<PatientFlowParamList, 'OpenTextEvent'>;

type OpenTextEvent = {
  patientId: string;
  visitId: string;
  eventType: EventTypes;
  eventMetadata: string;
};

export function OpenTextEvent(props: Props) {
  const {route, navigation} = props;
  const {eventType, patientId, visitId} = route.params;

  const {...formMethods} = useForm<OpenTextEvent>({
    defaultValues: {
      eventType: 'Complaint',
      patientId: patientId,
      visitId: visitId,
    },
  });

  const onSubmit: SubmitHandler<OpenTextEvent> = data => {
    if (data.eventMetadata.length === 0) {
      return Alert.alert('Please fill in the full form.');
    }
    createEvent(data as unknown as Event)
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
            label={translate('enterTextHere')}
            multiline
            numberOfLines={8}
            name="eventMetadata"
          />

          <Button mode="contained" onPress={formMethods.handleSubmit(onSubmit)}>
            {translate('save')}
          </Button>
        </FormProvider>
      </View>
    </Screen>
  );
}

const $formContainer: ViewStyle = {
  rowGap: 10,
  paddingTop: 20,
};
