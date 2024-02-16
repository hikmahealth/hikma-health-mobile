import React, { FC } from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle } from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { Button, Screen, Text, TextField, View } from "app/components"
// import { useNavigation } from "@react-navigation/native"
import { useStores } from "app/models"
import { useImmer } from "use-immer"

interface FeedbackScreenProps extends AppStackScreenProps<"Feedback"> {}

export const FeedbackScreen: FC<FeedbackScreenProps> = observer(function FeedbackScreen({
  navigation,
}) {
  const { provider } = useStores()

  const [feedbackObj, setFeedbackObj] = useImmer({
    name: provider.name,
    email: provider.email,
    feedback: "",
    phone: provider.phone,
    role: provider.role,
    clinic: provider.clinic,
    clinic_id: provider.clinic_id,
  })

  const onSubmit = () => {
    navigation.goBack()
  }

  return (
    <Screen style={$root} preset="scroll">
      <View gap={10}>
        <TextField
          label="Full Name"
          placeholder="John Doe"
          value={feedbackObj.name}
          onChangeText={(text) =>
            setFeedbackObj((draft) => {
              draft.name = text
            })
          }
        />

        <TextField
          label="Email"
          placeholder=""
          value={feedbackObj.email}
          onChangeText={(text) =>
            setFeedbackObj((draft) => {
              draft.email = text
            })
          }
        />

        <TextField
          label="Phone Number"
          placeholder=""
          keyboardType="phone-pad"
          value={feedbackObj.phone}
          onChangeText={(text) =>
            setFeedbackObj((draft) => {
              draft.phone = text
            })
          }
        />

        <TextField
          label="Feedback"
          placeholder=""
          value={feedbackObj.feedback}
          onChangeText={(text) =>
            setFeedbackObj((draft) => {
              draft.feedback = text
            })
          }
          multiline
        />

        <Button preset="filled" onPress={onSubmit} style={{ marginTop: 40 }}>
          Submit
        </Button>
      </View>
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
  padding: 12,
}
