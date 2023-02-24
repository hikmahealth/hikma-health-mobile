import {create} from 'zustand';

type SyncState = {
  syncing: boolean;
  setSyncStatus: (status: boolean) => void;
};

export const useSyncStore = create<SyncState>()(set => ({
  syncing: false,
  setSyncStatus: status => set(state => ({syncing: status})),
}));
