import { getCssVarFromTheme } from '../utils/get_css_var_from_theme.js';
import * as constants from "../utils/consts.js";

export function add_sigma_area_plugin(dataManager, sigmaIndex, price, sigma) {
    return {
        id: constants.SIGMA_AREA_PLUGIN_ID,
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
            ctx.fillStyle = getCssVarFromTheme('--sigma-area-color', 'rgba(22, 88, 143, 0.54)');
            ctx.fillRect(x1, top, x2 - x1, bottom - top);

            ctx.font = '14px Menlo, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';

            const textY = top + 7;
            const valueY = textY + 16;

            // -σ label
            ctx.fillStyle = getCssVarFromTheme('--sigma-text-color', '#808080');
            ctx.fillText('-𝜎', x1, textY);
            ctx.fillText((price - sigma).toFixed(2), x1, valueY);

            // +σ label
            ctx.fillStyle = getCssVarFromTheme('--sigma-text-color', '#808080');
            ctx.fillText('+𝜎', x2, textY);
            ctx.fillText((price + sigma).toFixed(2), x2, valueY);

            ctx.restore();
        }
    };
}

