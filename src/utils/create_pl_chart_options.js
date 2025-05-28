import { createPLOptions } from '../utils/pl_options_tpl.js';
import { getCssVarFromTheme } from '../utils/get_css_var_from_theme.js';

export function create_pl_chart_options(dataManager) {

    const chartOptionsPL = createPLOptions(1);
    chartOptionsPL.scales.x.min = dataManager.get_simul_min_price_of_combo();
    chartOptionsPL.scales.x.max = dataManager.get_simul_max_price_of_combo();
    chartOptionsPL.scales.x.grid.color = getCssVarFromTheme('--grid-color', '#ffffff');
    chartOptionsPL.scales.y.grid.color = getCssVarFromTheme('--grid-color', '#ffffff');
    chartOptionsPL.scales.y.title.color = getCssVarFromTheme('--label-color', '#ffffff');
    chartOptionsPL.scales.x.ticks.color = getCssVarFromTheme('--label-color', '#ffffff');
    chartOptionsPL.scales.y.ticks.color = getCssVarFromTheme('--label-color', '#ffff00');

    return chartOptionsPL;
}