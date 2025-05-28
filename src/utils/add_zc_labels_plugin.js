import { getCssVarFromTheme } from '../utils/get_css_var_from_theme.js';
import * as constants from "../utils/consts.js";

export function add_zc_labels_plugin(zc) {
    return {
        id: constants.ZC_LINES_PLUGIN_ID,
        afterDraw(chart) {
            const { ctx, chartArea, scales } = chart;
            if (!chartArea || !scales?.x || !scales?.y) return;

            const fontSize = 12;
            const padding = 6;
            const fontFamily = 'Menlo, monospace';
            chart._labelBoxes = {};

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

