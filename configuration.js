export function getCookie(name) {
    const cookies = document.cookie.split("; ");
    for (let i = 0; i < cookies.length; i++) {
        const [cookieName, cookieValue] = cookies[i].split("=");
        if (cookieName === name) {
            return decodeURIComponent(cookieValue);
        }
    }
    return null;
}

export function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/";
}

function get_url_param(name) {
    return new URLSearchParams(window.location.search).get(name);
}

export class Environment {

    constructor(config) {

        let combo = "";

        try {
            combo = get_url_param("combo");
            if (combo.length == 0) {
                console.log("No parameter combo from URL, using default value BUY CALL.");
                combo = "BUY CALL";
            }
        }
        catch (error) {
            console.log("No parameter combo from URL, using default value.");
            combo = "BUY CALL";
        }
        config.config.combo = combo;

        let use_real_values = false;
        try {
            use_real_values = get_url_param("use_real_values") === "true";
        }
        catch (error) {
            console.log("Error reading parameter use_real_values from URL.");
            use_real_values = false;
        }
        config.config.use_real_values = use_real_values;

        // check length of combo
        // Attributes (properties)
        this.config = config;
        const container = d3.select("#graph-container").node();
        this.config.window.width = container.getBoundingClientRect().width;
        this.config.window.height = container.getBoundingClientRect().height - 50;
        this.combo = this.get_combo_params();
        this.simulation = this.get_simulation_params();

    }

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


    get_combo() {
        return this.combo;
    }
    get_window_height() {
        return this.config.window.height;
    }
    get_window_width() {
        return this.config.window.width;
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
    get_window_p_and_l_ratio() {
        return this.config.window.p_and_l_ratio;
    }
    get_full_graph_height() {
        return this.get_window_height()-this.get_window_top_margin();
    }

    get_button_default_height() {
        return this.config.window.button.height;
    }
    get_button_default_width() {
        return this.config.window.button.width;
    }
    get_button_default_text_vpos() {
        return this.config.window.button.text_vpos;
    }
    get_button_underlying_text_vpos() {
        return this.config.window.button.underlying_price_vpos;
    }



    get_simulation_time_to_expiry() {
        return this.combo.simulation.time_to_expiry;
    }
    get_computation_num_greeks() {
        return this.config.computation.num_greeks;
    }


    get_iv_slider_type() {
        return this.config.window.iv_slider.type;
    }
    get_iv_slider_width() {
        return this.config.window.iv_slider.width;
    }
    get_iv_slider_height() {
        return this.config.window.iv_slider.height;
    }
    get_iv_slider_max_val() {
        return this.config.window.iv_slider.max;
    }
    get_iv_slider_min_val() {
        return this.config.window.iv_slider.min;
    }
    get_iv_slider_step() {
        return this.config.window.iv_slider.step;
    }



    get_mean_volatility_of_combo(real) {
        if (real) {
            return this.combo.trade.mean_volatility;
        }
        return this.combo.simulation.mean_volatility;
    }
    set_mean_volatility_of_combo(real, volatility) {
        if (real) {
            this.combo.trade.mean_volatility = volatility;
        }
        this.combo.simulation.mean_volatility = volatility;
    }




    get_use_real_values() {
        return this.config.config.use_real_values;
    }
    set_use_real_values(use_real_values) {
        this.config.config.use_real_values = use_real_values;
    }

    get_trade_params() {
        return this.combo.trade;
    }
    get_window_params() {
        return this.config.window;
    }
    get_combo_params() {
        return this.config.combos[this.config.config.combo];
    }
    get_simulation_params() {
        return this.combo.simulation;
    }
    get_combos() {
        let combos = [];
        for (let key in this.config.combos) {
            combos.push(key);
        }
        //console.log(combos);
        return combos;
    }
    set_underlying_current_price(price) {
        this.config.underlying_current_price = price;
        //console.log("=> new underlying_current_price=" + this.config.underlying_current_price);
    }
    get_underlying_current_price() {
        return this.config.underlying_current_price;
    }
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
    get_simul_step_price_of_combo() {
        return this.combo.simulation.step;
    }
    get_interest_rate_of_combo() {
        return this.combo.simulation.interest_rate;
    }
}

