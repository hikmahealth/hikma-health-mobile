import React from "react";
import { fireEvent, render, screen } from '@testing-library/react-native';
import { RootStackParamList } from '../../App';
import {
  NavigationContainer
} from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import NewPatientScreen from '../../src/screens/NewPatient';


const Stack = createNativeStackNavigator<RootStackParamList>()

describe("NewPatient form", () => {
  it("Should render without crashing 💨", () => {
    render(
      <NavigationContainer>
        <Stack.Screen
          options={{
            title: "Privacy Policy"
          }}
          name="NewPatient"
          component={NewPatientScreen}
        />

      </NavigationContainer>
    )
  })
})
