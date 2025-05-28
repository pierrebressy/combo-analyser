import React from "react";
import LocalStatusInfo from './components/LocalStatusInfo';
import ChooseCombo from './components/ChooseCombo';
import DaysLeft from './components/DaysLeft';
import VolatilityMgmt from './components/VolatilityMgmt';
import OneLegExpirationOffset from "./components/OneLegExpirationOffset";
import MeanVolatility from "./components/MeanVolatility";
import OneLegVolatility from "./components/OneLegVolatility";
import SigmaFactor from "./components/SigmaFactor";

export default class LeftContainer extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const { dataManager, selectedCombo, setSelectedCombo, combo_options,
            useLocalData,strikesChanged,underlyingChanged,
            days_left, num_days, setNumDays, setDaysLeft, setRenderTrigger,
            byLeg, setByLeg, computed, setComputed,
            mean_volatility, setMean_volatility,
            selectedSigma, sigma_factors, sigmaIndex, setSigmaIndex
        } = this.props;

        return (
            <div className="left-container" style={{ flex: '0 0 20%' }}>
                <LocalStatusInfo 
                    useLocalData={useLocalData}
                    underlyingChanged={underlyingChanged}
                    strikesChanged={strikesChanged }
                />
                <ChooseCombo
                    dataManager={dataManager}
                    selectedCombo={selectedCombo}
                    setSelectedCombo={setSelectedCombo}
                    setNumDays={setNumDays}
                    setDaysLeft={setDaysLeft}
                    combo_options={combo_options} />
                <DaysLeft
                    days_left={days_left}
                    setDaysLeft={setDaysLeft}
                    num_days={num_days}
                    setRenderTrigger={setRenderTrigger}
                />
                                        <>
                            {dataManager.get_combo_params().legs.map((leg, index) =>
                                <OneLegExpirationOffset
                                    key={index}
                                    dataManager={dataManager}
                                    setRenderTrigger={setRenderTrigger}
                                    index={index}
                                />
                            )}
                        </>
                <VolatilityMgmt
                    byLeg={byLeg}
                    setByLeg={setByLeg}
                    setRenderTrigger={setRenderTrigger}
                    computed={computed}
                    setComputed={setComputed}
                />

                {byLeg
                    ? (
                        <>
                            {dataManager.get_combo_params().legs.map((leg, index) =>
                                <OneLegVolatility
                                    key={index}
                                    dataManager={dataManager}
                                    setRenderTrigger={setRenderTrigger}
                                    index={index}
                                />
                            )}
                        </>
                    )
                    : <MeanVolatility
                        mean_volatility={mean_volatility}
                        setMean_volatility={setMean_volatility}
                        setRenderTrigger={setRenderTrigger}
                    />
                }
                <SigmaFactor
                    selectedSigma={selectedSigma}
                    sigma_factors={sigma_factors}
                    sigmaIndex={sigmaIndex}
                    setSigmaIndex={setSigmaIndex}
                />
            </div>
        );
    }
}