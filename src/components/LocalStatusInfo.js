import React from 'react';

export default class LocalStatusInfo extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const { useLocalData, underlyingChanged, strikesChanged, comboFinderConnected
        } = this.props;

        return (
            <div className="local-status-info-container">
                <label className="std-text">Status Info</label>
                <label className={`std-text ${useLocalData ? "local-mode-active" : "local-mode-inactive"}`}>
                    Backend connexion
                </label>
                <label className={`std-text ${comboFinderConnected ? "combo-finder-active" : "combo-finder-inactive"}`}>
                    Combo Finder connexion
                </label>
                <label className={`std-text ${underlyingChanged ? "underlying-changed" : "underlying-unchanged"}`}>
                    Underlying changed
                </label>
                <label className={`std-text ${strikesChanged ? "strike-changed" : "strike-unchanged"}`}>
                    Strikes changed
                </label>
            </div>
        );
    }
}