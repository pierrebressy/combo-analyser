import * as constants from "../utils/consts.js";

export async function is_mode_local() {
    try {
        const response = await fetch(`${constants.PING_CMD}`, { method: "GET" });
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
        const url = `${constants.LOCAL_PRICES_FILENAME}?t=${Date.now()}`; // Append timestamp to bust cache
        const response = await fetch(url, { cache: "no-store" }); // Optional: explicit cache control
        if (!response.ok) throw new Error("Failed to load ", constants.LOCAL_PRICES_FILENAME);

        let local_prices = await response.json(); // Parse JSON and store in local_config
        //console.log("Prices loaded:", local_prices[ticker]);
        return local_prices[ticker];
    } catch (error) {
        console.error("Error loading prices:", error);
    }
}

export async function load_local_history(ticker) {
    try {
        const url = `local_config/${ticker}.json?t=${Date.now()}`; // Append timestamp to bust cache
        const response = await fetch(url, { cache: "no-store" }); // Optional: explicit cache control
        if (!response.ok) throw new Error("Failed to load ", constants.LOCAL_PRICES_FILENAME);

        let local_history = await response.json(); // Parse JSON and store in local_config
        return local_history;
    } catch (error) {
        console.error("Error loading prices:", error);
    }
}

export async function load_local_option_chain() {
    try {
        console.log("Loading local option chain from:", constants.LOCAL_OPTION_CHAIN_FILENAME);
        const url = `${constants.LOCAL_OPTION_CHAIN_FILENAME}?t=${Date.now()}`; // Append timestamp to bust cache
        const response = await fetch(url, { cache: "no-store" }); // Optional: explicit cache control
        if (!response.ok) throw new Error("Failed to load ", constants.LOCAL_OPTION_CHAIN_FILENAME);

        let local_option_chain = await response.json(); // Parse JSON and store in local_config
        //console.log("local_option_chain loaded:", local_option_chain);
        return local_option_chain;
    } catch (error) {
        console.error("Error loading option_chain:", error);
    }
}


export async function load_local_config() {
    try {
        const url = `${constants.LOCAL_CONFIG_FILENAME}?t=${Date.now()}`; // Append timestamp to bust cache
        const response = await fetch(url, { cache: "no-store" }); // Optional: explicit cache control
        if (!response.ok) throw new Error("Failed to load ", constants.LOCAL_CONFIG_FILENAME);

        let local_config = await response.json(); // Parse JSON and store in local_config
        //console.log("Config loaded:", local_config);
        return local_config;
    } catch (error) {
        console.error("Error loading config:", error);
    }
}

export function update_remote_config(config) {

    fetch(`${constants.UPDATE_REMOTE_CONFIG_CMD}`, {
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
    const response = await fetch(`${constants.GET_REMOTE_CONFIG_CMD}`);
    return response.json();
}

export async function fetch_price(ticker) {
    const response = await fetch(`${constants.GET_PRICE_CMD}` + ticker);
    console.log("fetch_price response:", response);
    return response.json();
}

export async function fetch_combo_templates() {
    const response = await fetch(`${constants.GET_COMBO_TEMPLATE_CMD}`);
    return response.json();
}

//
export async function fetch_polygon_price(ticker) {
    const response = await fetch(`${constants.GET_POLYGON_PRICE_CMD}` + ticker);
    return response.json();
}