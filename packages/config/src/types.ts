export type ConfigMode = 'dev' | 'prod' | 'test';

export type ConfigDictionary = Record<string, unknown>;

export interface ConfigModuleOptions {
  mode: ConfigMode;
  envFile?: string;
  validate?: (raw: ConfigDictionary) => ConfigDictionary;
  defaults?: ConfigDictionary;
}

export interface ConfigLoadOptions extends ConfigModuleOptions {
  cwd?: string;
  processEnv?: NodeJS.ProcessEnv;
  runtimeOverrides?: ConfigDictionary;
}
