import React, { useRef, useState, useEffect, use } from 'react';
import { load_local_option_chain } from '../utils/network.js';
import { cookie_manager } from '../utils/cookie.js';
import { DateManager } from '../utils/date.js';

export function createNonModalWindow({ title = 'Quick View', content = 'hello' }) {
  if (document.querySelector('.non-modal-window')) return;

  const div = document.createElement('div');
  div.className = 'non-modal-window';

  div.innerHTML = `
    <div class="header">
      <span class="title">${title}</span>
      <button class="close-button">✖</button>
    </div>
    <div class="content">${content}</div>
  `;

  document.body.appendChild(div);

  // Close logic
  div.querySelector('.close-button')?.addEventListener('click', () => {
    div.remove();
  });

  // Drag logic
  const header = div.querySelector('.header');
  let isDragging = false;
  let offsetX = 0, offsetY = 0;

  header.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('close-button')) return; // Don't drag when clicking "X"
    isDragging = true;
    const rect = div.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      div.style.left = `${e.clientX - offsetX}px`;
      div.style.top = `${e.clientY - offsetY}px`;
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    document.body.style.userSelect = '';
  });
}


function OptionChainTable({ data, expiration, selectedLegs, setSelectedLegs, symbol }) {
  const calls = data.calls || [];
  const puts = data.puts || [];

  const strikesSet = new Set([
    ...calls.map(c => c.strike),
    ...puts.map(p => p.strike)
  ]);
  const allStrikes = Array.from(strikesSet).sort((a, b) => a - b);

  // Trouver la leg (long ou short) pour call/put + strike
  const getLeg = (type, strike, expiration) => {
    return selectedLegs.find(l => l.type === type && l.strike === strike && l.expiration === expiration);
  };

  // Clic sur bid ou ask => modifie la quantité
  const handleSelect = (type, side, strike, price) => {
    setSelectedLegs(prev => {
      const existing = prev.find(l =>
        l.type === type && l.strike === strike && l.expiration === expiration
      );

      const newCount = (existing?.count || 0) + (side === 'ask' ? 1 : -1);

      if (newCount === 0) {
        return prev.filter(l =>
          !(l.type === type && l.strike === strike && l.expiration === expiration)
        );
      }

      const newLeg = { type, strike, price, count: newCount, expiration };

      if (existing) {
        return prev.map(l =>
          l.type === type && l.strike === strike && l.expiration === expiration
            ? newLeg
            : l
        );
      } else {
        return [...prev, newLeg];
      }
    });
  };

  function save_legs_to_cookie(legs) {
    const dataStr = JSON.stringify(legs, null, 2);
    const cookie_name = 'combo_' + encodeURIComponent(symbol);
    cookie_manager.set_cookie(cookie_name, dataStr, 7);
    console.log('Exported legs as cookie:', cookie_name, dataStr);
  }

  function save_combo(cookie_name, legs) {
    console.log("[save_combo] legs=", legs, legs === undefined);
    if (legs === undefined || legs.length === 0) {
      console.log("[save_combo] no legs");
      return;
    }
    let json = {};
    json.ticker = symbol;
    json.legs = [];
    let soonest_expiry = legs[0].expiry;
    let max_price = legs[0].strike;
    let min_price = legs[0].strike;
    console.log("[save_combo] json=", json);
    legs.forEach(leg => {
      console.log("[save_combo] leg=", leg);
      if (leg.expiry < soonest_expiry) {
        soonest_expiry = leg.expiry;
      }
      if (leg.strike > max_price) {
        max_price = leg.strike;
      }
      if (leg.strike < min_price) {
        min_price = leg.strike;
      }

      let l = {};
      l.iv = 0.2;
      l.qty = leg.count;
      l.strike = leg.strike;
      l.type = leg.type;
      l.price = leg.price;
      l.expiration_offset = 0;
      json.legs.push(l);

    });
    console.log("min_price=", min_price * 0.8);
    console.log("max_price=", max_price * 1.2);
    json.name = "Combo Builder";
    json.simulation = {};
    json.simulation.expiration_offset = 0;
    json.simulation.interest_rate = 0.04;
    json.simulation.max_price = max_price * 1.2;
    json.simulation.mean_volatility = 0.3;
    json.simulation.min_price = min_price * 0.8;
    json.simulation.step = 0.5
    console.log("soonest_expiry=", soonest_expiry);
    const remaining_days = new DateManager(soonest_expiry).remaining_days()
    console.log("remaining_days=", remaining_days);
    json.simulation.time_for_simulation = 10;
    json.simulation.time_to_expiry = 30;
    json.ticker = symbol;
    console.log("json=", json);
    cookie_manager.save_JSON_in_cookie(cookie_name, json);

  }

  /* 
  
      save_to_cookie(cookie_name) {
      let json = {};
      json.ticker = this.ticker;
      json.legs = [];
      let soonest_expiry = this.legs[0].expiry;
      let max_price = this.legs[0].strike;
      let min_price = this.legs[0].strike;
      this.legs.forEach(leg => {
          let l = {};
          l.expiration_offset = leg.offset;
          l.qty = leg.qty;
          l.iv = 0.2;
          l.strike = leg.strike;
          l.type = leg.type;
          l.price = leg.value;
          l.expiry = leg.expiry;
          json.legs.push(l);
          if (leg.expiry < soonest_expiry) {
              soonest_expiry = leg.expiry;
          }
          if (leg.strike > max_price) {
              max_price = leg.strike;
          }
          if (leg.strike < min_price) {
              min_price = leg.strike;
          }
      });
      console.log("min_price=", min_price*0.8);
      console.log("max_price=", max_price*1.2);
      json.name = "Combo Builder";
      json.simulation = {};
      json.simulation.expiration_offset = 0;
      json.simulation.interest_rate = 0.04;
      json.simulation.max_price = max_price*1.2;
      json.simulation.mean_volatility = 0.2;
      json.simulation.min_price = min_price*0.8;
      json.simulation.step = 0.5
      const remaining_days = new DateManager(soonest_expiry).remaining_days()
      console.log("remaining_days=", remaining_days);
      json.simulation.time_for_simulation = remaining_days;
      json.simulation.time_to_expiry = remaining_days;
      json.ticker = this.ticker;

      console.log("json=", json);
      cookie_manager.save_JSON_in_cookie(cookie_name, json);
      return json;
  }

  */


  return (
    <>
      <div className="table-wrapper">
        <table className="option-chain-table">
          <thead>
            <tr>
              <th>IV (mid)</th>
              <th>Call Bid</th>
              <th>Call Ask</th>
              <th>Strike</th>
              <th>Put Bid</th>
              <th>Put Ask</th>
              <th>IV (mid)</th>
            </tr>
          </thead>
          <tbody>
            {allStrikes.map(strike => {
              const call = calls.find(c => c.strike === strike) || {};
              const put = puts.find(p => p.strike === strike) || {};

              const callPrice = call.ask_price ?? call.price ?? '-';
              const putPrice = put.ask_price ?? put.price ?? '-';

              const callLeg = getLeg('call', strike, expiration);
              const putLeg = getLeg('put', strike, expiration);

              const renderCell = (leg, side, type, strike, price) => {
                const isBid = side === 'bid';
                const count = leg?.count || 0;
                const showInThisCell = (count < 0 && isBid) || (count > 0 && !isBid);
                const className = `${side}-cell ${showInThisCell ? (isBid ? 'selected-bid' : 'selected-ask') : ''}`;

                return (
                  <td
                    className={className}
                    onClick={() => {
                      handleSelect(type, side, strike, price)
                    }}
                  >
                    {showInThisCell
                      ? `${count > 0 ? '+' : ''}${count} × ${price}`
                      : price ?? '-'}
                  </td>
                );
              };

              return (
                <tr key={strike}>
                  <td>0</td>
                  {renderCell(callLeg, 'bid', 'call', strike, callPrice)}
                  {renderCell(callLeg, 'ask', 'call', strike, callPrice)}
                  <td className="strike-col">{strike}</td>
                  {renderCell(putLeg, 'bid', 'put', strike, putPrice)}
                  {renderCell(putLeg, 'ask', 'put', strike, putPrice)}
                  <td>0</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedLegs.length > 0 && (

        < div
          className="legs-summary"
          style={{
            marginTop: '10px',
            padding: '10px',
            border: '2px solid',
            borderRadius: '6px',
            maxWidth: 'fit-content'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Combo for {symbol}</h3>
            <button
              onClick={() => {
                setSelectedLegs([]);
                save_combo([]);
                const popup = document.querySelector('.non-modal-window');
                if (popup) popup.remove();
              }}
              className='selected-combo-button clear'>
              Clear
            </button>

            <button
              onClick={() => { save_legs_to_cookie(selectedLegs) }}
              className='selected-combo-button save'>
              Save
            </button>

            <button
              onClick={() => { save_combo("combo-builder", selectedLegs) }}
              className='selected-combo-button add'>

              Add to Combo List
            </button>

            <button
              onClick={() => {
                createNonModalWindow({
                  title: 'My Window',
                  content: 'Hello from the popup!',
                });
              }}
              className='selected-combo-button view'>

              Quick View
            </button>


          </div>
          <table className="legs-summary-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'center', paddingRight: '1rem' }}>Qty</th>
                <th style={{ textAlign: 'center', paddingRight: '1rem' }}>Type</th>
                <th style={{ textAlign: 'center', paddingRight: '1rem' }}>Strike</th>
                <th style={{ textAlign: 'center', paddingRight: '1rem' }}>@ Price</th>
                <th style={{ textAlign: 'center' }}>Expiration</th>
              </tr>
            </thead>
            <tbody>
              {selectedLegs.map((leg, index) => (
                <tr key={index} className={leg.count > 0 ? "qty-pos" : "qty-neg"}>
                  <td style={{ textAlign: 'center' }}>{leg.count > 0 ? `+${leg.count}` : leg.count}</td>
                  <td>{leg.type.toUpperCase()}</td>
                  <td style={{ textAlign: 'right' }}>{Number(leg.strike).toFixed(1)}</td>
                  <td style={{ textAlign: 'right' }}>{Number(leg.price).toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>{leg.expiration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div >
      )
      }
    </>
  );
  //                   <td style={{ textAlign: 'right' }}>{Number(leg.strike).toFixed(1)}</td>

}

function OptionChainViewer({ symbol, data }) {
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

export default function ComboBuilder() {
  const containerRef = useRef(null);
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);

  useEffect(() => {
    load_local_option_chain()
      .then(optionChainData => {
        //console.log('Option chain data:', optionChainData);

        const generatedTabs = Object.keys(optionChainData).map(symbol => ({
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
