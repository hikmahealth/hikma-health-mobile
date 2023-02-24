import {synchronize} from '@nozbe/watermelondb/sync';
import database from '.';
import {HIKMA_API} from '@env';
import {Alert} from 'react-native';

const SYNC_API = `${HIKMA_API}/api/v2/sync`;

export async function syncDB() {
  await synchronize({
    database,
    sendCreatedAsUpdated: false,
    pullChanges: async ({lastPulledAt, schemaVersion, migration}) => {
      const urlParams = `last_pulled_at=${lastPulledAt}&schema_version=${schemaVersion}&migration=${encodeURIComponent(
        JSON.stringify(migration),
      )}`;
      const response = await fetch(`${SYNC_API}?${urlParams}`);
      console.log({response});
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
      changes.events?.created.forEach(event => {
        event.created_at = new Date(event.created_at).getTime();
        event.updated_at = new Date(event.updated_at).getTime();
      });
      changes.events?.updated.forEach(event => {
        event.created_at = new Date(event.created_at).getTime();
        event.updated_at = new Date(event.updated_at).getTime();
      });

      // do the same for the visits
      changes.visits?.created.forEach(visit => {
        visit.created_at = new Date(visit.created_at).getTime();
        visit.updated_at = new Date(visit.updated_at).getTime();
      });
      changes.visits?.updated.forEach(visit => {
        visit.created_at = new Date(visit.created_at).getTime();
        visit.updated_at = new Date(visit.updated_at).getTime();
      });

      // do the same for the patients
      changes.patients?.created.forEach(patient => {
        patient.created_at = new Date(patient.created_at).getTime();
        patient.updated_at = new Date(patient.updated_at).getTime();
      });
      changes.visits?.updated.forEach(patient => {
        patient.created_at = new Date(patient.created_at).getTime();
        patient.updated_at = new Date(patient.updated_at).getTime();
      });

      // console.warn(changes.events);

      // Remove the last

      // const datedChanges = changes
      console.warn({changes, timestamp});
      return {changes, timestamp};
    },
    pushChanges: async ({changes, lastPulledAt}) => {
      // record timestamp at begining of push
      const timestamp = Date.now();
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
      Alert.alert('Good news, it took: ' + timeToPush);
      if (!response.ok) {
        throw new Error(await response.text());
      }
    },
    migrationsEnabledAtVersion: 1,
  });
}
