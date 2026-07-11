import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type RoomTheaterContextValue = {
  theater: boolean;
  setTheater: (value: boolean) => void;
};

const RoomTheaterContext = createContext<RoomTheaterContextValue>({
  theater: false,
  setTheater: () => {},
});

export function RoomTheaterProvider({ children }: { children: ReactNode }) {
  const [theater, setTheater] = useState(false);
  const value = useMemo(() => ({ theater, setTheater }), [theater]);
  return (
    <RoomTheaterContext.Provider value={value}>{children}</RoomTheaterContext.Provider>
  );
}

export function useRoomTheater() {
  return useContext(RoomTheaterContext);
}
