import { database } from '../db/database';
import { GeneralSetupType } from '../shared/types/generalSetup';

let cachedSetup: GeneralSetupType | null = null;

export const loadSetup = async () => {
  if (!cachedSetup) {
    const setup = await database.loadSetup();
    if (!setup) {
      throw new Error("Setup not found");
    }
    cachedSetup = setup;
  }
  return cachedSetup;
};

export const refreshSetup = async () => {
  const setup = await database.loadSetup();
  if (!setup) {
    throw new Error("Setup not found");
  }
  cachedSetup = setup;
  return cachedSetup;
};

export const getSetup = () => {
  if (!cachedSetup) {
    throw new Error("Setup not loaded yet");
  }
  return cachedSetup;
};