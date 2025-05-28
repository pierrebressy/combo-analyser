import React, { useRef, useEffect, useState, useContext } from 'react';
import { AppContext } from '../AppContext';
import * as constants from "../utils/consts.js";
import { Line } from 'react-chartjs-2';
import { findZeroCrossings } from '../utils/zero_crossings.js';
import { add_refs_labels_plugin } from '../utils/add_refs_labels_plugin.js';
import { add_zc_labels_plugin } from '../utils/add_zc_labels_plugin.js';
import { add_sigma_area_plugin } from '../utils/add_sigma_area_plugin.js';
import { create_pl_chart_dataset } from '../utils/create_pl_chart_dataset.js';
import { create_pl_chart_options } from '../utils/create_pl_chart_options.js';
import { create_greeks_chart_options } from '../utils/create_greeks_chart_options.js';

import {
    Chart as ChartJS,
    LineElement,
    CategoryScale,
    LinearScale,
    PointElement,
    Filler,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

import { compute_data_to_display } from '../utils/computation.js';

ChartJS.register(
    LineElement,
    CategoryScale,
    LinearScale,
    PointElement,
    Filler,
    Title,
    Tooltip,
    Legend);

export default function Graph2DTab({ }) {
    const { setUnderlyingChanged, setStrikesChanged } = useContext(AppContext);
    const { sigmaIndex } = useContext(AppContext);
    const { dataManager } = useContext(AppContext);
    const { renderTrigger } = useContext(AppContext);
    const { byLeg } = useContext(AppContext);

    const chartRefPL = useRef(null);
    const chartRefGreek = useRef(null);
    const labelRefs = useRef([]);
    const draggingLabel = useRef(null);
    const [render2DTrigger, setRender2DTrigger] = useState(0);
    const zeroCrossings = useRef([]);

    useEffect(() => {
        const chart = chartRefPL.current;
        if (!chart) return;
        const canvas = chart.canvas;

        const getMouse = (e) => {
            const rect = canvas.getBoundingClientRect();
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        };

        const onMouseDown = (e) => {
            const pos = getMouse(e);
            const boxes = chart._labelBoxes || {};
            for (const [index, box] of Object.entries(boxes)) {
                if (
                    pos.x >= box.x &&
                    pos.x <= box.x + box.width &&
                    pos.y >= box.y &&
                    pos.y <= box.y + box.height
                ) {
                    draggingLabel.current = parseInt(index);
                    e.preventDefault();
                    break;
                }
            }
        };

        const onMouseMove = (e) => {
            if (draggingLabel.current == null) return;
            const pos = getMouse(e);
            const scale = chart.scales.x;
            const xVal = scale.getValueForPixel(pos.x);

            const legIndex = draggingLabel.current;
            labelRefs.current[legIndex].current = xVal;

            if (labelRefs.current[legIndex].id === "leg") {
                dataManager.get_combo_params().legs[draggingLabel.current].strike = xVal;
                dataManager.get_strikes_changed(true);
                setStrikesChanged(true);
            }
            else if (labelRefs.current[legIndex].id === "underlying") {
                dataManager.set_underlying_price(xVal); // underlying
                dataManager.set_underlying_changed(true);
                setUnderlyingChanged(true);
            }

            compute_data_to_display(dataManager, byLeg);
            zeroCrossings.current = findZeroCrossings(dataManager.get_pl_at_sim_data());
            setRender2DTrigger(t => t + 1);

            chart.update('none');
            e.preventDefault();
        };

        const onMouseUp = () => {
            draggingLabel.current = null;
        };

        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseup', onMouseUp);

        return () => {
            canvas.removeEventListener('mousedown', onMouseDown);
            canvas.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('mouseup', onMouseUp);
        };
    }, [dataManager, byLeg]);

    useEffect(() => {
        if (!dataManager) return;

        compute_data_to_display(dataManager, byLeg);

        const legs = dataManager.get_combo_params().legs;
        labelRefs.current = [
            ...legs.map(leg => ({ current: leg.strike, id: "leg" })),
            { current: dataManager.get_underlying_price(), id: "underlying" } // ➕ add underlying
        ];

        zeroCrossings.current = findZeroCrossings(dataManager.get_pl_at_sim_data());

        setRender2DTrigger(t => t + 1);
    }, [dataManager, renderTrigger, byLeg]);

    useEffect(() => {
        if (!chartRefPL.current) return;

        const chart = chartRefPL.current;
        const plugin1 = add_refs_labels_plugin(dataManager, labelRefs);
        const plugin2 = add_zc_labels_plugin(zeroCrossings.current);
        const plugin3 = add_sigma_area_plugin(dataManager, sigmaIndex, dataManager.get_underlying_price(), 15.0)
        const existingIndex1 = chart.config.plugins.findIndex(p => p.id === constants.REFS_LABELS_PLUGIN_ID);
        if (existingIndex1 !== -1) {
            chart.config.plugins.splice(existingIndex1, 1);
        }
        const existingIndex2 = chart.config.plugins.findIndex(p => p.id === constants.ZC_LINES_PLUGIN_ID);
        if (existingIndex2 !== -1) {
            chart.config.plugins.splice(existingIndex2, 1);
        }

        const existingIndex3 = chart.config.plugins.findIndex(p => p.id === constants.SIGMA_AREA_PLUGIN_ID);
        if (existingIndex3 !== -1) {
            chart.config.plugins.splice(existingIndex3, 1);
        }

        chart.config.plugins.push(plugin3);
        chart.config.plugins.push(plugin2);
        chart.config.plugins.push(plugin1);
        chart.update();
    }, [dataManager, render2DTrigger, sigmaIndex]);

    if (!dataManager) return <div>Loading chart...</div>;

    compute_data_to_display(dataManager, byLeg);
    const chartPL = create_pl_chart_dataset(dataManager);
    const chartOptionsPL = create_pl_chart_options(dataManager);

    let chartGreeks = [];
    let chartOptionsGreeks = [];
    let chartGreeksIndexes = [];
    [chartGreeks, chartOptionsGreeks, chartGreeksIndexes]= create_greeks_chart_options(dataManager);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '4px' }}>
            <div style={{ flex: 6, display: 'flex' }}>
                <Line
                    ref={chartRefPL}
                    data={chartPL}
                    options={chartOptionsPL}
                />
            </div>
            {chartGreeksIndexes.map(i => (
                <div key={i} style={{ flex: 1, display: 'flex' }}>

                    <div style={{ height: '100px', width: '100%' }}>
                        <Line ref={chartRefGreek} data={chartGreeks[i]} options={chartOptionsGreeks[i]} />
                    </div>
                </div>
            ))}
        </div>
    );
}
