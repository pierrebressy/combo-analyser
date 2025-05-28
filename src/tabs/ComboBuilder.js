import React, { useRef, useState, useEffect, use } from 'react';
import { load_local_option_chain } from '../utils/network.js';
import { OptionChainViewer } from '../utils/option_chain_viewer.js';

export default function ComboBuilder() {
  const containerRef = useRef(null);
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);

  useEffect(() => {
    load_local_option_chain()
      .then(optionChainData => {
        //console.log('Option chain data:', optionChainData);

        const generatedTabs = Object.keys(optionChainData).sort()
          .map(symbol => ({
            id: `tab-${symbol}`,
            label: `📁 ${symbol}`,
            content: (
              <OptionChainViewer symbol={symbol} data={optionChainData[symbol]} />
            )
          }));

        setTabs(generatedTabs);
        setActiveTab(generatedTabs[0]?.id); // Set the first tab as active
      })
      .catch(error => {
        console.error('Error loading option chain data:', error);
      });
  }, []);

  return (
    <div ref={containerRef} className="combo-builder-container">
      {/* Tab buttons */}
      <div className="tab-bar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <strong>{tab.label}</strong>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="tab-content">
        {tabs.map(tab => (
          activeTab === tab.id ? (
            <div key={tab.id} className="tab-content">
              {tab.content}
            </div>
          ) : null
        ))}
      </div>
    </div>
  );
}
