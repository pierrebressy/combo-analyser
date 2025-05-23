import React, { useState, useEffect } from 'react';
import { AppContext } from './AppContext';
import GraphTab from './GraphTab';
import ComboBuilderTab from './ComboBuilderTab';
import ComboFinderTab from './ComboFinderTab';
import LogComponent from './LogComponent';
import { cookie_manager } from './cookie';
import { is_mode_local, load_local_config } from './network.js';
import { DataManager } from './data_manager.js';
import { appendTextToLogComponent } from './LogComponent';
import * as constants from "./consts.js";
import './App.css';
import './body-dark-mode.css';
import './body-light-mode.css';
import './tabs.css';
import './graphs.css';
import './combo-builder.css';
import './combo-finder.css';

function App() {
  const reset_local_storage_to_local_config = true;
  const reset_last_selected_combo_to_long_call = true;

  const [useLocalData, setUseLocalData] = useState(false);
  const [comboFinderConnected, setComboFinderConnected] = useState(false);
  const [underlyingChanged, setUnderlyingChanged] = useState(false);
  const [strikesChanged, setStrikesChanged] = useState(false);

  const [dataManager, setDataManager] = useState(null);
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

      console.log("App.js: loadData()");
      let local_mode=await is_mode_local()
      console.log("App.js: is_mode_local()", local_mode);
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
      await  instance.setup(config);
      instance.set_active_combo_name(last_selected_combo);
      setDataManager(instance);
      //console.log("App.js: instance", instance);

    }
    loadData();

  }, []);


  useEffect(() => {
    if (dataManager === null) {
      return;
    }
  }, [dataManager]);

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
      setComboFinderConnected
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
            <GraphTab dataManager={dataManager} />
          </div>
          <div className="tab-container" style={{ display: activeTab === 'combo-builder' ? 'block' : 'none' }}>
            <ComboBuilderTab />
          </div>
          <div className="tab-container" style={{ display: activeTab === 'combo-finder' ? 'block' : 'none' }}>
            <ComboFinderTab />
          </div>
        </div>



      </div>


    </AppContext.Provider>

  );

}

export default App;

