import React, { useState, useEffect, useMemo, useContext } from 'react';
import { AppContext } from '../AppContext';
import { cookie_manager } from '../utils/cookie';
import { fetch_price } from '../utils/network.js';
import * as constants from "../utils/consts.js";
import LeftContainer from '../LeftContainer.js';
import RightContainer from '../RightContainer.js';

function set_last_graph_tab(tab_name) {
    cookie_manager.set_cookie(constants.GRAPH_MAIN_TAB_COOKIE, tab_name, 365);
}
function get_last_graph_tab() {
    let mode = cookie_manager.get_cookie(constants.GRAPH_MAIN_TAB_COOKIE);
    if (mode === null) {
        mode = 'graph2d';
        set_last_graph_tab(mode);
    }
    return mode;
}

export default function GraphTab() {

    const { dataManager } = useContext(AppContext);
    const { useLocalData } = useContext(AppContext);
    const { underlyingChanged } = useContext(AppContext);
    const { strikesChanged } = useContext(AppContext);
    const { days_left, setDaysLeft } = useContext(AppContext);
    const { sigmaIndex, setSigmaIndex } = useContext(AppContext);
    const { setRenderTrigger } = useContext(AppContext);
    const { byLeg, setByLeg } = useContext(AppContext);

    const [computed, setComputed] = useState(false);
    const [num_days, setNumDays] = useState(null);
    const [mean_volatility, setMean_volatility] = useState(null);
    const [selectedCombo, setSelectedCombo] = useState("LONG CALL");
    const [sigma_factors, setSigmaFactors] = useState([]);
    const [selectedSigma, setSelectedSigma] = useState(0);
    const [combo_options, setComboOptions] = useState(null);
    const [activeTab, setActiveTab] = useState(get_last_graph_tab());

    useEffect(() => {
        if (dataManager) {
            setComboOptions(dataManager.get_combos_names_list());
            setSelectedCombo(dataManager.get_active_combo_name());
            setDaysLeft(dataManager.get_time_for_simulation_of_active_combo());
            setNumDays(dataManager.get_time_to_expiry_of_active_combo());
            setMean_volatility(dataManager.get_mean_volatility_of_combo());
            setSigmaFactors(dataManager.get_sigma_factors());
            setSelectedSigma(sigma_factors[sigmaIndex]);
        }
    }, [dataManager]);

    useEffect(() => {
        set_last_graph_tab(activeTab);
    }, [activeTab]);

    useEffect(() => {
        if (dataManager && selectedCombo) {
            dataManager.set_active_combo(selectedCombo);
            dataManager.active_data.combo_name = selectedCombo;
        }
        const loadPrice = async () => {
            if (dataManager) {
                if (useLocalData) {
                    let price = 201.00;
                    //console.log("loaded local price = ", parseFloat(price));
                    dataManager.set_underlying_price(price);
                }
                else {
                    let price = await fetch_price('AAPL');
                    //console.log("loaded remote price = ", parseFloat(price.price));
                    dataManager.set_underlying_price(parseFloat(price.price));
                }
                setRenderTrigger(t => t + 1);
            }
        }
        loadPrice();

    }, [selectedCombo, dataManager, sigmaIndex]);

    useEffect(() => {
        if (dataManager) {
            dataManager.set_time_for_simulation_of_active_combo(parseFloat(days_left));
            dataManager.set_mean_volatility_of_combo(dataManager.get_use_real_values(), parseFloat(mean_volatility));
        }
    }, [days_left, mean_volatility, dataManager]);

    if (!dataManager) {
        return <div>[GraphTab] dataManager is null, loading chart...</div>;
    }

    return (
        <div style={{ display: 'flex', height: '100%', gap: '20px', alignItems: 'stretch' }}>
            <LeftContainer
                dataManager={dataManager}
                selectedCombo={selectedCombo}
                setSelectedCombo={setSelectedCombo}
                setNumDays={setNumDays}
                combo_options={combo_options}
                useLocalData={useLocalData}
                underlyingChanged={underlyingChanged}
                strikesChanged={strikesChanged}

                days_left={days_left}
                setDaysLeft={setDaysLeft}
                num_days={num_days}
                setRenderTrigger={setRenderTrigger}

                byLeg={byLeg}
                setByLeg={setByLeg}
                computed={computed}
                setComputed={setComputed}

                mean_volatility={mean_volatility}
                setMean_volatility={setMean_volatility}

                selectedSigma={selectedSigma}
                sigma_factors={sigma_factors}
                sigmaIndex={sigmaIndex}
                setSigmaIndex={setSigmaIndex}
            />
            <RightContainer
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            />

        </div>
    );

}
