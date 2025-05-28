import React from "react";

export default class OneLegExpirationOffset extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const { dataManager, setRenderTrigger, index } = this.props;
        return (
            <div className="days-expiration-container">
                <label className="std-text">
                    Leg {dataManager.get_combo_params().legs[index].strike.toFixed(1)}: exp. offset 
                </label>
                <input
                    type="number"
                    min={-50}
                    max={50}
                    step={1}
                    style={{ width: '30px', marginLeft: '8px' }}
                    value={dataManager.get_combo_params().legs[index].expiration_offset}
                    onChange={e => {
                        const newVol = parseFloat(e.target.value);
                        dataManager.get_combo_params().legs[index].expiration_offset = newVol;
                        setRenderTrigger(t => t + 1);
                    }}
                />
                            <label className="std-text">Qty</label>
            <input
                type="number"
                min={-10}
                max={10}
                step={1}
                style={{ width: '30px', marginLeft: '8px' }}
                value={dataManager.get_combo_params().legs[index].qty}
                onChange={e => {
                    dataManager.get_combo_params().legs[index].qty = parseInt(e.target.value, 10);
                    setRenderTrigger(t => t + 1);
                }}
            />

            </div>
        );
    }
}