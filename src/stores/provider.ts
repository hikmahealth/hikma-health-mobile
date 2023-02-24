import {create} from 'zustand';
import {User} from '../types/User';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Clinic} from '../types/Clinic';

type ProviderState = {
  provider: User | null;
  clinic: Clinic | null;
  setProvider: (provider: User | null) => void;
  setClinic: (clinic: Clinic | null) => void;
};

export const useProviderStore = create<ProviderState>()(
  persist(
    (set, get) => ({
      provider: null,
      clinic: null,
      setProvider: (provider: User | null = null) =>
        set(state => ({...state, provider})),
      setClinic: (clinic: Clinic | null = null) =>
        set(state => ({...state, clinic})),
    }),
    {
      name: 'provider-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
