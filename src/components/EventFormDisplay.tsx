import {View} from 'react-native';
import {
  PhysiotherapyDisplay,
  PhysiotherapyMetadata,
} from '../screens/PhysiotherapyForm';
import {
  MedicalHistoryDisplay,
  MedicalHistoryMetadata,
} from '../screens/MedicalHistoryForm';
import {MedicineDisplay, MedicineMetadata} from '../screens/Medicine';
import {ExaminationDisplay} from '../screens/Examination';
import {VitalsDisplay} from '../screens/VisitList';
import {Covid19Display, Covid19FormMetadata} from '../screens/Covid19Form';
import {Text} from './Text';
import {Event, Examination} from '../types';
import {translate} from '../i18n';
import {parseMetadata} from '../utils/parsers';
import {VitalsMetadata} from '../screens/VitalsForm';

type Props = {};

// export function EventFormDisplay (props: Props) {
//   // const {eventType}
//
//     const time = new Date(item.createdAt).toLocaleTimeString([], {
//       hour: '2-digit',
//       minute: '2-digit',
//       hour12: true,
//     });

//     return (
//       <TouchableOpacity style={{}} onLongPress={() => editEvent(item)}>
//         <View style={{}}>
//           <View style={{margin: 10}}>
//             <Text>{`${eventTypeText}, ${time}`}</Text>
//             <View
//               style={{
//                 marginVertical: 5,
//                 borderBottomColor: 'black',
//                 borderBottomWidth: 1,
//               }}
//             />
//             {display}
//           </View>
//         </View>
//       </TouchableOpacity>
//     );

//   return (
//   <View>
//       <Text>
//         Lorem ipsum dolor sit amet, officia excepteur ex fugiat reprehenderit enim labore culpa sint ad nisi Lorem pariatur mollit ex esse exercitation amet. Nisi anim cupidatat excepteur officia. Reprehenderit nostrud nostrud ipsum Lorem est aliquip amet voluptate voluptate dolor minim nulla est proident. Nostrud officia pariatur ut officia. Sit irure elit esse ea nulla sunt ex occaecat reprehenderit commodo officia dolor Lorem duis laboris cupidatat officia voluptate. Culpa proident adipisicing id nulla nisi laboris ex in Lorem sunt duis officia eiusmod. Aliqua reprehenderit commodo ex non excepteur duis sunt velit enim. Voluptate laboris sint cupidatat ullamco ut ea consectetur et est culpa et culpa duis.
//       </Text>
//   </View>
//   )
// }

export function getEventDisplay(event: Event) {
  let display;

  switch (event.eventType) {
    case 'COVID-19 Screening':
      display = (
        <Covid19Display
          metadataObj={parseMetadata<Covid19FormMetadata>(event.eventMetadata)}
        />
      );
      break;
    case 'Vitals':
      display = (
        <VitalsDisplay
          metadataObj={parseMetadata<VitalsMetadata>(event.eventMetadata)}
        />
      );
      break;
    case 'Examination Full':
    case 'Examination':
      display = (
        <ExaminationDisplay
          metadataObj={parseMetadata<Examination>(event.eventMetadata)}
        />
      );
      break;
    case 'Medicine':
      <MedicineDisplay
        metadataObj={parseMetadata<MedicineMetadata>(event.eventMetadata)}
      />;
      break;
    case 'Medical History Full':
      display = (
        <MedicalHistoryDisplay
          metadataObj={parseMetadata<MedicalHistoryMetadata>(
            event.eventMetadata,
          )}
        />
      );
      break;
    case 'Physiotherapy':
      display = (
        <PhysiotherapyDisplay
          metadataObj={parseMetadata<PhysiotherapyMetadata>(
            event.eventMetadata,
          )}
        />
      );
      break;
    default:
      display = <Text>{parseMetadata<string>(event.eventMetadata) || ''}</Text>;
      break;
  }

  return display;
}
