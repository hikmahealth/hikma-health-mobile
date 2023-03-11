import {
  hasUnsyncedChanges,
  SyncDatabaseChangeSet,
  synchronize,
} from '@nozbe/watermelondb/sync';
import database from '.';

import Config from 'react-native-config';
// import {HIKMA_API} from '@env';
import {Alert} from 'react-native';
import {interpret} from 'xstate';
import {syncMachine} from '../components/state_machines/sync';

// const env = process.env;
// const HIKMA_API = env.HIKMA_API;

const SYNC_API = `${Config.HIKMA_API}/api/v2/sync`;

const syncServiceT = interpret(syncMachine);

export async function syncDB(
  syncService: typeof syncServiceT,
  hasLocalChangesToPush: boolean,
) {
  await synchronize({
    database,
    sendCreatedAsUpdated: false,
    pullChanges: async ({lastPulledAt, schemaVersion, migration}) => {
      // const hasRecordsToUpload = await hasUnsyncedChanges({database});
      // console.warn({hasRecordsToUpload});
      const urlParams = `last_pulled_at=${lastPulledAt}&schema_version=${schemaVersion}&migration=${encodeURIComponent(
        JSON.stringify(migration),
      )}`;
      syncService.send('FETCH');
      const response = await fetch(`${SYNC_API}?${urlParams}`);
      if (!response.ok) {
        throw new Error(await response.text());
      }

      // changes: {
      //   events: {
      //     created: [{id: "", created_at: "", updatedAt: ""}],
      //     updated: [],
      //     deleted: []
      //   }
      // }

      const {changes, timestamp} = await response.json();
      // loop through the changes object and for every event convert the string date into a js Date object
      changes.events?.created.forEach((event: any) => {
        event.created_at = new Date(event.created_at).getTime();
        event.updated_at = new Date(event.updated_at).getTime();
      });
      changes.events?.updated.forEach((event: any) => {
        event.created_at = new Date(event.created_at).getTime();
        event.updated_at = new Date(event.updated_at).getTime();
      });

      // do the same for the visits
      changes.visits?.created.forEach((visit: any) => {
        visit.created_at = new Date(visit.created_at).getTime();
        visit.updated_at = new Date(visit.updated_at).getTime();
      });
      changes.visits?.updated.forEach((visit: any) => {
        visit.created_at = new Date(visit.created_at).getTime();
        visit.updated_at = new Date(visit.updated_at).getTime();
      });

      // do the same for the patients
      changes.patients?.created.forEach((patient: any) => {
        patient.created_at = new Date(patient.created_at).getTime();
        patient.updated_at = new Date(patient.updated_at).getTime();
      });
      changes.visits?.updated.forEach((patient: any) => {
        patient.created_at = new Date(patient.created_at).getTime();
        patient.updated_at = new Date(patient.updated_at).getTime();
      });

      const newRecordsToChange = countRecordsInChanges(changes);
      syncService.send({
        type: 'RESOLVE_CONFLICTS',
        downloadedRecords: newRecordsToChange,
      });
      // syncService.send({
      //   type: 'downloaded records loaded',
      //   downloadedRecords: newRecordsToChange.length,
      // });
      // syncService.send('COMPLETED');

      if (!hasLocalChangesToPush) {
        setTimeout(
          () =>
            syncService.send({
              type: 'COMPLETED',
              downloadedRecords: newRecordsToChange,
            }),
          2_500,
        );
      }

      // console.warn(changes.events);

      // Remove the last

      // const datedChanges = changes
      // console.warn({changes, timestamp});
      return {changes, timestamp};
    },
    pushChanges: async ({changes, lastPulledAt}) => {
      // record timestamp at begining of push
      const timestamp = Date.now();
      syncService.send({
        type: 'UPLOAD',
        uploadedRecords: countRecordsInChanges(changes),
      });
      const response = await fetch(
        `${SYNC_API}?last_pulled_at=${lastPulledAt}`,
        {
          method: 'POST',
          body: JSON.stringify(changes),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      // calculate how long it took to push
      const timeToPush = (Date.now() - timestamp) / 1000;
      syncService.send({type: 'COMPLETED'});
      if (!response.ok) {
        throw new Error(await response.text());
      }
    },
    migrationsEnabledAtVersion: 1,
  });
}

const countRecordsInChanges = (changes: SyncDatabaseChangeSet) =>
  Object.values(changes)
    .flatMap(b => Object.values(b))
    .flat().length;
