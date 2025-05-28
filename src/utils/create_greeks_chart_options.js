import { createGreeksOptions } from '../utils/greeks_options_tpl.js';
import { getCssVarFromTheme } from '../utils/get_css_var_from_theme.js';
import { create_greeks_chart_dataset } from '../utils/create_greeks_chart_dataset.js';

function create_greek_chart_options(dataManager, greek_index) {

    let chart_option = createGreeksOptions(1);
    chart_option.scales.x.min = dataManager.get_simul_min_price_of_combo();
    chart_option.scales.x.max = dataManager.get_simul_max_price_of_combo();
    chart_option.scales.x.grid.color = getCssVarFromTheme('--grid-color', 'rgba(0, 0, 0, 0.1)');
    chart_option.scales.y.grid.color = getCssVarFromTheme('--grid-color', 'rgba(0, 0, 0, 0.1)');
    chart_option.scales.x.ticks.color = getCssVarFromTheme('--label-color', 'rgba(0, 0, 0, 0.1)');
    chart_option.scales.y.ticks.color = getCssVarFromTheme('--label-color', 'rgba(0, 0, 0, 0.1)');
    chart_option.scales.y.title.color = getCssVarFromTheme('--label-color', 'rgba(0, 0, 0, 0.1)');

    chart_option.scales.y.title.text = dataManager.graph_params.greeks.labels[greek_index];

    return chart_option;
}
export function create_greeks_chart_options(dataManager) {

    let chartGreeks=[];
    let chartOptionsGreeks=[];
    let chartGreeksIndexes=[];
    for (let i in dataManager.graph_params.greeks.ids) {
        let greek_index = dataManager.graph_params.greeks.ids[i];
        chartGreeksIndexes.push(i);
        let chart_option = create_greek_chart_options(dataManager, greek_index);
        chartOptionsGreeks.push(chart_option);
        chartGreeks.push(create_greeks_chart_dataset(dataManager, greek_index));
    }

    return [chartGreeks, chartOptionsGreeks, chartGreeksIndexes];
}
