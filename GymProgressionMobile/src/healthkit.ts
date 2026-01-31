import { NativeModules, Platform } from 'react-native';

type HealthKitModuleType = {
  requestAuthorization: () => Promise<boolean>;
  syncHealthData: (options: { baseURL: string; apiKey?: string; days?: number }) => Promise<{
    workouts: number;
    metrics: number;
  }>;
};

const HealthKitModule = NativeModules.HealthKitModule as HealthKitModuleType | undefined;

export async function requestHealthAuthorization(): Promise<boolean> {
  if (Platform.OS !== 'ios' || !HealthKitModule) {
    return false;
  }
  return HealthKitModule.requestAuthorization();
}

export async function syncHealthData(options: {
  baseURL: string;
  apiKey?: string;
  days?: number;
}): Promise<{ workouts: number; metrics: number }> {
  if (Platform.OS !== 'ios' || !HealthKitModule) {
    return { workouts: 0, metrics: 0 };
  }
  return HealthKitModule.syncHealthData(options);
}
