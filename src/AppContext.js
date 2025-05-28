import { createContext } from 'react';

export const AppContext = createContext({
    useLocalData: false,
    setUseLocalData: () => { },
    underlyingChanged: false,
    setUnderlyingChanged: () => { },
    strikesChanged: false,
    setStrikesChanged: () => { },
    comboFinderConnected: false,
    setComboFinderConnected: () => { },
    dataManager: null,
    setDataManager: () => { },
    days_left: null,
    setDaysLeft: () => { },
    num_days: 99,
    setNumDays: () => { },
    sigmaIndex: 0,
    setSigmaIndex: () => { },
    renderTrigger: 0,
    setRenderTrigger: () => { },
    byLeg: false,
    setByLeg: () => { },

});
