import React from "react";

export class ComboTable extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { selectedLegs,
      setSelectedLegs,
      save_legs_to_cookie,
      save_combo_to_cookie,
      createNonModalWindow,
      symbol
    } = this.props;
    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Combo for {symbol}</h3>
          <button
            onClick={() => {
              setSelectedLegs([]);
              save_combo_to_cookie("combo-builder", [], symbol);
              const popup = document.querySelector('.non-modal-window');
              if (popup) popup.remove();
            }}
            className='selected-combo-button clear'>
            Clear
          </button>

          <button
            onClick={() => { save_legs_to_cookie(selectedLegs, symbol) }}
            className='selected-combo-button save'>
            Save
          </button>

          <button
            onClick={() => { save_combo_to_cookie("combo-builder", selectedLegs, symbol) }}
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
      </>

    );
  }
}
