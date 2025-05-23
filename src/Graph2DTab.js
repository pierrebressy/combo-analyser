import React, { useRef, useEffect, useState, useContext } from 'react';
import { AppContext } from './AppContext';
import { Line } from 'react-chartjs-2';
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

import { compute_data_to_display } from './computation.js';

// Register Chart.js components and plugins
ChartJS.register(
    LineElement,
    CategoryScale,
    LinearScale,
    PointElement,
    Filler,
    Title,
    Tooltip,
    Legend);

export function getCssVarFromTheme(varName) {
    const themeRoot = document.querySelector('body.light-mode') || document.querySelector('body.dark-mode');
    if (!themeRoot) return null;
    const value = getComputedStyle(themeRoot).getPropertyValue(varName);
    return value?.trim();
}

function findZeroCrossings(data) {
    const zeros = [];
    for (let i = 1; i < data.length; i++) {
        const prev = data[i - 1].y;
        const curr = data[i].y;
        if ((prev < 0 && curr >= 0) || (prev > 0 && curr <= 0)) {
            //console.log("  i", i);
            // Linear interpolation for better accuracy
            const x0 = data[i - 1].x;
            const x1 = data[i].x;
            const y0 = prev;
            const y1 = curr;
            const xZero = x0 - y0 * (x1 - x0) / (y1 - y0);
            zeros.push(xZero);
            //console.log("  xZero", xZero);
        }
    }
    return zeros;
}

function add_refs_labels_plugin(dataManager, labelRefs) {
    return {
        id: 'ref_lines',
        afterDraw(chart) {
            const { ctx, chartArea, scales } = chart;
            if (!chartArea || !scales?.x || !scales?.y) return;

            const fontSize = 12;
            const padding = 6;
            const fontFamily = 'Menlo, monospace';
            chart._labelBoxes = {};

            labelRefs.current.forEach((ref, i) => {
                const xValue = ref.current;
                const xPixel = scales.x.getPixelForValue(xValue);


                // Determine color and label
                let color = getCssVarFromTheme('--underlying-line-color', 'blue');
                let labelText = `${xValue.toFixed(1)}`;
                let boxY = chartArea.bottom - 50;

                if (i < dataManager.get_combo_params().legs.length) {
                    const leg = dataManager.get_combo_params().legs[i];
                    color = leg.type === 'put' ?
                        getCssVarFromTheme('--put-label-color', 'green') :
                        getCssVarFromTheme('--call-label-color', 'red');
                    const type = leg.type === 'put' ? 'P' : 'C';
                    labelText = `${leg.qty} ${type} ${xValue.toFixed(1)}`;
                    boxY = chartArea.top - 10;
                }

                // Draw line
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(xPixel, chartArea.top);
                ctx.lineTo(xPixel, chartArea.bottom);
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();

                // Draw label
                ctx.save();
                ctx.font = `${fontSize}px ${fontFamily}`;
                const textWidth = ctx.measureText(labelText).width;
                const boxWidth = textWidth + padding * 2;
                const boxHeight = fontSize + padding;
                const boxX = xPixel - boxWidth / 2;

                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.roundRect?.(boxX, boxY, boxWidth, boxHeight, 4);
                ctx.fill();

                ctx.fillStyle = getCssVarFromTheme('--generic-text-color', 'white');
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(labelText, xPixel, boxY + boxHeight / 2);
                ctx.restore();

                chart._labelBoxes[i] = { x: boxX, y: boxY, width: boxWidth, height: boxHeight };
            });
        }
    };
}

function add_zc_labels_plugin(zc) {
    return {
        id: 'zc_lines',
        afterDraw(chart) {
            const { ctx, chartArea, scales } = chart;
            if (!chartArea || !scales?.x || !scales?.y) return;

            const fontSize = 12;
            const padding = 6;
            const fontFamily = 'Menlo, monospace';
            chart._labelBoxes = {};

            // ➕ Orange 0-crossing lines
            zc.forEach((xValue, idx) => {
                const xPixel = scales.x.getPixelForValue(xValue);
                const label = `${xValue.toFixed(1)}`;

                ctx.save();
                ctx.beginPath();
                ctx.moveTo(xPixel, chartArea.top);
                ctx.lineTo(xPixel, chartArea.bottom);
                ctx.strokeStyle = getCssVarFromTheme('--zc-line-color', 'red');
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();

                ctx.save();
                ctx.font = `${fontSize}px ${fontFamily}`;
                const textWidth = ctx.measureText(label).width;
                const boxWidth = textWidth + padding * 2;
                const boxHeight = fontSize + padding;
                const boxX = xPixel - boxWidth / 2;
                const boxY = chartArea.bottom - 25;

                ctx.fillStyle = getCssVarFromTheme('--zc-line-color', 'red');
                ctx.beginPath();
                ctx.roundRect?.(boxX, boxY, boxWidth, boxHeight, 4);
                ctx.fill();

                ctx.fillStyle = getCssVarFromTheme('--zc-text-color', 'white');
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, xPixel, boxY + boxHeight / 2);
                ctx.restore();
            });
        }
    };
}

function add_sigma_area_plugin(dataManager, sigmaIndex, price, sigma) {
    return {
        id: 'sigma-area',
        beforeDraw(chart) {
            const {
                ctx,
                chartArea: { left, right, top, bottom },
                scales: { x }
            } = chart;

            const x1 = x.getPixelForValue(price - sigma * dataManager.get_sigma_factors()[sigmaIndex]);
            const x2 = x.getPixelForValue(price + sigma * dataManager.get_sigma_factors()[sigmaIndex]);
            // Draw light blue rectangle
            ctx.save();
            ctx.fillStyle = 'rgba(22, 88, 143, 0.54)'; // light blue with transparency
            ctx.fillRect(x1, top, x2 - x1, bottom - top);

            // Set text styles
            ctx.font = '14px Menlo, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';

            const textY = top + 7;
            const valueY = textY + 16;

            // -σ label
            ctx.fillStyle = '#fff'; // black
            ctx.fillText('-𝜎', x1, textY);
            ctx.fillStyle = '#fff'; // white
            ctx.fillText((price - sigma).toFixed(2), x1, valueY);

            // +σ label
            ctx.fillStyle = '#fff'; // black
            ctx.fillText('+𝜎', x2, textY);
            ctx.fillStyle = '#fff'; // white
            ctx.fillText((price + sigma).toFixed(2), x2, valueY);

            ctx.restore();
        }
    };
}



export default function Graph2DTab({ dataManager, byLeg, forceTrigger, sigmaIndex }) {
    const { setUnderlyingChanged, setStrikesChanged } = useContext(AppContext);

    const chartRefPL = useRef(null);
    const chartRefGreek = useRef(null);

    const labelRefs = useRef([]);
    const draggingLabel = useRef(null);

    const [renderTrigger, setRenderTrigger] = useState(0);

    const zeroCrossings = useRef([]);

    const createPLOptions = (groupId) => ({
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
            x: {
                type: 'linear',
                min: 150,
                max: 230,
                title: {
                    display: false,
                    text: 'x'
                },
                grid: {
                    color: '#0000ff'

                },
                ticks: {
                    color: '#00ff00'
                }

            },
            y: {
                title: {
                    display: true,
                    text: 'y'
                },
                grid: {
                    color: '#0000ff' // couleur des lignes de la grille en X
                },
                ticks: {
                    color: '#00ff00' // ✅ X label color here (e.g. bright green)
                }
            }
        },
        plugins: {
            legend: {
                display: false // 🔥 hide "y vs x" box
            },
            tooltip: {
                enabled: false, // 🔥 disables the tooltip box
                mode: 'index',
                intersect: false
            },

        }
    });
    const createGreeksOptions = (groupId) => ({
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
            x: {
                type: 'linear',
                min: 150,
                max: 230,
                title: {
                    display: false,
                    //text: 'x'
                },
                grid: {
                    color: '#0000ff' // couleur des lignes de la grille en X
                },
                ticks: {
                    color: '#00ff00' // ✅ X label color here (e.g. bright green)
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'QQQ'
                },
                grid: {
                    color: '#0000ff' // couleur des lignes de la grille en X
                },
                ticks: {
                    color: '#00ff00' // ✅ X label color here (e.g. bright green)
                }
            }
        },
        plugins: {
            legend: {
                display: false // 🔥 hide "y vs x" box
            },
            tooltip: {
                enabled: false, // 🔥 disables the tooltip box
                mode: 'index',
                intersect: false
            },
        }
    });

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
            //console.log("[onMouseDown] boxes=", boxes);
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

            //if (draggingLabel.current < dataManager.get_combo_params().legs.length) {
            if (labelRefs.current[legIndex].id === "leg") {
                // 🔁 Update strike in dataManager
                dataManager.get_combo_params().legs[draggingLabel.current].strike = xVal;
                dataManager.get_strikes_changed(true);
                setStrikesChanged(true); // 🔁 met à jour le contexte strikesChanged
            }
            else if (labelRefs.current[legIndex].id === "underlying") {
                dataManager.set_underlying_price(xVal); // underlying
                dataManager.set_underlying_changed(true);
                setUnderlyingChanged(true); // 🔁 met à jour le contexte underlyingChanged
            }

            // ✅ Trigger recomputation if needed
            compute_data_to_display(dataManager, byLeg);
            zeroCrossings.current = findZeroCrossings(dataManager.get_pl_at_sim_data());
            setRenderTrigger(t => t + 1);

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
        // Recalcule toutes les données
        compute_data_to_display(dataManager, byLeg);

        const legs = dataManager.get_combo_params().legs;
        labelRefs.current = [
            ...legs.map(leg => ({ current: leg.strike, id: "leg" })),
            { current: dataManager.get_underlying_price(), id: "underlying" } // ➕ add underlying
        ];

        // Met à jour les zéro-crossings
        zeroCrossings.current = findZeroCrossings(dataManager.get_pl_at_sim_data());

        setRenderTrigger(t => t + 1);
    }, [dataManager, forceTrigger, byLeg]);


    useEffect(() => {
        if (!chartRefPL.current) return;

        const chart = chartRefPL.current;
        const plugin1 = add_refs_labels_plugin(dataManager, labelRefs);
        const plugin2 = add_zc_labels_plugin(zeroCrossings.current);
        const plugin3 = add_sigma_area_plugin(dataManager, sigmaIndex, dataManager.get_underlying_price(), 15.0)
        const existingIndex1 = chart.config.plugins.findIndex(p => p.id === 'ref_lines');
        if (existingIndex1 !== -1) {
            chart.config.plugins.splice(existingIndex1, 1);
        }
        const existingIndex2 = chart.config.plugins.findIndex(p => p.id === 'zc_lines');
        if (existingIndex2 !== -1) {
            chart.config.plugins.splice(existingIndex2, 1);
        }

        const existingIndex3 = chart.config.plugins.findIndex(p => p.id === 'sigma-area');
        if (existingIndex3 !== -1) {
            chart.config.plugins.splice(existingIndex3, 1);
        }

        chart.config.plugins.push(plugin3);
        chart.config.plugins.push(plugin2);
        chart.config.plugins.push(plugin1);
        chart.update();
    }, [dataManager, renderTrigger, sigmaIndex]);


    if (!dataManager) return <div>Loading chart...</div>;
    compute_data_to_display(dataManager, byLeg);
    const rawData = dataManager?.get_pl_at_sim_data?.() || [];
    const yPositive = rawData.map(p => (p.y >= 0 ? p : { x: p.x, y: null }));
    const yNegative = rawData.map(p => (p.y < 0 ? p : { x: p.x, y: null }));

    const chartPL = {
        datasets: [
            {
                label: 'y vs x',
                data: dataManager.get_pl_at_exp_data(),
                borderColor: getCssVarFromTheme('--expiry-line-color', 'rgba(0, 0, 0, 0.1)'),
                fill: false,
                tension: 0.1,
                pointRadius: 0,
            },
            {
                label: 'y vs x',
                data: dataManager.get_pl_at_init_data(),
                borderColor: getCssVarFromTheme('--init-line-color', 'rgb(255, 127, 8)'),
                fill: false,
                tension: 0.1,
                pointRadius: 0,
            },
            {
                label: 'y vs x',
                data: dataManager.get_pl_at_sim_data(),
                borderColor: getCssVarFromTheme('--sim-line-color', 'rgb(3, 183, 0)'),
                fill: false,
                tension: 0.1,
                pointRadius: 0,
            },
            {
                label: 'Positive',
                data: yPositive,
                borderColor: 'green',
                fill: true,
                backgroundColor: (context) => {
                    const chart = context.chart;
                    const { ctx, chartArea, scales } = chart; // ✅ ctx ici est le bon contexte canvas
                    if (!chartArea) return null;

                    const top = scales.y.getPixelForValue(scales.y.max);
                    const bottom = scales.y.getPixelForValue(0);
                    const gradient = ctx.createLinearGradient(0, top, 0, bottom); // ✅ OK ici

                    gradient.addColorStop(0, 'rgba(0, 200, 0, 0.6)');
                    gradient.addColorStop(1, 'rgba(0, 200, 0, 0)');
                    return gradient;
                },
                spanGaps: true,
                pointRadius: 0,
                tension: 0.3
            },
            {
                label: 'Negative',
                data: yNegative,
                borderColor: 'red',
                fill: true,
                backgroundColor: (context) => {
                    const chart = context.chart;
                    const { ctx, chartArea, scales } = chart; // ✅ ctx ici est le bon contexte canvas
                    if (!chartArea) return null;

                    const top = scales.y.getPixelForValue(0);
                    const bottom = scales.y.getPixelForValue(scales.y.min);
                    const gradient = ctx.createLinearGradient(0, top, 0, bottom); // ✅ OK ici

                    gradient.addColorStop(1, 'rgba(200,0,0,0.6)');
                    gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
                    return gradient;
                }, spanGaps: true,
                pointRadius: 0,
                tension: 0.3
            }

        ]
    };
    const chartOptionsPL = createPLOptions(1);
    chartOptionsPL.scales.x.min = dataManager.get_simul_min_price_of_combo();
    chartOptionsPL.scales.x.max = dataManager.get_simul_max_price_of_combo();
    chartOptionsPL.scales.x.grid.color = getCssVarFromTheme('--grid-color', 'rgba(0, 0, 0, 0.1)');
    chartOptionsPL.scales.y.grid.color = getCssVarFromTheme('--grid-color', 'rgba(0, 0, 0, 0.1)');
    chartOptionsPL.scales.x.ticks.color = getCssVarFromTheme('--label-color', 'rgba(0, 0, 0, 0.1)');
    chartOptionsPL.scales.y.ticks.color = getCssVarFromTheme('--label-color', 'rgba(0, 0, 0, 0.1)');

    const chartGreeks = [];
    let chartOptionsGreeks = []
    const chartGreeksIndexes = []
    let i = 0;
    for (i in dataManager.graph_params.greeks.ids) {
        let greek_index = dataManager.graph_params.greeks.ids[i];
        chartGreeksIndexes.push(i);
        let chart_option = createGreeksOptions(1);
        chart_option.scales.x.min = dataManager.get_simul_min_price_of_combo();
        chart_option.scales.x.max = dataManager.get_simul_max_price_of_combo();
        chart_option.scales.x.grid.color = getCssVarFromTheme('--grid-color', 'rgba(0, 0, 0, 0.1)');
        chart_option.scales.y.grid.color = getCssVarFromTheme('--grid-color', 'rgba(0, 0, 0, 0.1)');
        chart_option.scales.x.ticks.color = getCssVarFromTheme('--label-color', 'rgba(0, 0, 0, 0.1)');
        chart_option.scales.y.ticks.color = getCssVarFromTheme('--label-color', 'rgba(0, 0, 0, 0.1)');

        chart_option.scales.y.title.text = dataManager.graph_params.greeks.labels[greek_index];
        chartOptionsGreeks.push(chart_option);


        chartGreeks.push({
            datasets: [
                {
                    label: 'y vs x',
                    data: dataManager.get_greeks_data()[greek_index],
                    borderColor: 'green',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0,
                },

            ]
        });
    }

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
