import { is_mode_local, load_local_price, load_local_config, update_remote_config, fetch_configuration, fetch_price } from './async.js';
import { Environment } from './configuration.js';
import { update_3d_view } from './3dview.js';
import { addLog } from './log.js';
import { test_iv } from './iv.js';
import { create_main_frame } from './frame.js';
import {display_sigma_selector, display_days_left_slider, display_theme_buttons} from './frame.js';
import {display_volatility_sliders, display_checkbox_for_volatility_mode, display_local_status} from './frame.js';
import { set_volatility_is_per_leg } from './global.js';
import { set_underlying_current_price } from './global.js';
import { set_use_local,get_use_local } from './global.js';
import { draw_graph} from './2d_graph.js';

export let env;

let ticker;
let price;


function reloadWithParam(key, value) {
    const url = new URL(window.location);
    url.searchParams.set(key, value); // Add or update the parameter
    window.location.href = url.toString(); // Navigate to the new URL
}
async function setup_global_env(e) {
    if (!e) {
        console.log("setup_global_env: loading env...");
        e = new Environment(get_use_local() ? await load_local_config() : await fetch_configuration());
        set_volatility_is_per_leg( e.check_if_volatility_is_per_leg() );
    }
    else {
        console.log("setup_global_env: env already set.");
    }
    return e
}
function display_combos_list() {

    const comboContainer = d3.select("#combo-list-container")
    comboContainer.selectAll("*").remove();
    const dropdown = comboContainer.append("select")
        .attr("id", "comboBox")
        .on("change", function () {
            //env.config.config.combo = this.value;
            env.set_combo(this.value);
            if (!get_use_local()) {
                update_remote_config(env.config);
                console.log("Remote config updated", env.config);
                env = 0
            }
            location.reload();
            console.log("reloadWithParam combo=", this.value);
            reloadWithParam("combo", this.value);

        });
    dropdown.selectAll("option")
        .data(env.get_combos())
        .enter()
        .append("option")
        .text(d => d)
        .attr("value", d => d)
        .attr("selected", d => d === env.config.config.combo ? "selected" : null);
    comboContainer.insert("label", "#comboBox")
        .attr("class", "std-text")
        .text("Choose combo: ");

}
function update_main_page() {

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

    const theme_container = d3.select("#left-container").append("div")
        .attr("class", "theme-container")
        .attr("id", "theme-container");

    const local_status_container = d3.select("#left-container").append("div")
        .attr("class", "local-status-container")
        .attr("id", "local-status-container");

    const auto_save_container = d3.select("#left-container").append("div")
        .attr("class", "local-status-container")
        .attr("id", "auto-save-container");

    d3.select("#left-container").append("div").append("br")

    const combo_list_container = d3.select("#left-container").append("div")
        .attr("class", "combo-list-container")
        .attr("id", "combo-list-container");

    d3.select("#left-container").append("div").append("br")

    const days_left_container = d3.select("#left-container").append("div")
        .attr("class", "days-left-container")
        .attr("id", "days-left-container");

    d3.select("#left-container").append("div").append("br")

    const volatility_main_container = d3.select("#left-container").append("div")
        .attr("class", "volatility-main-container")
        .attr("id", "volatility-main-container");
    const per_leg_volatility_container = d3.select("#left-container").append("div")
        .attr("class", "per-leg-volatility-container")
        .attr("id", "per-leg-volatility-container")
        .style("display", "none"); // Initially hidden
    const mean_volatility_container = d3.select("#left-container").append("div")
        .attr("class", "mean-volatility-container")
        .attr("id", "mean-volatility-container")
        .style("display", "block")  // Initially hidden

    d3.select("#left-container").append("div").append("br")

    /*
    const combo_templater_container = d3.select("#left-container").append("div")
        .attr("class", "combo-templater-container")
        .attr("id", "combo-templater-container");
 
    d3.select("#left-container").append("div").append("br")
    */

    const sigma_container = d3.select("#left-container").append("div")
        .attr("class", "sigma-selector-container")
        .attr("id", "sigma-selector-container");

    //sigma_knob = new Knob(sigma_container, env, env.get_sigma_factors(), draw_graph);

    d3.select("#left-container").append("div").append("br")

    //const camera_container = d3.select("#left-container").append("div")
    //    .attr("class", "camera-position-container")
    //    .attr("id", "camera-position-container");


    //document.body.classList.toggle('dark-theme');


    display_theme_buttons();
    display_local_status();
    display_checkbox_for_volatility_mode();
    display_volatility_sliders();
    display_days_left_slider();
    display_combos_list();
    display_sigma_selector();
    //display_camera_position_sliders();
    draw_graph();
    update_3d_view();
}

set_use_local( await is_mode_local() );
//set_use_local(true);

env = await setup_global_env(env);

ticker = env.get_ticker_of_combo();
price = get_use_local() ? await load_local_price(ticker) : await fetch_price(ticker);
env.set_underlying_current_price(price);
set_underlying_current_price(env.get_underlying_current_price().price);

create_main_frame(env.config.window.tab_active);
update_main_page();

window.addEventListener("resize", update_main_page);

addLog('State: use_local=' + get_use_local(), { warning: true });

test_iv();