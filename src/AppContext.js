import { createContext } from 'react';

export const AppContext = createContext({
    useLocalData: false,
    setUseLocalData: () => { },
    underlyingChanged: false,
    setUnderlyingChanged: () => { },
    strikesChanged: false,
    setStrikesChanged: () => { },
    comboFinderConnected: false,
    setComboFinderConnected: () => { }
});
