import {View} from 'react-native';
import {Text} from '../components';
import {translate} from '../i18n';

export type PhysiotherapyMetadata = {
  doctor: string;
  previousTreatment: string;
  previousTreatmentText: string;
  complaint: string;
  findings: string;
  treatmentPlan: string;
  treatmentSession: string;
  recommendations: string;
  referral: boolean;
  referralText: string;
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
