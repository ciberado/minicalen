/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DB_PATH?: string;
  // add more env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
