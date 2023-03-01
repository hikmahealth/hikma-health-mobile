import {createContext, ReactNode, useContext} from 'react';
import {createActorContext} from '@xstate/react';
import {
  Modal,
  Portal,
  Button,
  Provider,
  ActivityIndicator,
  MD3Colors,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {Text} from './';
import {translate} from '../i18n';
import {TextStyle, View, ViewStyle} from 'react-native';
import {useSyncStore} from '../stores/sync';
import {useMachine, useInterpret, useActor} from '@xstate/react';
import {syncMachine} from './state_machines/sync';
import {State} from 'xstate';

type SyncModalProps = {
  children: React.ReactNode;
};

// export const GlobalStateContext = createContext({});

export const GlobalServiceContext = createContext({});

export const GlobalServicesContextProvider = ({children}: {children: any}) => {
  const syncService = useInterpret(syncMachine);

  return (
    <GlobalServiceContext.Provider value={{syncService}}>
      {children}
    </GlobalServiceContext.Provider>
  );
};

export const SyncModal = ({children}: SyncModalProps) => {
  // const syncingInProgress = useSyncStore(store => store.syncing);

  const globalServices = useContext(GlobalServiceContext);
  const [state, send] = useActor(globalServices.syncService);

  // const next = () => {
  //   if (state.matches('idle')) {
  //     send('FETCH');
  //   } else if (state.matches('fetch')) {
  //     send('RESOLVE_CONFLICTS');
  //   } else if (state.matches('resolveConflicts')) {
  //     send('UPLOAD');
  //   } else {
  //     send('IDLE');
  //   }
  // };

  const modalContentContainerDisplay: ViewStyle = state.matches('idle')
    ? {display: 'none', height: 0}
    : {display: 'flex'};

  return (
    <Provider>
      <Portal>
        <View
          style={[
            $modalContentContainer,
            // {display: !state.matches('idle') ? 'flex' : 'none'},
            modalContentContainerDisplay,
          ]}>
          <Modal
            visible={!state.matches('idle')}
            // onDismiss={hideModal}
            // dismissable={false}
            contentContainerStyle={containerStyle}>
            <View style={$header}>
              <ActivityIndicator animating={true} color={MD3Colors.primary40} />

              <Text variant="titleLarge" style={$text}>
                Sync in Progress
              </Text>
            </View>

            {state.matches('fetch') && (
              <View style={$statusContainer}>
                <IconedText
                  iconName="download"
                  label="Fetching data from server"
                />
              </View>
            )}

            {state.matches('resolveConflicts') && (
              <View style={$statusContainer}>
                <IconedText
                  iconName="download"
                  label="Fetching data from server"
                />
                <IconedText
                  iconName="check"
                  iconColor="green"
                  indent
                  label={`Downloaded ${state.context.downloadedRecords} new records`}
                />
                <IconedText
                  iconName="source-merge"
                  label="Resolving Conflicts"
                />
              </View>
            )}

            {state.matches('upload') && (
              <View style={$statusContainer}>
                <IconedText
                  iconName="download"
                  label="Fetching data from server"
                />
                <IconedText
                  iconName="check"
                  iconColor="green"
                  indent
                  label={`Downloaded ${state.context.downloadedRecords} new records`}
                />
                <IconedText
                  iconName="source-merge"
                  label="Resolving Conflicts"
                />
                <IconedText
                  iconName="upload"
                  label={`Uploading ${state.context.uploadedRecords} local data to server`}
                />
              </View>
            )}

            {state.matches('idle') && (
              <View style={$statusContainer}>
                <Text style={$centerText}>No Sync in progress.</Text>
              </View>
            )}

            {/* <View style={{height: 20}} /> */}
            {/* <Button onPress={next}>Next</Button> */}
          </Modal>
        </View>
      </Portal>
      {children}
    </Provider>
  );
};

const IconedText = (props: {
  iconName: string;
  label: string;
  iconColor?: string;
  indent?: boolean;
}) => {
  return (
    <View style={[$iconedTextContainer, {paddingLeft: props.indent ? 20 : 0}]}>
      <Icon
        name={props.iconName}
        size={20}
        color={props.iconColor ?? 'black'}
      />
      <Text>{props.label}</Text>
    </View>
  );
};

const matchStateToMultiple = (states: string[], machine: State<any>) => {
  return states.some(state => machine.matches(state));
};
const $iconedTextContainer: ViewStyle = {
  flexDirection: 'row',
  columnGap: 10,
};

const $modalContentContainer: ViewStyle = {
  flex: 1,
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
  // height: '30%',
  width: '80%',
  backgroundColor: 'white',
  padding: 20,
  // marginHorizontal: '20%',
};

const $text: TextStyle = {
  textAlign: 'center',
};

const $header: ViewStyle = {
  flexDirection: 'row',
  columnGap: 10,
};

const $centerText: TextStyle = {
  textAlign: 'center',
};

const $statusContainer: ViewStyle = {
  rowGap: 4,
  paddingVertical: 6,
};
