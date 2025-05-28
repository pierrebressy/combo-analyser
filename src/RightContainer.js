import React from "react";
import Graph2DTab from './tabs/Graph2DTab';
import Graph3DTab from './tabs/Graph3DTab';
import GraphCombiTab from './tabs/GraphCombiTab';

export default class RightContainer extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const { activeTab, setActiveTab
        } = this.props;

        const tabs = [
            { id: 'graphcombi', label: '📈 Ticker Price + Combo', content: <GraphCombiTab /> },
            { id: 'graph2d', label: '📉 P/L & Greeks Graphs', content: <Graph2DTab /> },
            { id: 'graph3d', label: '📉 3D Graphs', content: <Graph3DTab /> }
        ];

        return (
            <div className="right-container">
                <div className="graphs-tab-container">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="graph-tab-container">
                    {tabs.find(tab => tab.id === activeTab)?.content}
                </div>
            </div>
        );
    }
}