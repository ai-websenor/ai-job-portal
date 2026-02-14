import { createContext, useContext, useState } from "react";

interface MainDrawerContextType {
  isMainDrawerOpen: boolean;
  toggleMainDrawer: () => void;
}

const MainDrawerContext = createContext<MainDrawerContextType | undefined>(
  undefined,
);

export const MainDrawerProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isMainDrawerOpen, setIsMainDrawerOpen] = useState(false);

  const toggleMainDrawer = () => setIsMainDrawerOpen((prev) => !prev);

  return (
    <MainDrawerContext.Provider value={{ isMainDrawerOpen, toggleMainDrawer }}>
      {children}
    </MainDrawerContext.Provider>
  );
};

export const useMainDrawer = () => {
  const context = useContext(MainDrawerContext);
  if (!context) {
    throw new Error("useMainDrawer must be used within a MainDrawerProvider");
  }
  return context;
};
