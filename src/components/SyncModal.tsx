import * as React from 'react';
import {
  Modal,
  Portal,
  Button,
  Provider,
  ActivityIndicator,
  MD3Colors,
} from 'react-native-paper';
import {Text} from './';
import {translate} from '../i18n';
import {TextStyle, View, ViewStyle} from 'react-native';
import {useSyncStore} from '../stores/sync';

type SyncModalProps = {
  children: React.ReactNode;
};

export const SyncModal = ({children}: SyncModalProps) => {
  const [visible, setVisible] = React.useState(false);
  const syncingInProgress = useSyncStore(store => store.syncing);

  // const showModal = () => setVisible(true);
  // const hideModal = () => setVisible(false);

  return (
    <Provider>
      <Portal>
        <View
          style={[
            $modalContentContainer,
            {display: syncingInProgress ? 'flex' : 'none'},
          ]}>
          <Modal
            visible={syncingInProgress}
            // onDismiss={hideModal}
            // dismissable={false}
            contentContainerStyle={containerStyle}>
            <Text variant="titleLarge" style={$text}>
              Sync in Progress
            </Text>
            <View style={{height: 20}} />
            <ActivityIndicator animating={true} color={MD3Colors.primary40} />
          </Modal>
        </View>
      </Portal>
      {children}
    </Provider>
  );
};

const $modalContentContainer: ViewStyle = {
  flex: 1,
  // padding: 20,
  // width: '80%',
  justifyContent: 'center',
  alignItems: 'center',
  display: 'flex',
  alignContent: 'center',
  paddingHorizontal: 200,
};

const containerStyle: ViewStyle = {
  // display: 'flex',
  alignSelf: 'center',
  height: '30%',
  width: '80%',
  backgroundColor: 'white',
  // marginHorizontal: '20%',
};

const $text: TextStyle = {
  textAlign: 'center',
};
