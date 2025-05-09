import { fetch_combo_templates } from './network.js';
import { cookie_manager } from './cookie.js';



function get_url_param(name) {
    return new URLSearchParams(window.location.search).get(name);
}

export class ComboTemplater {
    constructor() {
        this.combo_templates = {};
    }
    async fetch_combo_templates() {
        const response = await fetch_combo_templates();
        this.combo_templates = await response;
        console.log("Combo templates loaded:", this.combo_templates);
        return this.combo_templates;
    }
    get_combo_templates() {
        let combos = [];
        for (let key in this.combo_templates.combos) {
            combos.push(key);
        }
        return combos;
    }

}

export class Environment {

    constructor(config) {

        this.default_combo = "LONG CALL";
        console.log("Environment constructor");
        console.log("config=", config);
        this.check_config(config);
        this.config = config;

        // uncomment to overide the combo to use, stored in a cookie
        //cookie_manager.set_cookie("combo", "LONG CALL", 1);
        //cookie_manager.set_cookie("combo", "LONG PUT", 1);
        //cookie_manager.set_cookie("combo", "Combo Builder", 1);

        let combo = cookie_manager.get_cookie("combo");
        console.log("**** combo=", combo);

        if (combo != null) {
            console.log("Will use combo from cookie: ", combo);
        }
        else {
            combo = this.default_combo;
            console.log("No combo in cookie, using default combo", combo);
            cookie_manager.set_cookie("combo", combo, 1);
        }

        this.config.active.combo = combo;


        if (combo == "Combo Builder") {
            console.log("Combo Builder selected, loading from cookie");
            let combo_builder = cookie_manager.load_JSON_from_cookie("combo-builder");
            if (combo_builder) {
                console.log("Combo builder loaded from cookie: ", combo_builder);
                this.config.combos["Combo Builder"] = combo_builder;
                this.config.active.combo = "Combo Builder";
                console.log("Combo builder loaded from cookie: ", this.config.active.combo);
            }
        }

        // set the combo to the one selected
        this.combo = this.get_combo_params();
        if (this.combo == null) {
            console.log("Error: combo " + combo + "not found in config");
            this.config.active.combo = this.default_combo;
            cookie_manager.set_cookie("combo", this.default_combo, 1);
            console.log("setting cookie to " + this.default_combo);
            this.combo = this.get_combo_params();
        }

    }

    get_combo_params() {
        return this.config.combos[this.config.active.combo];
    }
    // --- WINDOW

    get_window_height() {
        return this.config.window.size.height;
    }
    set_window_height(height) {
        this.config.window.size.height = height;
    }
    get_window_width() {
        return this.config.window.size.width;
    }
    set_window_width(width) {
        this.config.window.size.width = width;
    }
    get_window_left_margin() {
        return this.config.window.margin.left;
    }
    get_window_right_margin() {
        return this.config.window.margin.right;
    }
    get_window_top_margin() {
        return this.config.window.margin.top;
    }
    get_window_bottom_margin() {
        return this.config.window.margin.bottom;
    }
    get_window_vspacer_margin() {
        return this.config.window.margin.vspacer;
    }
    get_window_greeks_vspacer_margin() {
        return this.config.window.margin.greeks_vspacer;
    }
    get_window_vspacer_price_axis() {
        return this.config.window.margin.price_axis;
    }
    get_graph_p_and_l_ratio() {
        return this.config.graph.p_and_l_ratio;
    }

    // --- BUTTONS

    get_button_default_text_vpos() {
        return this.config.window.button.text_vpos;
    }

    // --- IV SLIDER

    get_iv_slider_max_val() {
        return this.config.window.iv_slider.max;
    }
    get_iv_slider_min_val() {
        return this.config.window.iv_slider.min;
    }
    get_iv_slider_step() {
        return this.config.window.iv_slider.step;
    }

    // --- 3D VIEW

    set_3d_view(value) {
        this.config.window.view_3d = value;
    }
    get_3d_view() {
        return this.config.window.view_3d;
    }

    // --- COMPUTATION

    get_sigma_factors() {
        return this.config.computation.sigma_factors;
    }
    get_greek_scaler() {
        return this.config.computation.greek_scaler;
    }
    get_computation_num_greeks() {
        return this.config.computation.num_greeks;
    }
    check_if_volatility_is_per_leg() {
        return this.config.computation.volatility_is_per_leg;
    }
    set_if_volatility_is_per_leg(value) {
        this.config.computation.volatility_is_per_leg = value;
    }

    // --- <<<<<<<<<<<<<<<<

    set_combo(combo) {
        this.config.active.combo = combo;
        cookie_manager.set_cookie("combo", combo, 1);
    }

    // --- EXTRA DATA STORED IN ENVIRONMENT

    set_x_scale(scale) {
        this.xscale = scale;
    }
    get_x_scale() {
        return this.xscale;
    }

    set_greeks_data(data) {
        this.greeks_data = data;
    }
    get_greeks_data() {
        return this.greeks_data;
    }

    set_pl_at_exp_data(data) {
        this.pl_at_exp_data = data;
    }
    get_pl_at_exp_data() {
        return this.pl_at_exp_data;
    }
    set_pl_at_init_data(data) {
        this.pl_at_init_data = data;
    }
    get_pl_at_init_data() {
        return this.pl_at_init_data;
    }
    set_pl_at_sim_data(data) {
        this.pl_at_sim_data = data;
    }
    get_pl_at_sim_data() {
        return this.pl_at_sim_data;
    }
    get_min_of_dataset() {
        const datasets = [this.pl_at_exp_data, this.pl_at_init_data, this.pl_at_sim_data];
        return d3.min(datasets.flat(), d => d.y);
    }
    get_max_of_dataset() {
        const datasets = [this.pl_at_exp_data, this.pl_at_init_data, this.pl_at_sim_data];
        return d3.max(datasets.flat(), d => d.y);
    }
    set_underlying_current_price(price) {
        this.config.underlying_current_price = price;
    }
    get_underlying_current_price() {
        return this.config.underlying_current_price;
    }

    // --- COMBO / SIMULATION

    get_simulation_time_to_expiry() {
        return this.combo.simulation.time_to_expiry;
    }

    get_mean_volatility_of_combo(real) {
        /*if (real) {
            return this.combo.trade.mean_volatility;
        }*/
        return this.combo.simulation.mean_volatility;
    }
    set_mean_volatility_of_combo(real, volatility) {
        if (real) {
            this.combo.trade.mean_volatility = volatility;
        }
        this.combo.simulation.mean_volatility = volatility;
    }

    // --- CONFIG

    get_use_real_values() {
        return this.config.active.use_real_values;
    }
    set_use_real_values(use_real_values) {
        this.config.active.use_real_values = use_real_values;
    }

    // --- COMBOS

    get_simulation_params() {
        return this.combo.simulation;
    }
    get_combos() {

        let combos = [];
        for (let key in this.config.combos) {
            combos.push(key);
        }
        combos = combos.filter(name => name !== "Combo Builder");

        let combo_builder = cookie_manager.load_JSON_from_cookie("combo-builder");
        if (combo_builder) {
            combos.push("Combo Builder");
            this.config.combos["Combo Builder"] = combo_builder;
        }

        return combos;
    }
    // --- CURRRENT COMBO

    get_ticker_of_combo() {
        return this.combo.ticker;
    }
    get_time_to_expiry_of_combo() {
        return this.combo.simulation.time_to_expiry;
    }
    get_time_for_simulation_of_combo() {
        return this.combo.simulation.time_for_simulation;
    }
    set_time_for_simulation(time) {
        this.combo.simulation.time_for_simulation = time;
    }
    get_simul_max_price_of_combo() {
        return this.combo.simulation.max_price;
    }
    get_simul_min_price_of_combo() {
        return this.combo.simulation.min_price;
    }
    set_simul_max_price_of_combo(num_days) {
        this.combo.simulation.max_price = num_days;
    }
    set_simul_min_price_of_combo(price) {
        this.combo.simulation.min_price = price;
    }
    get_simul_step_price_of_combo() {
        return this.combo.simulation.step;
    }
    get_interest_rate_of_combo() {
        return this.combo.simulation.interest_rate;
    }



    check_config(config) {
        // table of main properties
        console.log("Cheking main properties of config data...");
        const main_properties = ["combos", "computation", "active", "window", "graph"];
        for (let property of main_properties) {
            if (!config.hasOwnProperty(property)) {
                throw new Error(`Config must have a '${property}' property`);
            }
            else {
                //console.log("Property " + property + " is present");
            }
        }
        // table of combos properties
        for (let combo in config.combos) {
            //console.log("Checking combo " + combo);
            const combo_properties = [
                "legs",
                "name",
                "simulation",
                "ticker"];
            for (let property of combo_properties) {
                if (!config.combos[combo].hasOwnProperty(property)) {
                    throw new Error(`Combo '${combo}' must have a '${property}' property`);
                }
                else {
                    //console.log("Property " + property + " is present");
                }
                //console.log("Checking combo "+combo+" / "+config.combos[combo].legs.length+" leg(s)");
                const legs_properties = [
                    "expiration_offset",
                    "qty",
                    "iv",
                    "strike",
                    "type",
                    "price"];
                for (let i = 0; i < config.combos[combo].legs.length; i++) {
                    for (let leg_property of legs_properties) {
                        if (!config.combos[combo].legs[i].hasOwnProperty(leg_property)) {
                            throw new Error(`Combo '${combo}'/legs['${i}'] must have a '${leg_property}' property`);
                        }
                        else {
                            //console.log("Property " + leg_property + " is present");
                        }
                    }
                }
                //console.log("Checking combo "+combo+" / simulation");
                const simulation_properties = [
                    "expiration_offset",
                    "interest_rate",
                    "max_price",
                    "mean_volatility",
                    "min_price",
                    "step",
                    "time_for_simulation",
                    "time_to_expiry"];
                for (let simulation_property of simulation_properties) {
                    if (!config.combos[combo].simulation.hasOwnProperty(simulation_property)) {
                        throw new Error(`Combo '${combo}'/simulation must have a '${simulation_property}' property`);
                    }
                    else {
                        //console.log("Property " + simulation_property + " is present");
                    }
                }
            }
        }
    }
}


