const useLocalStorage = () => {
  const getLocalStorage = (key: string) => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(key);
    }
  };

  const setLocalStorage = (key: string, value: any) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, value);
    }
  };

  const removeLocalStorage = (key: string) => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(key);
    }
  };

  const getSessionStorage = (key: string) => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(key);
    }
  };

  const setSessionStorage = (key: string, value: any) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(key, value);
    }
  };

  const removeSessionStorage = (key: string) => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(key);
    }
  };

  return {
    getLocalStorage,
    setLocalStorage,
    removeLocalStorage,
    getSessionStorage,
    setSessionStorage,
    removeSessionStorage,
  };
};

export default useLocalStorage;
