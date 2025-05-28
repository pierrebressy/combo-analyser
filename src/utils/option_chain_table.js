import { createNonModalWindow } from '../utils/non_modal_window.js';
import { save_combo_to_cookie } from '../utils/save_combo_to_cookie.js';
import { save_legs_to_cookie } from '../utils/save_legs_to_cookie.js';
import { ComboTable } from '../components/ComboTable.js';
import { OptionChainTableViewer } from '../components/OptionChainTableViewer.js';

export function OptionChainTable({ data, expiration, selectedLegs, setSelectedLegs, symbol }) {
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


  return (
    <>
      <OptionChainTableViewer
        calls={calls}
        puts={puts}
        allStrikes={allStrikes}
        expiration={expiration}
        getLeg={getLeg}
        handleSelect={handleSelect}
      />

      {selectedLegs.length > 0 && (

        <div
          className="legs-summary"
          style={{
            marginTop: '10px',
            padding: '10px',
            border: '2px solid',
            borderRadius: '6px',
            maxWidth: 'fit-content'
          }}
        >

          <ComboTable 
            selectedLegs={selectedLegs}
            setSelectedLegs={setSelectedLegs}
            save_legs_to_cookie={save_legs_to_cookie}
            save_combo_to_cookie={save_combo_to_cookie}
            createNonModalWindow={createNonModalWindow}
            symbol={symbol}
            />
        </div >
      )}
    </>
  );
}
