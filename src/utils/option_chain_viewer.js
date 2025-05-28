import React, { useState, useEffect  } from 'react';
import { cookie_manager } from '../utils/cookie.js';
import { OptionChainTable } from '../utils/option_chain_table.js'; 

export function OptionChainViewer({ symbol, data }) {
  const expiryDates = Object.keys(data);
  const [activeExpiry, setActiveExpiry] = useState(expiryDates[0]);
  const [selectedLegs, setSelectedLegs] = useState([]);

  const selectedData = data[activeExpiry];

  // Fonction utilitaire : cette expiration a-t-elle des legs sélectionnées ?
  const hasLegsForExpiry = (expiry) => {
    return selectedLegs.some(leg => leg.expiration === expiry);
  };

  useEffect(() => {
    const cookie_name = 'combo_' + encodeURIComponent(symbol);
    const raw = cookie_manager.get_cookie(cookie_name);
    if (raw !== null) {
      const parsed = JSON.parse(decodeURIComponent(raw));
      //console.log('cookie=', parsed);
      setSelectedLegs(parsed);
      //console.log('cookie=', cookie_name, parsed);
    }
    else {
      console.warn('Could not find cookie', cookie_name);
    }
  }, [symbol]);


  return (
    <div className="oc-viewer-container">

      {/* Expiry buttons */}
      <div className="graphs-tab-container" style={{ marginBottom: '1rem' }}>
        {expiryDates.map(date => (
          <button
            key={date}
            className={`tab`}
            onClick={() => setActiveExpiry(date)}
            style={{
              backgroundColor: activeExpiry === date
                ? '#333'
                : hasLegsForExpiry(date)
                  ? '#ffe0b3'
                  : '#eee',
              color: activeExpiry === date ? 'white' : 'black',
              border: '1px solid #ccc',
              padding: '6px 12px',
              marginRight: '6px',
              borderRadius: '4px',
              fontWeight: activeExpiry === date ? 'bold' : 'normal',
              cursor: 'pointer'
            }}
          >
            {date}
          </button>
        ))}
      </div>

      {/* Table for active expiry */}
      <div className="oc-tab-container">
        <OptionChainTable
          data={selectedData}
          expiration={activeExpiry}
          selectedLegs={selectedLegs}
          setSelectedLegs={setSelectedLegs}
          symbol={symbol}
        />
      </div>
    </div>
  );
}

