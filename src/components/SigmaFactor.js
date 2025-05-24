import React from "react";

export default class SigmaFactor extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const { selectedSigma, sigma_factors, sigmaIndex, setSigmaIndex } = this.props;
        return (
            <div className="sigma-factors-container">
                <div>
                    <label className="std-text">
                        Sigma x{selectedSigma}
                    </label>
                    <input
                        type="range"
                        min={0}
                        max={sigma_factors.length - 1}
                        step={1}
                        value={sigmaIndex}
                        onChange={(e) => setSigmaIndex(parseInt(e.target.value))}
                        style={{ width: '100%' }}
                    />
                    <datalist className="sigma-ticks" id="sigma-ticks">
                        {sigma_factors.map((value, index) => (
                            <option key={index} value={index} label={`${value}`} />
                        ))}
                    </datalist>
                </div>
            </div>
        );
    }
}