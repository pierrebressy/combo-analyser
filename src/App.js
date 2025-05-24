import React, { useState, useEffect } from 'react';
import { AppContext } from './AppContext';
import GraphTab from './tabs/GraphTab';
import ComboBuilder from './tabs/ComboBuilder';
import ComboFinder from './tabs/ComboFinder';
import LogComponent from './components/LogComponent';
import { cookie_manager } from './utils/cookie';
import { is_mode_local, load_local_config } from './utils/network.js';
import { DataManager } from './utils/data_manager.js';
import { appendTextToLogComponent } from './components/LogComponent';
import * as constants from "./utils/consts.js";
import './css/App.css';
import './css/body-dark-mode.css';
import './css/body-light-mode.css';
import './css/tabs.css';
import './css/graphs.css';
import './css/combo-builder.css';
import './css/combo-finder.css';

function App() {
  const reset_local_storage_to_local_config = true;
  const reset_last_selected_combo_to_long_call = true;
  const force_use_local = true;

  const [useLocalData, setUseLocalData] = useState(false);
  const [comboFinderConnected, setComboFinderConnected] = useState(false);
  const [underlyingChanged, setUnderlyingChanged] = useState(false);
  const [strikesChanged, setStrikesChanged] = useState(false);

  const [dataManager, setDataManager] = useState(null);
  const [days_left, setDaysLeft] = useState(null);
  const [sigmaIndex, setSigmaIndex] = useState(0);

  const [renderTrigger, setRenderTrigger] = useState(0);
  const [byLeg, setByLeg] = useState(true);



  const [darkMode, setDarkMode] = useState(get_dark_mode() === "DARK");
  const [activeTab, setActiveTab] = useState(get_last_main_tab());

  const tabs = [
    { id: 'graph', label: '📈 Graphs' },
    { id: 'combo-builder', label: '🧾 Combo Builder' },
    { id: 'combo-finder', label: '🔍 Combo Finder' },
    //{ id: 'parameters', label: '⚙️ Parameters'},
    { id: 'log', label: '📈 LOG' },
  ];

  function save_display_mode(dark_mode) {
    cookie_manager.set_cookie(constants.DISPLAY_MODE, dark_mode ? "DARK" : "LIGHT", 365);
  }

  function get_dark_mode() {
    let mode = cookie_manager.get_cookie(constants.DISPLAY_MODE);
    if (mode !== "DARK" && mode !== "LIGHT") {
      mode = "DARK";
      save_display_mode(true);
    }
    return mode;
  }

  function set_last_main_tab(tab_name) {
    cookie_manager.set_cookie(constants.LAST_MAIN_TAB_COOKIE, tab_name, 365);
  }

  function get_last_main_tab() {
    let mode = cookie_manager.get_cookie(constants.LAST_MAIN_TAB_COOKIE);
    if (mode === null) {
      mode = 'graph';
      set_last_main_tab(mode);
    }
    return mode;
  }

  useEffect(() => {
    if (darkMode) {
      save_display_mode(true);
      document.body.classList.add("dark-mode");
      document.body.classList.remove("light-mode");
    } else {
      save_display_mode(false);
      document.body.classList.add("light-mode");
      document.body.classList.remove("dark-mode");
    }
  }, [darkMode]);


  useEffect(() => {
    const loadData = async () => {
      console.log("App.js: force_use_local", force_use_local);
      let local_mode = force_use_local;
      console.log("App.js: loadData()");
      if (!local_mode) {
        local_mode = await is_mode_local()
        console.log("App.js: is_mode_local()", local_mode);
      }
      setUseLocalData(local_mode);

      // load the config file and set it in localStorage
      if (reset_local_storage_to_local_config) {
        let local_config = await load_local_config();
        console.log("App.js: local_config", local_config);
        localStorage.setItem(constants.LOCAL_STORAGE_CONFIG, JSON.stringify(local_config));
      }
      // load the config from the localStorage
      let config = JSON.parse(localStorage.getItem(constants.LOCAL_STORAGE_CONFIG));
      console.log("App.js: config from local storage", config);

      // load the name of last selected combo from the cookie
      let last_selected_combo = cookie_manager.get_cookie(constants.LAST_SELECTED_COMBO_NAME_COOKIE);
      if (reset_last_selected_combo_to_long_call || last_selected_combo === null) {
        last_selected_combo = "LONG CALL";
        cookie_manager.set_cookie(constants.LAST_SELECTED_COMBO_NAME_COOKIE, "LONG CALL", 365);
      }
      console.log("App.js: last_selected_combo", last_selected_combo);
      console.log("App.js: config", config);

      // create the DataManager instance
      const instance = new DataManager(local_mode);
      await instance.setup(config);
      instance.set_active_combo_name(last_selected_combo);
      instance.set_underlying_price(170.00);
      instance.set_3d_view('P/L');
      setDataManager(instance);
      //console.log("App.js: instance", instance);

    }
    loadData();

  }, []);



  if (false) {
    return (
      <div>OK</div>
    );

  }

  return (

    <AppContext.Provider value={{
      useLocalData,
      setUseLocalData,
      underlyingChanged,
      setUnderlyingChanged,
      strikesChanged,
      setStrikesChanged,
      comboFinderConnected,
      setComboFinderConnected,
      dataManager,
      setDataManager,
      days_left,
      setDaysLeft,
      sigmaIndex,
      setSigmaIndex,
      renderTrigger,
      setRenderTrigger,
      byLeg,
      setByLeg
    }}>

      <div className="global-container">
        <div className="top-dark-mode-container">
          <button
            onClick={() => {
              setDarkMode(prev => !prev);
              appendTextToLogComponent(darkMode ? "Dark !" : "Light !");
              console.log("App.js: setDarkMode(true)");
            }}
            style={{
              padding: '1px 1px',
              borderRadius: '6px',
              backgroundColor: darkMode ? '#333' : '#ddd',
              color: darkMode ? '#fff' : '#000',
              border: '1px solid #999',
              cursor: 'pointer',
              marginTop: '0px'
            }}
          >
            {darkMode ? '🌙 ➜ ☀️' : '☀️ ➜ 🌙'}
          </button>
        </div>

        <div className="main-tabs-container">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(tab.id);
                set_last_main_tab(tab.id);
              }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="main-tab-container">
          <div className="tab-container" style={{ display: activeTab === 'log' ? 'block' : 'none' }}>
            <LogComponent />
          </div>
          <div className="tab-container" style={{ display: activeTab === 'graph' ? 'block' : 'none' }}>
            <GraphTab />
          </div>
          <div className="tab-container" style={{ display: activeTab === 'combo-builder' ? 'block' : 'none' }}>
            <ComboBuilder />
          </div>
          <div className="tab-container" style={{ display: activeTab === 'combo-finder' ? 'block' : 'none' }}>
            <ComboFinder />
          </div>
        </div>
      </div>
    </AppContext.Provider>
  );
}

export default App;

