import React from "react";

export default class DaysLeft extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const { days_left, setDaysLeft, num_days, setRenderTrigger } = this.props;
        if (days_left == null) {
            return <div>Loading DaysLeft component...</div>;
        }
        return (
            <div className="days-left-container">
                <label className="std-text">
                    Days left: {days_left.toFixed(1)} / {num_days.toFixed(1)}
                </label>
                <input className="slider-reverse"
                    type="range"
                    min={0}
                    max={num_days}
                    step={0.1}
                    value={days_left}
                    onChange={e => {
                        setDaysLeft(parseFloat(e.target.value));
                        setRenderTrigger(t => t + 1);
                    }}
                    style={{ flex: 1, padding: '8px' }}
                />
            </div>
        );
    }
}