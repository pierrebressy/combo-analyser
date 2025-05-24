import React from "react";

export default class OneLegVolatility extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const { dataManager, setRenderTrigger, index } = this.props;
        return (
            <div className="mean-volatility-container">
                <label className="std-text">
                    Leg {index + 1}: {dataManager.get_combo_params().legs[index].iv.toFixed(2)}
                </label>
                <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.01}
                    value={dataManager.get_combo_params().legs[index].iv}
                    onChange={e => {
                        const newVol = parseFloat(e.target.value);
                        dataManager.get_combo_params().legs[index].iv = newVol;
                        setRenderTrigger(t => t + 1);
                    }}
                    style={{ flex: 1, padding: '8px' }}
                />
            </div>
        );
    }
}