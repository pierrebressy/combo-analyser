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
                    Leg {dataManager.get_combo_params().legs[index].strike.toFixed(1)}: {dataManager.get_combo_params().legs[index].expiration_offset.toFixed(0)}d
                </label>
                <input
                    type="range"
                    min={-50}
                    max={50}
                    step={1}
                    value={dataManager.get_combo_params().legs[index].expiration_offset}
                    onChange={e => {
                        const newVol = parseFloat(e.target.value);
                        dataManager.get_combo_params().legs[index].expiration_offset = newVol;
                        setRenderTrigger(t => t + 1);
                    }}
                    style={{ flex: 1, padding: '8px' }}
                />
            </div>
        );
    }
}