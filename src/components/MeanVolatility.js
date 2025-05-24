import React from "react";

export default class MeanVolatility extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const { mean_volatility, setMean_volatility, setRenderTrigger } = this.props;
        if (mean_volatility == null) {
            return <div>Loading MeanVolatility component...</div>;
        }
        return (
            <div className="mean-volatility-container">
                <label className="std-text">
                    Mean V: {mean_volatility.toFixed(2)}
                </label>
                <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.01}
                    value={mean_volatility}
                    onChange={e => {
                        setMean_volatility(parseFloat(e.target.value));
                        setRenderTrigger(t => t + 1);
                    }}
                    style={{ flex: 1, padding: '8px' }}
                />
            </div>
        );
    }
}