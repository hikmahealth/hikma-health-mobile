import { TextStyle } from 'react-native';
import { TextInput as RNTextInput, TextInputProps as RNTextInputProps } from 'react-native-paper';
import { useLanguageStore } from '../stores/language';
import { primaryTheme } from '../styles/buttons';
import { i18n, isRTL } from '../i18n';

export function TextInput(props) {
  const { style, ...otherProps } = props;
    const language = useLanguageStore((state) => state.language);
    const isRTL = language === 'ar';
    const $styles = [style, isRTL ? rtlInput : ltrInput];

    return <RNTextInput testID="TextInput" {...otherProps} direction="rtl" style={$styles}  theme={primaryTheme} />;
}


// Left-to-right text input styles
const ltrInput: TextStyle = {
    textAlign: 'left',
}

// Right-to-left text input styles
const rtlInput: TextStyle = {
    transform: [{ scaleX: -1 }],
    writingDirection: 'rtl',
}

export type TextInputProps = RNTextInputProps;
