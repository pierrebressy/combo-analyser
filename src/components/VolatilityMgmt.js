import React from "react";

export default class VolatilityMgmt extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const { byLeg, setByLeg, setRenderTrigger, computed, setComputed } = this.props;

        return (
            <div className="volatility-management-container">
                <label className="std-text">
                    Volatility
                </label>
                <label className='volatility-checkbox'>
                    <input
                        type="checkbox"
                        checked={byLeg}
                        onChange={(e) => {
                            setByLeg(e.target.checked);
                            setRenderTrigger(t => t + 1);
                        }}
                    />
                    By leg
                </label>

                <label className='volatility-checkbox'>
                    <input
                        type="checkbox"
                        checked={computed}
                        onChange={(e) => {
                            setComputed(e.target.checked);
                            setRenderTrigger(t => t + 1);
                        }}
                        disabled={!byLeg}
                    />
                    Computed
                </label>
            </div>
        );
    }
}