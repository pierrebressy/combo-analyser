const local_prices_file = "local_config/prices.json";
const local_config_file = "local_config/config.json";
const local_chain_file = "local_config/full_option_chain.json";

export function saveJSONInCookie(cookieName, jsonObject, daysToExpire = 7) {
    const jsonString = JSON.stringify(jsonObject);
    const encoded = encodeURIComponent(jsonString);
    const expiryDate = new Date();
    expiryDate.setTime(expiryDate.getTime() + (daysToExpire * 24 * 60 * 60 * 1000));
    document.cookie = `${cookieName}=${encoded}; expires=${expiryDate.toUTCString()}; path=/`;
}

export function loadJSONFromCookie(cookieName) {
    const nameEQ = cookieName + "=";
    const cookies = document.cookie.split(';');
    for (let c of cookies) {
        c = c.trim();
        if (c.indexOf(nameEQ) === 0) {
            const encoded = c.substring(nameEQ.length);
            try {
                return JSON.parse(decodeURIComponent(encoded));
            } catch (e) {
                console.error("Failed to parse cookie JSON:", e);
                return null;
            }
        }
    }
    return null;
}

export function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + d.toUTCString();
    document.cookie = name + "=" + encodeURIComponent(value) + ";" + expires + ";path=/";
}

export function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
}

export async function is_mode_local() {
    try {
        const response = await fetch(`http://127.0.0.1:5000/ping`, { method: "GET" });
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
        const url = `${local_prices_file}?t=${Date.now()}`; // Append timestamp to bust cache
        const response = await fetch(url, { cache: "no-store" }); // Optional: explicit cache control
        if (!response.ok) throw new Error("Failed to load ", local_prices_file);

        let local_prices = await response.json(); // Parse JSON and store in local_config
        console.log("Prices loaded:", local_prices[ticker]);
        return local_prices[ticker];
    } catch (error) {
        console.error("Error loading prices:", error);
    }
}

export async function load_local_option_chain() {
    try {
        const url = `${local_chain_file}?t=${Date.now()}`; // Append timestamp to bust cache
        const response = await fetch(url, { cache: "no-store" }); // Optional: explicit cache control
        if (!response.ok) throw new Error("Failed to load ", local_chain_file);

        let local_option_chain = await response.json(); // Parse JSON and store in local_config
        //console.log("local_option_chain loaded:", local_option_chain);
        return local_option_chain;
    } catch (error) {
        console.error("Error loading option_chain:", error);
    }
}


export async function load_local_config() {
    try {
        const url = `${local_config_file}?t=${Date.now()}`; // Append timestamp to bust cache
        const response = await fetch(url, { cache: "no-store" }); // Optional: explicit cache control
        if (!response.ok) throw new Error("Failed to load ", local_config_file);

        let local_config = await response.json(); // Parse JSON and store in local_config
        //console.log("Config loaded:", local_config);
        return local_config;
    } catch (error) {
        console.error("Error loading config:", error);
    }
}

export function update_remote_config(config) {

    fetch("http://127.0.0.1:5000/update-config", {
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
    const response = await fetch("http://127.0.0.1:5000/get-config");
    return response.json();
}

export async function fetch_price(ticker) {
    const response = await fetch("http://127.0.0.1:5000/price/" + ticker);
    return response.json();
}

export async function fetch_combo_templates() {
    const response = await fetch("http://127.0.0.1:5000/get-combo-templates");
    return response.json();
}


