import React, {
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react';

const VeeBeeContext = createContext(null);

export function VeeBeeProvider({ children }) {
  const [resume, setResume] = useState({
    file: null,
    text: '',
    name: '',
  });

  const [jd, setJd] = useState('');

  const [lastAnalysis, setLastAnalysis] = useState(null);

  const value = useMemo(
    () => ({
      resume,
      setResume,
      jd,
      setJd,
      lastAnalysis,
      setLastAnalysis,
    }),
    [resume, jd, lastAnalysis]
  );

  return (
    <VeeBeeContext.Provider value={value}>
      {children}
    </VeeBeeContext.Provider>
  );
}

export function useVeeBee() {
  const ctx = useContext(VeeBeeContext);

  if (!ctx) {
    throw new Error(
      'useVeeBee must be used inside VeeBeeProvider'
    );
  }

  return ctx;
}