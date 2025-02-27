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

function getURLParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}


export class Configuration {

    constructor(config) {

        let combo = "";

        try {
            combo = getURLParam("combo");
            if (combo.length == 0) {
                combo="BUY CALL";
            }
        }
        catch (error) {
            console.error("Error reading parameter combo from URL.");
            combo="BUY CALL";
        }
        config.config.combo = combo;

        // check length of combo
        // Attributes (properties)
        this.config = config;
        const container = d3.select("#graph-container").node();
        this.config.window.width = container.getBoundingClientRect().width;
        this.config.window.height = container.getBoundingClientRect().height - 50;
        this.combo = this.get_combo_params();
        this.simulation = this.get_simulation_params();

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
    get_volatility_of_combo() {
        return this.combo.simulation.volatility;
    }
    set_volatility_of_combo(volatility) {
        this.combo.simulation.volatility = volatility;
    }
    get_interest_rate_of_combo() {
        return this.combo.simulation.interest_rate;
    }
}

