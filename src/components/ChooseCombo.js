import React from "react";
import { cookie_manager } from '../utils/cookie';
import * as constants from "../utils/consts.js";

export default class ChooseCombo extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const { dataManager, selectedCombo, setSelectedCombo, combo_options } = this.props;
        if (!combo_options) {
            return <div>Loading ChooseCombo component...</div>;
        }

        return (
            <div className="choose-combo-container" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label className="std-text" style={{ whiteSpace: 'nowrap' }}>
                    Select combo:
                </label>
                <select
                    value={selectedCombo}
                    onChange={(e) => {
                        cookie_manager.set_cookie(constants.LAST_SELECTED_COMBO_NAME_COOKIE, e.target.value, 365);
                        let last_selected_combo = cookie_manager.get_cookie(constants.LAST_SELECTED_COMBO_NAME_COOKIE);
                        dataManager.set_active_combo_name(last_selected_combo);
                        setSelectedCombo(e.target.value);
                    }}
                    style={{ flex: 1, padding: '8px' }}
                >
                    {combo_options.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
            </div >
        );
    }
}