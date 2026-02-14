const APP_CONFIG = {
  APP_NAME: "Job Board",
  CURRENCY: "₹",
  ENVIRONMENT: process.env.NEXT_PUBLIC_NODE_ENV,
  API_BASE_URL:
    process.env.NEXT_PUBLIC_NODE_ENV === "development"
      ? process.env.NEXT_PUBLIC_API_BASE_URL_DEV
      : process.env.NEXT_PUBLIC_API_BASE_URL_LIVE,
};

export default APP_CONFIG;
