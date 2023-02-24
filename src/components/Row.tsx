import {FC, FunctionComponent} from 'react';
import {View, ViewStyle} from 'react-native';

type Props = {
  children: React.ReactNode | React.ReactNode[];
};

export const Row: FC<Props> = props => {
  return <View style={$row}>{props.children}</View>;
};

const $row: ViewStyle = {
  display: 'flex',
  flex: 1,
  flexGrow: 1,
  width: '100%',
  flexDirection: 'row',
};
