const local_prices_file = "local_config/prices.json";
const local_config_file = "local_config/config.json";

export async function load_local_price(ticker) {
    try {
        const response = await fetch(local_prices_file); // Fetch the config file
        if (!response.ok) throw new Error("Failed to load ",local_prices_file);

        let local_prices = await response.json(); // Parse JSON and store in local_config
        console.log("Prices loaded:", local_prices[ticker]);
        return local_prices[ticker];
    } catch (error) {
        console.error("Error loading prices:", error);
    }
}

export async function load_local_config() {
    try {
        const response = await fetch(local_config_file); // Fetch the config file
        if (!response.ok) throw new Error("Failed to load ",local_config_file);

        let local_config = await response.json(); // Parse JSON and store in local_config
        console.log("Config loaded:", local_config);
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


