export interface Model {
  id: string;
  displayName: string;
  provider: string;
}

export interface GroupedModels {
  [provider: string]: Model[];
}

export interface LastModelStore {
  lastModel: string;
}

export type ColorFn = (text: string) => string;
