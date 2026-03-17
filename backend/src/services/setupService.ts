import { database } from '../db/database';
import { SetupStatus } from '../shared/types/generalSetup';

let cachedSetup: SetupStatus | null = null;

export const loadSetup = async (): Promise<SetupStatus> => {
  if (!cachedSetup) {
    const setup = await database.loadSetup<SetupStatus>();
    if (!setup) {
      throw new Error("Setup not found");
    }
    cachedSetup = setup;
  }
  return cachedSetup;
};

export const refreshSetup = async (): Promise<SetupStatus> => {
  const setup = await database.loadSetup<SetupStatus>();
  if (!setup) {
    throw new Error("Setup not found");
  }
  cachedSetup = setup;
  return cachedSetup;
};

export const getSetup = (): SetupStatus => {
  if (!cachedSetup) {
    throw new Error("Setup not loaded yet");
  }
  return cachedSetup;
};