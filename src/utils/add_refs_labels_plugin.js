import { getCssVarFromTheme } from '../utils/get_css_var_from_theme.js';
import * as constants from "../utils/consts.js";

export function add_refs_labels_plugin(dataManager, labelRefs) {
    return {
        id: constants.REFS_LABELS_PLUGIN_ID,
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
