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

  return {
    getLocalStorage,
    setLocalStorage,
  };
};

export default useLocalStorage;
