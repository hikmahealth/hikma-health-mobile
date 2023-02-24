import {View, Pressable, ViewStyle} from 'react-native';
import {useState} from 'react';
import {Text} from './Text';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type Props = {
  children: React.ReactNode;
  label: string;
};

export function Collapsible(props: Props) {
  const {children, label} = props;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View>
      <Pressable onPress={() => setIsOpen(!isOpen)} style={$collapsibleButton}>
        <Text variant="titleLarge">{label}</Text>

        <Icon size={34} name={isOpen ? 'chevron-up' : 'chevron-down'} />
      </Pressable>

      {isOpen && children}
    </View>
  );
}

const $collapsibleButton: ViewStyle = {
  flexDirection: 'row',
  justifyContent: 'space-between',
};
