import {View} from 'react-native';
import {Text} from '../components/Text';
import {translate} from '../i18n';

export type MedicineMetadata = {
  doctor: string;
  medication: string;
  type: string;
  dosage: string;
  days: number;
};

type MedicineDisplayProps = {
  metadataObj: MedicineMetadata;
};

export const MedicineDisplay = (props: MedicineDisplayProps) => {
  const {metadataObj} = props;
  return (
    <View>
      <Text>
        {translate('provider')}: {metadataObj.doctor}{' '}
      </Text>
      <Text>
        {translate('medication')}: {metadataObj.medication}{' '}
      </Text>
      <Text>
        {translate('type')}: {metadataObj.type}
      </Text>
      <Text>
        {translate('dosage')}: {metadataObj.dosage}
      </Text>
      <Text>
        {translate('days')}: {metadataObj.days}
      </Text>
    </View>
  );
};
