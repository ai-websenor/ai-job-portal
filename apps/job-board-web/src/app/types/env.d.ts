declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_NODE_ENV: "development" | "production";
      NEXT_PUBLIC_API_BASE_URL_DEV: string;
      NEXT_PUBLIC_API_BASE_URL_LIVE: string;
    }
  }
}
