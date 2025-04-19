import { is_mode_local, load_local_price, load_local_config, fetch_configuration, fetch_price, getCookie, setCookie } from './network.js';
import { Environment } from './configuration.js';
import { update_3d_view } from './3d_view.js';
import { addLog } from './log.js';
import { test_iv } from './iv.js';
import { create_main_frame } from './frame.js';
import { display_sigma_selector, display_days_left_slider, display_combos_list } from './frame.js';
import { display_volatility_sliders, display_checkbox_for_volatility_mode, display_local_status } from './frame.js';
import { set_dark_mode, set_volatility_is_per_leg } from './global.js';
import { set_underlying_current_price } from './global.js';
import { set_use_local, get_use_local } from './global.js';
import { draw_graph } from './2d_graph.js';
import { compute_iv_dichotomy } from './iv.js';
import { set_computed_volatility_available } from './global.js';

export let env;


async function setup_global_env(e) {
    
    // comment this line to reset local storage
    // to be done when the config.json structure is changed
    localStorage.removeItem('config');


    if (!e) {
        console.log("setup_global_env: loading env...");

        let config;
        if (get_use_local()) {
            config = JSON.parse(localStorage.getItem('config'));
            if (config == null) {
                console.log("config: localStorage is empty => loading local config from JSON file");
                config = await load_local_config();
                localStorage.setItem('config', JSON.stringify(config));
                console.log("config: localStorage set");
            }
            else {
                console.log("config: using localStorage");

            }
        }
        else {
            console.log("config: using remote config");
            config = await fetch_configuration();
        }
        e = new Environment(config);




        //e = new Environment(get_use_local() ? await load_local_config() : await fetch_configuration());
        set_volatility_is_per_leg(e.check_if_volatility_is_per_leg());
    }
    else {
        console.log("setup_global_env: env already set.");
    }


    return e
}
function display() {

    const container = d3.select("#pl-container")
    let original_state = container.classed("hidden")
    container.classed("hidden", false);
    let graph_width = container.node().clientWidth;
    let graph_height = container.node().clientHeight;
    container.classed("hidden", original_state);

    env.set_window_width(graph_width);
    env.set_window_height(graph_height);

    let left_container = d3.select("#left-container");
    left_container.selectAll("*").remove();

    d3.select("#left-container").append("div")
        .attr("class", "local-status-container")
        .attr("id", "local-status-container");
    d3.select("#left-container").append("div")
        .attr("class", "local-status-container")
        .attr("id", "auto-save-container");
    display_local_status();

    d3.select("#left-container").append("div").append("br")

    d3.select("#left-container").append("div")
        .attr("class", "combo-list-container")
        .attr("id", "combo-list-container");
    display_combos_list();



    d3.select("#left-container").append("div").append("br")

    d3.select("#left-container").append("div")
        .attr("class", "days-left-container")
        .attr("id", "days-left-container");
    display_days_left_slider();

    d3.select("#left-container").append("div").append("br")

    d3.select("#left-container").append("div")
        .attr("class", "volatility-main-container")
        .attr("id", "volatility-main-container");
    d3.select("#left-container").append("div")
        .attr("class", "per-leg-volatility-container")
        .attr("id", "per-leg-volatility-container")
        .style("display", "none"); // Initially hidden
    d3.select("#left-container").append("div")
        .attr("class", "mean-volatility-container")
        .attr("id", "mean-volatility-container")
        .style("display", "block")  // Initially hidden
    display_checkbox_for_volatility_mode();
    display_volatility_sliders();

    d3.select("#left-container").append("div").append("br")

    d3.select("#left-container").append("div")
        .attr("class", "sigma-selector-container")
        .attr("id", "sigma-selector-container");
    display_sigma_selector();

    d3.select("#left-container").append("div").append("br")

    draw_graph();
    update_3d_view();
}

async function main() {

    set_use_local(await is_mode_local());
    //set_use_local(true);

    env = await setup_global_env(env);

    let ticker = env.get_ticker_of_combo();
    let price = get_use_local() ? await load_local_price(ticker) : await fetch_price(ticker);
    env.set_underlying_current_price(price);
    set_underlying_current_price(env.get_underlying_current_price().price);

    set_computed_volatility_available(true);
    env.get_combo_params().legs.forEach(option => {
        option.computed_volatility = 0.;
        if (option.price === undefined) {
            console.error("Option price is undefined");
            set_computed_volatility_available(false);
        }
        console.log('ticker:', ticker, price.price);
        console.log('type:', option.type);
        console.log('strike:', option.strike);
        console.log('time_to_expiry:', env.get_simulation_time_to_expiry());
        console.log('price:', option.price);
        console.log('type:', option.type);
        const riskFreeRate = 0.05;
        const iv = compute_iv_dichotomy(price.price, option.strike, env.get_simulation_time_to_expiry() / 365, riskFreeRate, option.price, option.type);
        console.log("IV = ", (100 * iv).toFixed(2), " % (yearly)", (100 * iv / Math.sqrt(252)).toFixed(2), " % (daily)");
        option.computed_volatility = iv;
    });

    create_main_frame(env.config.window.tab_active);
    display();

    window.addEventListener("resize", display);

    addLog('State: use_local=' + get_use_local(), { warning: true });

    test_iv();

}
main();

