import React, { useState, useEffect, useMemo, useContext } from 'react';
import { AppContext } from './AppContext';
import LocalStatusInfo from './LocalStatusInfo';
import { cookie_manager } from './cookie';
import * as constants from "./consts.js";

import Graph2DTab from './Graph2DTab';
import Graph3DTab from './Graph3DTab';

function set_last_graph_tab(tab_name) {
    cookie_manager.set_cookie(constants.GRAPH_MAIN_TAB_COOKIE, tab_name, 365);
}
function get_last_graph_tab() {
    let mode = cookie_manager.get_cookie(constants.GRAPH_MAIN_TAB_COOKIE);
    //console.log("[get_last_graph_tab]", mode);
    if (mode === null) {
        mode = 'graph2d';
        set_last_graph_tab(mode);
    }
    return mode;
}
function set_last_selected_combo(combo_name) {
    cookie_manager.set_cookie(constants.LAST_SELECTED_COMBO_NAME_COOKIE, combo_name, 365);
}

export default function GraphTab({ dataManager }) {

    const { useLocalData, underlyingChanged, strikesChanged } = useContext(AppContext);
    const { setUseLocalData, setUnderlyingChanged, setStrikesChanged } = useContext(AppContext);

    const [days_left, setDaysLeft] = useState(null);
    const [byLeg, setByLeg] = useState(true);
    const [computed, setComputed] = useState(false);
    const [num_days, setNumDays] = useState(null);
    const [mean_volatility, setMean_volatility] = useState(null);
    const [selectedCombo, setSelectedCombo] = useState("LONG CALL");
    const [sigmaIndex, setSigmaIndex] = useState(0);
    const [sigma_factors, setSigmaFactors] = useState([]);
    const [selectedSigma, setSelectedSigma] = useState(0);
    const [combo_options, setComboOptions] = useState(null);
    const [renderTrigger, setRenderTrigger] = useState(0);
    const [activeTab, setActiveTab] = useState(get_last_graph_tab());
    const tabs = useMemo(() => [
        {
            id: 'graph2d',
            label: '📈 P/L & Greeks Graphs',
            content: dataManager
                ?
                <Graph2DTab
                    dataManager={dataManager}
                    byLeg={byLeg}
                    forceTrigger={renderTrigger}
                    sigmaIndex={sigmaIndex}
                />
                : <div>[GraphTab] Loading chart...</div>
        },
        {
            id: 'graph3d',
            label: '📈 3D Graphs',
            content: <Graph3DTab
                dataManager={dataManager}
                byLeg={byLeg}
                forceTrigger={renderTrigger}
            />
        }
    ], [dataManager, renderTrigger, byLeg, underlyingChanged, strikesChanged]);


    function choose_combo({ selected, setSelected }) {
        if (!combo_options) {
            return <div>Loading combo options...</div>;
        }
        return (
            <div className="choose-combo-container" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label className="std-text" style={{ whiteSpace: 'nowrap' }}>
                    Select combo:
                </label>
                <select
                    value={selected}
                    onChange={(e) => {
                        set_last_selected_combo(e.target.value);
                        let last_selected_combo = cookie_manager.get_cookie(constants.LAST_SELECTED_COMBO_NAME_COOKIE);
                        dataManager.set_active_combo_name(last_selected_combo);
                        update_data_manager_with_new_selected_combo();
                        setSelected(e.target.value);
                    }}
                    style={{ flex: 1, padding: '8px' }}
                >
                    {combo_options.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
            </div >
        );
    }
    function days_left_container() {
        if (days_left == null) {
            return <div>Loading combo options...</div>;
        }
        return (
            <div className="days-left-container">
                <label className="std-text">
                    Days left: {days_left.toFixed(1)} / {num_days.toFixed(1)}
                </label>
                <input className="slider-reverse"
                    type="range"
                    min={0}
                    max={num_days}
                    step={0.1}
                    value={days_left}
                    onChange={e => {
                        setDaysLeft(parseFloat(e.target.value));
                        setRenderTrigger(t => t + 1);
                    }}
                    style={{ flex: 1, padding: '8px' }}
                />
            </div>
        );
    }
    function volatility_management_container() {
        return (
            <div className="volatility-management-container">
                <label className='volatility-checkbox'>
                    <input
                        type="checkbox"
                        checked={byLeg}
                        onChange={(e) => {
                            setByLeg(e.target.checked);
                            setRenderTrigger(t => t + 1);
                        }}
                    />
                    By leg
                </label>

                <label className='volatility-checkbox'>
                    <input
                        type="checkbox"
                        checked={computed}
                        onChange={(e) => {
                            setComputed(e.target.checked);
                            setRenderTrigger(t => t + 1);
                        }}
                        disabled={!byLeg} // ✅ Disable if "By leg" not checked
                    />
                    Computed
                </label>
            </div>
        );
    }
    function mean_volatility_container() {
        if (mean_volatility == null) {
            return <div>Loading combo options...</div>;
        }
        return (
            <div className="mean-volatility-container">
                <label className="std-text">
                    Mean V: {mean_volatility.toFixed(2)}
                </label>
                <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.01}
                    value={mean_volatility}
                    onChange={e => {
                        setMean_volatility(parseFloat(e.target.value));
                        setRenderTrigger(t => t + 1);
                    }}
                    style={{ flex: 1, padding: '8px' }}
                />
            </div>
        );
    }
    function one_leg_volatility_container(index) {
        return (
            <div className="mean-volatility-container">
                <label className="std-text">
                    Leg {index + 1}: {dataManager.get_combo_params().legs[index].iv.toFixed(2)}
                </label>
                <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.01}
                    value={dataManager.get_combo_params().legs[index].iv}
                    onChange={e => {
                        const newVol = parseFloat(e.target.value);
                        dataManager.get_combo_params().legs[index].iv = newVol;
                        setRenderTrigger(t => t + 1);
                    }}
                    style={{ flex: 1, padding: '8px' }}
                />
            </div>
        );
    }
    function sigma_factors_container() {
        return (
            <div className="sigma-factors-container">
                <div>
                    <label className="std-text">
                        Sigma x{selectedSigma}
                    </label>
                    <input
                        type="range"
                        min={0}
                        max={sigma_factors.length - 1}
                        step={1}
                        value={sigmaIndex}
                        onChange={(e) => setSigmaIndex(parseInt(e.target.value))}
                        style={{ width: '100%' }}
                    />
                    <datalist className="sigma-ticks" id="sigma-ticks">
                        {sigma_factors.map((value, index) => (
                            <option key={index} value={index} label={`${value}`} />
                        ))}
                    </datalist>
                </div>
            </div>
        );
    }
    function left_container() {
        return (
            <div className="left-container" style={{ flex: '0 0 20%' }}>
                <LocalStatusInfo />
                {choose_combo({ selected: selectedCombo, setSelected: setSelectedCombo })}
                {days_left_container()}
                {volatility_management_container()}
                {byLeg
                    ? (
                        <>
                            {dataManager.get_combo_params().legs.map((leg, index) =>
                                <React.Fragment key={index}>
                                    {one_leg_volatility_container(index)}
                                </React.Fragment>
                            )}
                        </>
                    )
                    : mean_volatility_container()
                }
                {sigma_factors_container()}
            </div>
        );
    }
    function right_container() {
        return (
            <div className="right-container">
                <div className="graphs-tab-container">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="graph-tab-container">
                    {tabs.find(tab => tab.id === activeTab)?.content}
                </div>
            </div>
        );
    }
    function update_data_manager_with_new_selected_combo() {
        setDaysLeft(dataManager.get_time_for_simulation_of_active_combo());
        setNumDays(dataManager.get_time_to_expiry_of_active_combo());
        setMean_volatility(dataManager.get_mean_volatility_of_combo());
        setSigmaFactors(dataManager.get_sigma_factors());
        setSelectedSigma(sigma_factors[sigmaIndex]);
    }
/*
    useEffect(() => {
        if (dataManager) {
            setUseLocalData(dataManager.get_use_local_data());
            setUnderlyingChanged(dataManager.get_underlying_changed());
            setStrikesChanged(dataManager.get_strikes_changed());
        }
    }, [dataManager]);
*/
    useEffect(() => {
        if (dataManager) {
            setComboOptions(dataManager.get_combos_names_list());
            setSelectedCombo(dataManager.get_active_combo_name());
            update_data_manager_with_new_selected_combo();
        }
    }, [dataManager]);

    useEffect(() => {
        set_last_graph_tab(activeTab);
    }, [activeTab]);

    useEffect(() => {
        if (dataManager && selectedCombo) {
            dataManager.set_active_combo(selectedCombo);
            dataManager.active_data.combo_name = selectedCombo;
            setRenderTrigger(t => t + 1);
        }
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

    dataManager.set_underlying_price(194.65);

    return (
        <div style={{ display: 'flex', height: '100%', gap: '20px', alignItems: 'stretch' }}>
            {left_container()}
            {right_container()}

        </div>
    );

}
