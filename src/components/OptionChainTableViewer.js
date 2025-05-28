import React from "react";

export class OptionChainTableViewer extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { calls, puts, allStrikes, getLeg, expiration, handleSelect } = this.props;
    return (
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

              //const callPrice = call.ask_price ?? call.price ?? '-';
              //const putPrice = put.ask_price ?? put.price ?? '-';
              const callAskPrice = call.ask ?? call.price ?? '-';
              const putAskPrice = put.ask ?? put.price ?? '-';
              const callBidPrice = call.bid ?? call.price ?? '-';
              const putBidPrice = put.bid ?? put.price ?? '-';

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
                  {renderCell(callLeg, 'bid', 'call', strike, callBidPrice)}
                  {renderCell(callLeg, 'ask', 'call', strike, callAskPrice)}
                  <td className="strike-col">{strike}</td>
                  {renderCell(putLeg, 'bid', 'put', strike, putBidPrice)}
                  {renderCell(putLeg, 'ask', 'put', strike, putAskPrice)}
                  <td>0</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    );
  }
}
