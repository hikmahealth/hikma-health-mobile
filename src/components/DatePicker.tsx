import {format} from 'date-fns';
import React, {useState} from 'react';
import {
  useController,
  UseControllerProps,
  useFormContext,
} from 'react-hook-form';
import {Pressable, Text, ViewStyle} from 'react-native';
import DatePicker, {DatePickerProps} from 'react-native-date-picker';

type CustomDatePickerProps = DatePickerProps;

export const DatePickerButton = ({
  date,
  onDateChange,
  ...rest
}: CustomDatePickerProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        // style={[Style.datePicker, {justifyContent: 'center'}]}
        style={$datePicker}
        onPress={() => setOpen(open => !open)}>
        <Text>{format(date, 'do MMMM yyyy')}</Text>
      </Pressable>
      <DatePicker
        modal
        open={open}
        date={date}
        onConfirm={date => {
          setOpen(false);
          date && onDateChange?.(date);
        }}
        mode="date"
        onDateChange={onDateChange}
        onCancel={() => {
          setOpen(false);
        }}
        {...rest}
      />
    </>
  );
};

type ControlledDatePickerButtonProps = Omit<DatePickerProps, 'date'> &
  UseControllerProps;

export const ControlledDatePickerButton = (
  props: ControlledDatePickerButtonProps,
) => {
  const formContext = useFormContext();

  const {name, rules, defaultValue, ...inputProps} = props;

  const {field} = useController({name, rules, defaultValue});

  if (!formContext || !name) {
    const msg = !formContext
      ? 'TextInput must be wrapped by the FormProvider'
      : 'Name must be defined';
    console.error(msg);
  }
  const {formState} = formContext;

  return (
    <>
      <DatePickerButton
        date={field.value}
        onDateChange={field.onChange}
        {...inputProps}
      />
      {formState.errors[name] && <Text>This is required.</Text>}
    </>
  );
};

// TODO: Improve style of datepicker to match the surrounding sytles ... or extend paper styles to support the same styling API?

const $datePicker: ViewStyle = {
  // backgroundColor: '#FFFFFF',
  // margin: 10,
  marginTop: 10,
  paddingHorizontal: 10,
  paddingVertical: 12,
  // height: 40,
  borderRadius: 8,
  borderColor: '#333',
  borderWidth: 1,
  width: '100%',
  flex: 1,
  // elevation: 5,
  // shadowColor: '#000',
  // shadowOffset: {
  //   width: 0,
  //   height: 2,
  // },
  // shadowOpacity: 0.25,
  // shadowRadius: 3.84,
  justifyContent: 'center',
};
