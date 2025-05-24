import { cookie_manager } from '../utils/cookie.js';
import { fetch_configuration } from '../utils/network.js';
import * as constants from "../utils/consts.js";

export class DataManager {

    constructor(local = true) {
        this.local = local;
        this.ready = false;
    }

    async setup(config) {
        if (this.local) {
            //console.log("DataManager: using local data");
            //config = JSON.parse(localStorage.getItem(constants.LOCAL_STORAGE_CONFIG));
            //console.log("DataManager: localStorage config", config);
        }
        else {
            console.log("DataManager: using remote data");
            config = await fetch_configuration();
            localStorage.setItem(constants.LOCAL_STORAGE_CONFIG, JSON.stringify(config));
        }
        this.prepare(config);
        this.ready = true;

    }
    async setup2(config) {
        this.prepare(config);
        this.ready = true;

    }
    prepare(config) {
        this.prepare_window_data(config.window);
        this.prepare_graph_data(config.graph);
        this.prepare_computation_data(config.computation);
        this.prepare_combos_list_data(config.combos);
        this.prepare_active_data(config.active);
        this.set_active_combo(config.combos[config.active.combo_name]);

        this.use_local_data = false;
        this.underlying_changed = false;
        this.strikes_changed = false;
    }

    get_use_local_data() {
        return this.use_local_data;
    }
    set_use_local_data(value) {
        this.use_local_data = value;
    }
    get_underlying_changed() {
        return this.underlying_changed;
    }
    set_underlying_changed(value) {
        this.underlying_changed = value;
    }
    get_strikes_changed() {
        return this.strikes_changed;
    }
    set_strikes_changed(value) {
        this.strikes_changed = value;
    }
    get_simul_max_price_of_combo() {
        return this.combos_list[this.active_data.combo_name].simulation.max_price;
    }
    get_simul_min_price_of_combo() {
        return this.combos_list[this.active_data.combo_name].simulation.min_price;
    }
    set_simul_max_price_of_combo(num_days) {
        this.combos_list[this.active_data.combo_name].simulation.max_price = num_days;
    }
    set_simul_min_price_of_combo(price) {
        this.combos_list[this.active_data.combo_name].simulation.min_price = price;
    }
    get_simul_step_price_of_combo() {
        return this.combos_list[this.active_data.combo_name].simulation.step;
    }
    get_simulation_time_to_expiry() {
        return this.combos_list[this.active_data.combo_name].simulation.time_to_expiry;
    }


    get_sigma_factors() {
        return this.computation_params.sigma_factors;
    }
    get_greek_scaler() {
        return this.computation_params.greek_scaler;
    }
    get_computation_num_greeks() {
        return this.computation_params.num_greeks;
    }
    set_3d_view(value) {
        this.window_params.view_3d = value;
    }
    get_3d_view() {
        return this.window_params.view_3d;
    }

    get_use_real_values() {
        return this.active_data.use_real_values;
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
        const allPoints = datasets.flat();
        return Math.min(...allPoints.map(d => d.y));
    }

    get_max_of_dataset() {
        const datasets = [this.pl_at_exp_data, this.pl_at_init_data, this.pl_at_sim_data];
        const allPoints = datasets.flat();
        return Math.max(...allPoints.map(d => d.y));
    }

    get_mean_volatility_of_combo() {
        return this.combos_list[this.active_data.combo_name].simulation.mean_volatility;
    }
    set_mean_volatility_of_combo(real, mean_volatility) {
        //if (real) {
        //    this.combo.trade.mean_volatility = volatility;
        //}
        this.combos_list[this.active_data.combo_name].simulation.mean_volatility = mean_volatility;
    }
    get_interest_rate_of_combo() {
        return this.combos_list[this.active_data.combo_name].simulation.interest_rate;
    }

    set_active_combo(combo) {
        this.active_combo = combo;
    }
    get_active_combo() {
        return this.active_combo;
    }
    set_active_combo_name(combo_name) {
        this.active_data.combo_name = combo_name;
    }
    get_active_combo_name() {
        return this.active_data.combo_name;
    }
    get_combo_params() {
        return this.combos_list[this.active_data.combo_name];
    }

    get_combos_names_list() {

        let names = [];
        Object.entries(this.combos_list).forEach(([key, value]) => {
            names.push(value.name);
        });

        names = names.filter(name => name !== "Combo Builder");
        let combo_builder = cookie_manager.load_JSON_from_cookie("combo-builder");
        if (combo_builder) {
            names.push("Combo Builder");
            this.combos_list["Combo Builder"] = combo_builder;
        }
        return names;
    }
    prepare_window_data(data) {
        this.window_params = data
        //console.log("DataManager: window params prepared", this.window_params);
    }
    update_window_data(window_size) {
        this.window_params.size.width = window_size.width;
        this.window_params.size.height = window_size.height;
        //console.log("DataManager: window params size updated", this.window_params.size);
    }

    prepare_graph_data(data) {
        this.graph_params = data
        //console.log("DataManager: graph params prepared", this.graph_params);
    }

    prepare_computation_data(data) {
        this.computation_params = data
        //console.log("DataManager: computation params prepared", this.computation_params);
    }

    prepare_combos_list_data(data) {
        this.combos_list = data
        //console.log("DataManager: combos list prepared", this.combos_list);
    }

    prepare_active_data(data) {
        this.active_data = data
    }

    prepare_active_combo_data(data) {
        this.active_combo_params = data
        //console.log("DataManager: active combo params prepared", this.active_combo_params);
    }
    get_ticker_for_active_combo() {
        return this.combos_list[this.active_data.combo_name].ticker;
    }
    get_time_to_expiry_of_active_combo() {
        return this.combos_list[this.active_data.combo_name].simulation.time_to_expiry;
    }
    get_time_for_simulation_of_active_combo() {
        return this.combos_list[this.active_data.combo_name].simulation.time_for_simulation;
    }
    set_time_for_simulation_of_active_combo(time) {
        this.combos_list[this.active_data.combo_name].simulation.time_for_simulation = time;
    }

    get_tab_active() {
        return this.window_params.default_active_tab
    }

    set_underlying_price(underlying_price) {
        this.underlying_price = underlying_price;
    }
    get_underlying_price() {
        return this.underlying_price;
    }
    set_original_underlying_price(underlying_price) {
        this.original_underlying_price = underlying_price;
    }
    get_original_underlying_price() {
        return this.original_underlying_price;
    }

    set_volatility_is_per_leg(value) {
        this.computation_params.volatility_is_per_leg = value;
    }
}

