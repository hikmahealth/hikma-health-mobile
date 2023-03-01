import {Button as RNPButton, ButtonProps} from 'react-native-paper';
import {primaryTheme} from '../styles/buttons';

export function Button(props: ButtonProps) {
  return <RNPButton {...props} theme={primaryTheme} />;
}
