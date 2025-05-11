import * as constants from "./const.js";

export async function is_mode_local() {
    try {
        const response = await fetch(`${constants.ping_cmd}`, { method: "GET" });
        if (response.ok) {
            return false;
        }
        return true;

    } catch (error) {
        console.warn("Remote server not available, switching to local mode.");
        return true;
    }
}

export async function load_local_price(ticker) {
    try {
        const url = `${constants.local_prices_file}?t=${Date.now()}`; // Append timestamp to bust cache
        const response = await fetch(url, { cache: "no-store" }); // Optional: explicit cache control
        if (!response.ok) throw new Error("Failed to load ", constants.local_prices_file);

        let local_prices = await response.json(); // Parse JSON and store in local_config
        //console.log("Prices loaded:", local_prices[ticker]);
        return local_prices[ticker];
    } catch (error) {
        console.error("Error loading prices:", error);
    }
}

export async function load_local_option_chain() {
    try {
        const url = `${constants.local_chain_file}?t=${Date.now()}`; // Append timestamp to bust cache
        const response = await fetch(url, { cache: "no-store" }); // Optional: explicit cache control
        if (!response.ok) throw new Error("Failed to load ", constants.local_chain_file);

        let local_option_chain = await response.json(); // Parse JSON and store in local_config
        //console.log("local_option_chain loaded:", local_option_chain);
        return local_option_chain;
    } catch (error) {
        console.error("Error loading option_chain:", error);
    }
}


export async function load_local_config() {
    try {
        const url = `${constants.local_config_file}?t=${Date.now()}`; // Append timestamp to bust cache
        const response = await fetch(url, { cache: "no-store" }); // Optional: explicit cache control
        if (!response.ok) throw new Error("Failed to load ", constants.local_config_file);

        let local_config = await response.json(); // Parse JSON and store in local_config
        //console.log("Config loaded:", local_config);
        return local_config;
    } catch (error) {
        console.error("Error loading config:", error);
    }
}

export function update_remote_config(config) {

    fetch(`${constants.updt_cfg_cmd}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
    })
        .then(response => response.json())
        .then(data => console.log("Success:", data))
        .catch(error => console.error("Error:", error));
}

export async function fetch_configuration() {
    const response = await fetch(`${constants.get_cfg_cmd}`);
    return response.json();
}

export async function fetch_price(ticker) {
    const response = await fetch(`${constants.get_price_cmd}` + ticker);
    return response.json();
}

export async function fetch_combo_templates() {
    const response = await fetch(`${constants.get_combo_tpl_cmd}`);
    return response.json();
}

//
export async function fetch_polygon_price(ticker) {
    const response = await fetch(`${constants.get_polygon_price_cmd}` + ticker);
    return response.json();
}