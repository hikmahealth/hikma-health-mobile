import React from 'react';
import {Picker} from '@react-native-picker/picker';
import {i18n} from '../i18n';
import {useColorScheme} from 'react-native';

const LanguageToggle = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const style = isDarkMode
    ? {
        color: '#fff',
      }
    : {
        color: '#000',
      };
  const language = i18n.locale;
  const setLanguage = (value: string) => {
    if (value === 'en-US') {
      // return i18n.defaultLocale
    }
    i18n.locale = value;
  };

  return (
    <Picker
      selectedValue={language}
      onValueChange={setLanguage}
      itemStyle={{
        color: 'red',
        backgroundColor: 'blue',
      }}
      style={[{minWidth: 100}, style]}>
      <Picker.Item value="en-US" label="En" />
      <Picker.Item value="es" label="Es" />
      <Picker.Item value="ar" label="عربي" />
    </Picker>
  );
};

export default LanguageToggle;
