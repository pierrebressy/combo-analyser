import { computeOptionPrice } from './functions.js';
import { is_mode_local, load_local_price, load_local_config, update_remote_config, fetch_configuration, fetch_price } from './async.js';
import { Configuration, getCookie, setCookie } from './configuration.js';

let use_local = false;

let cfg;
let svg;
let x_scale;
let use_legs_volatility_checkbox;
let  priceLabelGroup;


function add_strike_lines(svg, cfg) {

    const window = cfg.get_window_params();
    const combo = cfg.get_combo_params();

    combo.legs.forEach(option => {
        const strike_value = x_scale(option.strike);

        svg.append("line")
            .attr("x1", window.margin.left + strike_value)
            .attr("y1", window.margin.top)  // Start at the top of pl_graph
            .attr("x2", window.margin.left + strike_value)
            .attr("y2", window.height)  // Extend to cover both graphs
            .attr("stroke", "red")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "5,5"); // Dotted line pattern
    });
}

function add_grid(graph, cfg, y_scale) {

    const window = cfg.get_window_params();
    const x_axis_grid = d3.axisBottom(x_scale)
        .tickSize(-window.height)  // Extend grid lines downward
        .tickFormat("");  // Hide tick labels

    const y_axis_grid = d3.axisLeft(y_scale)
        .tickSize(-window.width + window.margin.left + window.margin.right)  // Extend grid lines horizontally
        .tickFormat("");  // Hide tick labels

    // Add X-axis grid
    graph.append("g")
        .attr("class", "x-grid")
        .attr("transform", `translate(0, ${window.height})`)
        .call(x_axis_grid)
        .selectAll("line")
        .attr("stroke", "lightgray")
        .attr("stroke-opacity", 0.7)
        .attr("stroke-dasharray", "4,4");  // Dashed style

    // Add Y-axis grid
    graph.append("g")
        .attr("class", "y-grid")
        .call(y_axis_grid)
        .selectAll("line")
        .attr("stroke", "lightgray")
        .attr("stroke-opacity", 0.7)
        .attr("stroke-dasharray", "4,4");  // Dashed style
}

function create_strike_buttons(graph, cfg) {

    const window = cfg.get_window_params();
    const combo = cfg.get_combo_params();

    // Add draggable buttons for call & put
    graph.selectAll(".strike-button").remove();
    combo.legs.forEach(option => {
        let button_width = window.button.width;
        svg.append("rect")
            .attr("width", button_width)
            .attr("height", window.button.height)
            .attr("fill", option.type === "call" ? "red" : "green")
            .attr("rx", 2)
            .attr("ry", 2)
            .attr("x", window.margin.left + x_scale(option.strike) - button_width / 2)
            .attr("y", 0)
            .attr("stroke", "black") // Border color
            .attr("stroke-width", 2); // Border thickness

        svg.append("text")
            .attr("x", window.margin.left + x_scale(option.strike) + 4 - button_width / 2)
            .attr("y", window.button.text_vpos)
            .attr("fill", "white")
            .attr("class", "draggable-button")
            .attr("cursor", "pointer")
            .text(` ${option.qty}x ${option.type} ${option.strike}`)
            .call(d3.drag()
                .on("drag", function (event) {
                    let newX = Math.max(0, Math.min(window.width, (event.x - window.margin.left)));
                    d3.select(this).attr("x", newX - 15);
                    let newStrike = x_scale.invert(newX);
                    option.strike = Math.round(newStrike);
                    draw_graph();
                })
            );
    });



}

function create_underlying_current_price_buttons(graph, cfg) {

    const window = cfg.get_window_params();

    // Add draggable buttons for call & put
    let button_width = window.button.width;
    graph.append("rect")
        .attr("width", button_width)
        .attr("height", window.button.height)
        .attr("fill", "blue")
        .attr("rx", 2)
        .attr("ry", 2)
        .attr("x", window.margin.left + x_scale(cfg.get_underlying_current_price()) - button_width / 2)
        .attr("y", 0)
        .attr("stroke", "black") // Border color
        .attr("stroke-width", 2); // Border thickness

    let text_element = graph.append("text")
        .attr("x", window.margin.left + x_scale(cfg.get_underlying_current_price()))
        .attr("y", window.button.text_vpos)
        .attr("fill", "white")
        .attr("class", "draggable-button")
        .attr("cursor", "pointer")
        .text(`${cfg.get_underlying_current_price().toFixed(2)}`);
    const textWidth = text_element.node().getBBox().width;
    text_element.attr("x", window.margin.left + x_scale(cfg.get_underlying_current_price()) - textWidth / 2);

    const price_value = x_scale(cfg.get_underlying_current_price());

    //console.log(cfg.get_underlying_current_price());
    svg.append("line")
        .attr("x1", window.margin.left + price_value)
        .attr("y1", window.margin.top)  // Start at the top of pl_graph
        .attr("x2", window.margin.left + price_value)
        .attr("y2", window.height)  // Extend to cover both graphs
        .attr("stroke", "blue")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "5,5"); // Dotted line pattern

}

function compute_p_and_l_data(cfg, use_legs_volatility, num_days_left) {

    const combo = cfg.get_combo_params();
    const simulation = cfg.get_simulation_params();
    let p_and_l_data = [];

    for (let price = cfg.get_simul_min_price_of_combo(); price <= cfg.get_simul_max_price_of_combo(); price += cfg.get_simul_step_price_of_combo()) {
        let p_and_l_profile = 0;
        combo.legs.forEach(option => {
            let v = use_legs_volatility ? option.volatility : simulation.volatility;
            let option_price = computeOptionPrice(cfg.get_underlying_current_price(), option.strike, cfg.get_interest_rate_of_combo(), v, simulation.time_to_expiry + option.expiration_offset, option.type);
            let premium = option_price[0];
            let greeks = computeOptionPrice(price, option.strike, cfg.get_interest_rate_of_combo(), v, num_days_left + option.expiration_offset, option.type);
            p_and_l_profile = p_and_l_profile + option.qty * 100 * (greeks[0] - premium);
        });
        p_and_l_data.push({ x: price, y: p_and_l_profile });
    }
    return p_and_l_data
}

function compute_greeks_data(cfg, use_legs_volatility) {

    const simulation = cfg.get_simulation_params();
    const combo = cfg.get_combo_params();
    let greeks_data = [[], [], [], [], [], []];

    for (let price = cfg.get_simul_min_price_of_combo(); price <= cfg.get_simul_max_price_of_combo(); price += cfg.get_simul_step_price_of_combo()) {

        const num_greeks = 6;
        let greek_index = 0;
        let greek_scaler = [1, 100, 100, 100, 100, 100];
        for (greek_index = 0; greek_index < num_greeks; greek_index++) {
            let greek = 0;
            combo.legs.forEach(option => {
                let v = use_legs_volatility ? option.volatility : cfg.get_volatility_of_combo();
                let greeks = computeOptionPrice(price, option.strike, cfg.get_interest_rate_of_combo(), v, cfg.get_time_for_simulation_of_combo() + option.expiration_offset, option.type);
                greek = greek + option.qty * greeks[greek_index] * greek_scaler[greek_index];
            });
            greeks_data[greek_index].push({ x: price, y: greek });
        }
    }
    return greeks_data;
}

async function setup_volatility_sliders() {

    use_legs_volatility_checkbox = document.getElementById('ivCheckbox');
    const sliders_container = document.getElementById('sliders_container');

    const combo = cfg.get_combo_params();

    // Clear existing sliders
    sliders_container.innerHTML = '';

    if (use_legs_volatility_checkbox.checked) {

        // Multiple sliders for each leg
        combo.legs.forEach((option, index) => {
            const slider_container = document.createElement('div');
            const label = document.createElement('label');
            label.textContent = `${option.type} ${option.strike} IV`;

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.style.width = '100px';
            slider.min = 0.01;
            slider.max = 1;  // You can adjust this range as needed
            slider.step = 0.01;
            slider.value = option.volatility;// || 0.2;  // Assuming you store IV in each option's volatility

            // Display the IV value next to the slider
            const value_display = document.createElement('span');
            value_display.textContent = ` ${slider.value}`;
            slider.addEventListener('input', () => {
                value_display.textContent = ` ${slider.value}`;
                option.volatility = parseFloat(slider.value);
                ////console.log("=> new option.volatility("+index+")="+option.volatility);
                draw_graph();
            });

            slider_container.appendChild(label);
            slider_container.appendChild(slider);
            slider_container.appendChild(value_display);

            sliders_container.appendChild(slider_container);
        });
    } else {
        // Single slider for mean IV
        const slider_container = document.createElement('div');
        const label = document.createElement('label');
        label.textContent = 'Vol.';
        ////console.log(config);
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.style.width = '100px';
        slider.min = 0.01;
        slider.max = 1;  // Adjust this range as needed
        slider.step = 0.01;
        slider.value = cfg.get_volatility_of_combo();

        // Display the IV value next to the slider
        const value_display = document.createElement('span');
        value_display.textContent = ` ${slider.value}`;
        slider.addEventListener('input', () => {
            value_display.textContent = ` ${slider.value}`;
            cfg.set_volatility_of_combo(parseFloat(slider.value));
            ////console.log("config.volatility="+config.volatility);
            draw_graph();
        });

        slider_container.appendChild(label);
        slider_container.appendChild(slider);
        slider_container.appendChild(value_display);

        sliders_container.appendChild(slider_container);
    }
}

async function setup_days_left_slider() {
    // Fetch the config each time the slider needs to be updated
    // Get the container for the time slider
    const time_slider_container = document.getElementById('timeSliderContainer');

    // Clear existing sliders
    time_slider_container.innerHTML = '';

    // Create the time slider
    const slider_container = document.createElement('div');
    const label = document.createElement('label');
    label.textContent = 'Days';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.style.width = '100px';
    slider.min = .1;
    slider.max = cfg.get_time_to_expiry_of_combo();  // You can set this to a maximum value from config
    slider.step = .1;
    slider.value = cfg.get_time_for_simulation_of_combo();  // Set the default value from config

    // Display the time value next to the slider
    const value_display = document.createElement('span');
    value_display.textContent = ` ${slider.value}/${cfg.get_time_to_expiry_of_combo()}`;
    slider.addEventListener('input', () => {
        value_display.textContent = ` ${slider.value}/${cfg.get_time_to_expiry_of_combo()}`;
        cfg.set_time_for_simulation(parseInt(slider.value));
        draw_graph();
    });

    slider_container.appendChild(label);
    slider_container.appendChild(slider);
    slider_container.appendChild(value_display);

    time_slider_container.appendChild(slider_container);
}

async function setup_volatility_type() {
    d3.select("#ivCheckboxContainer")
        .append("input")
        .attr("type", "checkbox")
        .attr("id", "ivCheckbox")
        .attr("name", "ivCheckbox");

    // Append a label for the checkbox
    d3.select("#ivCheckboxContainer")
        .append("label")
        .attr("for", "ivCheckbox")
        .text("Set Vol. per leg");

    // Event listener to detect changes
    d3.select("#ivCheckbox").on("change", function () {
        //console.log("IV Checkbox checked:", this.checked);
        setup_volatility_sliders();
    });
    use_legs_volatility_checkbox = document.getElementById('ivCheckbox');
}

function reloadWithParam(key, value) {
    const url = new URL(window.location);
    url.searchParams.set(key, value); // Add or update the parameter
    window.location.href = url.toString(); // Navigate to the new URL
}

// Example: Reload and set `mode=local`

async function setup_combos_list() {

    // Select the container where the drop-down will be placed
    const titleContainer = d3.select("#title_container");
    titleContainer.insert("label", "#comboName")
        .text(cfg.get_combo_params().name);

    const comboContainer = d3.select("#combo_container");
    const dropdown = comboContainer.append("select")
        .attr("id", "comboBox")
        .on("change", function () {
            console.log("Selected:", this.value); // Handle selection change
            cfg.config.config.combo = this.value;

            if (!use_local) {
                update_remote_config(cfg.config);
                cfg = 0
            }
            location.reload();
            reloadWithParam("combo", this.value);

        });
    dropdown.selectAll("option")
        .data(cfg.get_combos())
        .enter()
        .append("option")
        .text(d => d)
        .attr("value", d => d)
        .attr("selected", d => d === cfg.config.config.combo ? "selected" : null);
    comboContainer.insert("label", "#comboBox")
        .text("Choose combo: ");

}

function draw_p_and_l(graph, scale, pl_at_expiration_data, pl_at_initial_data, pl_at_sim_date_data) {
    // Create SVG definitions for gradients
    const defs = graph.append("defs");

    // Green gradient for positive areas
    const green_gradient = defs.append("linearGradient")
        .attr("id", "greenGradient")
        .attr("x1", "0%").attr("y1", "100%")  // Start at bottom
        .attr("x2", "0%").attr("y2", "0%");   // End at top

    green_gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "white");

    green_gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "green");

    // Red gradient for negative areas
    const red_gradient = defs.append("linearGradient")
        .attr("id", "redGradient")
        .attr("x1", "0%").attr("y1", "0%")   // Start at top
        .attr("x2", "0%").attr("y2", "100%"); // End at bottom

    red_gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "white");

    red_gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "red");

    // Define the area generator for positive values (above zero)
    const area_below = d3.area()
        .x(d => x_scale(d.x))
        .y0(scale(0))  // Fill down to y=0
        .y1(d => Math.max(scale(d.y), scale(0))) // Only fill above zero
        .curve(d3.curveBasis); // Optional smoothing

    // Define the area generator for negative values (below zero)
    const area_above = d3.area()
        .x(d => x_scale(d.x))
        .y0(scale(0))  // Fill up to y=0
        .y1(d => Math.min(scale(d.y), scale(0))) // Only fill below zero
        .curve(d3.curveBasis);

    // Append the positive (green) gradient area
    graph.append("path")
        .datum(pl_at_expiration_data)
        .attr("fill", "url(#greenGradient)") // Apply green gradient
        .attr("opacity", 0.6)
        .attr("d", area_above);

    // Append the negative (red) gradient area
    graph.append("path")
        .datum(pl_at_expiration_data)
        .attr("fill", "url(#redGradient)") // Apply red gradient
        .attr("opacity", 0.6)
        .attr("d", area_below);

    // Append the line on top
    graph.append("path")
        .datum(pl_at_expiration_data)
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .attr("d", d3.line()
            .x(d => x_scale(d.x))
            .y(d => scale(d.y))
            .curve(d3.curveBasis) // Optional smoothing
        );

    // Append the line on top
    graph.append("path")
        .datum(pl_at_sim_date_data)
        .attr("fill", "none")
        .attr("stroke", "green")
        .attr("stroke-width", 2)
        .attr("d", d3.line()
            .x(d => x_scale(d.x))
            .y(d => scale(d.y))
            .curve(d3.curveBasis) // Optional smoothing
        );

    // Append the line on top
    graph.append("path")
        .datum(pl_at_initial_data)
        .attr("fill", "none")
        .attr("stroke", "orange")
        .attr("stroke-width", 2)
        .attr("d", d3.line()
            .x(d => x_scale(d.x))
            .y(d => scale(d.y))
            .curve(d3.curveBasis) // Optional smoothing
        );

}

function draw_greek(graph, scale, data) {
    // Create SVG definitions for gradients
    const defs = graph.append("defs");

    // Green gradient for positive areas
    const green_gradient = defs.append("linearGradient")
        .attr("id", "greenGradient")
        .attr("x1", "0%").attr("y1", "100%")  // Start at bottom
        .attr("x2", "0%").attr("y2", "0%");   // End at top

    green_gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "white");

    green_gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "green");

    // Red gradient for negative areas
    const red_gradient = defs.append("linearGradient")
        .attr("id", "redGradient")
        .attr("x1", "0%").attr("y1", "0%")   // Start at top
        .attr("x2", "0%").attr("y2", "100%"); // End at bottom

    red_gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "white");

    red_gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "red");

    // Define the area generator for positive values (above zero)
    const area_below = d3.area()
        .x(d => x_scale(d.x))
        .y0(scale(0))  // Fill down to y=0
        .y1(d => Math.max(scale(d.y), scale(0))) // Only fill above zero
        .curve(d3.curveBasis); // Optional smoothing

    // Define the area generator for negative values (below zero)
    const area_above = d3.area()
        .x(d => x_scale(d.x))
        .y0(scale(0))  // Fill up to y=0
        .y1(d => Math.min(scale(d.y), scale(0))) // Only fill below zero
        .curve(d3.curveBasis);

    // Append the positive (green) gradient area
    graph.append("path")
        .datum(data)
        .attr("fill", "url(#greenGradient)") // Apply green gradient
        .attr("opacity", 0.6)
        .attr("d", area_above);

    // Append the negative (red) gradient area
    graph.append("path")
        .datum(data)
        .attr("fill", "url(#redGradient)") // Apply red gradient
        .attr("opacity", 0.6)
        .attr("d", area_below);

    // Append the line on top
    graph.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .attr("d", d3.line()
            .x(d => x_scale(d.x))
            .y(d => scale(d.y))
            .curve(d3.curveBasis) // Optional smoothing
        );

}

function display_local_status() {
    d3.select("#graph-container")
        .append("div")
        .attr("class", use_local ? "red-dot" : "green-dot");
}

function add_crosshair(graph, cfg, window, x_scale, y_scale) {

    const crosshair = graph.append("g")
        .style("display", "none"); // Initially hidden

    priceLabelGroup = graph.append("g")
        .style("display", "none");

    // Add vertical line
    crosshair.append("line")
        .attr("class", "crosshair-line")
        .attr("id", "crosshair-x")
        .attr("y1", window.margin.top)
        .attr("y2", window.height - window.margin.bottom)
        .attr("stroke", "green")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,4");

    // Add horizontal line
    crosshair.append("line")
        .attr("class", "crosshair-line")
        .attr("id", "crosshair-y")
        .attr("x1", window.margin.left)
        .attr("x2", window.width - window.margin.right)
        .attr("stroke", "green")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,4");

    // Add blue rectangle for price label
    priceLabelGroup.append("rect")
        .attr("id", "price-label-bg")
        .attr("width", 50)
        .attr("height", 20)
        .attr("fill", "blue")
        .attr("rx", 5)
        .attr("ry", 5);

    // Add white text inside the rectangle
    priceLabelGroup.append("text")
        .attr("id", "price-label-text")
        .attr("fill", "white")
        .attr("text-anchor", "middle")
        .attr("dy", "1em")
        .style("font-size", "12px")
        .style("font-weight", "bold");

    graph.on("mousemove", function (event) {
        const [x, y] = d3.pointer(event, this); // Get mouse coordinates
        if (y < window.margin.top || y > window.height - window.margin.bottom) {
            crosshair.style("display", "none");
            return;
        }
        if (x < window.margin.left || x > window.width - window.margin.right) {
            crosshair.style("display", "none");
            return;
        }
        // Show crosshair
        crosshair.style("display", null);
        priceLabelGroup.style("display", null);

        // Update position of the crosshair lines
        crosshair.select("#crosshair-x")
            .attr("x1", x)
            .attr("x2", x);

        crosshair.select("#crosshair-y")
            .attr("y1", y)
            .attr("y2", y);


        // Update position of price label
        priceLabelGroup.attr("transform", `translate(${x - 25}, ${window.height - window.margin.bottom+4})`);

        // Update text
        window=cfg.get_window_params();
        const price = x_scale.invert(x-window.margin.left);
        const formattedPrice = price.toFixed(2); // Format as %.1f
        priceLabelGroup.select("#price-label-text")
            .attr("x", 25)
            .text(formattedPrice+" $");

    })
        .on("mouseleave", function () {
            // Hide crosshair when mouse leaves
            crosshair.style("display", "none");
            priceLabelGroup.style("display", "none");
        });





}

async function draw_graph() {

    if (!cfg) {
        cfg = new Configuration(use_local ? await load_local_config() : await fetch_configuration());
    }
    const window = cfg.get_window_params();

    let ticker = cfg.get_ticker_of_combo()

    let r = use_local ? await load_local_price(ticker) : await fetch_price(ticker);
    if (1) {
        cfg.set_underlying_current_price(r.price);
    }
    ////console.log(ticker, cfg.get_underlying_current_price())

    // get the data
    let pl_at_expiration_data = compute_p_and_l_data(cfg, use_legs_volatility_checkbox.checked, 0);
    let pl_at_initial_data = compute_p_and_l_data(cfg, use_legs_volatility_checkbox.checked, cfg.get_time_to_expiry_of_combo());
    let pl_at_sim_date_data = compute_p_and_l_data(cfg, use_legs_volatility_checkbox.checked, cfg.get_time_for_simulation_of_combo());
    let greeks_data = compute_greeks_data(cfg, use_legs_volatility_checkbox.checked);

    // prepare the graph area
    if (!svg) {
        svg = d3.select("#graph-container")
            .append("svg")
            .attr("width", window.width)
            .attr("height", window.height);
    }
    svg.selectAll("*").remove();


    // X scale for the price axis ; set at the bottom of the graph window
    const graph_width = window.width - window.margin.left - window.margin.right;
    x_scale = d3.scaleLinear().domain([cfg.get_simul_min_price_of_combo(), cfg.get_simul_max_price_of_combo()]).range([0, graph_width]);
    let y_offset = window.margin.top + window.height + window.margin.vspacer;
    y_offset = window.height - window.margin.price_axis;
    svg.append("g").attr("transform", `translate(${window.margin.left},${y_offset})`).call(d3.axisBottom(x_scale));


    // P&L and Greeks graph areas
    const p_and_l_graph_height = window.p_and_l_ratio * (window.height - window.margin.top - window.margin.bottom - window.margin.vspacer);
    const greeks_graphs_height = window.height - p_and_l_graph_height - window.margin.top - window.margin.bottom - window.margin.vspacer;

    let p_and_l_graph_area = svg
        .append("g")
        .attr("width", window.width)
        .attr("height", p_and_l_graph_height);

    let greeks_graph_area = svg
        .append("g")
        .attr("width", window.width)
        .attr("height", greeks_graphs_height);

    // P&L graph
    const datasets = [pl_at_expiration_data, pl_at_initial_data, pl_at_sim_date_data];
    const min_p_and_l = d3.min(datasets.flat(), d => d.y);
    const max_p_and_l = d3.max(datasets.flat(), d => d.y);

    const padding_p_and_l = (max_p_and_l - min_p_and_l) * 0.1;
    const scale_p_and_l = d3.scaleLinear()
        .domain([min_p_and_l - padding_p_and_l, max_p_and_l + padding_p_and_l])
        .range([p_and_l_graph_height, 0]);

    let p_and_l_graph = p_and_l_graph_area.append("g").attr("class", "p_and_l_graph");
    p_and_l_graph.attr("transform", `translate(${window.margin.left}, ${window.margin.top})`);
    p_and_l_graph.attr("width", window.width - window.margin.left);
    p_and_l_graph.append("g").call(d3.axisLeft(scale_p_and_l));
    p_and_l_graph.append("g").attr("transform", `translate(0,${scale_p_and_l(0)})`).call(d3.axisBottom(x_scale)).selectAll(".tick text").remove();
    p_and_l_graph.attr("clip-path", "url(#clipBox)");

    add_grid(p_and_l_graph, cfg, scale_p_and_l)


    draw_p_and_l(p_and_l_graph, scale_p_and_l, pl_at_expiration_data, pl_at_initial_data, pl_at_sim_date_data);

    // Add Y-axis label
    p_and_l_graph.append("text")
        .attr("transform", "rotate(-90)")  // Rotate text for Y-axis
        .attr("x", -p_and_l_graph_height / 2)            // Center the label
        .attr("y", -window.margin.left + 15)      // Position left of Y-axis
        .attr("dy", "1em")                 // Fine-tune vertical alignment
        .style("text-anchor", "middle")    // Center alignment
        .text("Profit / Loss ($)");        // Change this to your label

    // Greeks graphs

    let num_greeks_to_display = cfg.config.graph.greeks.ids.length;
    const greek_graph_height = (greeks_graphs_height - (num_greeks_to_display - 1) * window.margin.greeks_vspacer) / num_greeks_to_display;


    for (let index = 0; index < num_greeks_to_display; index++) {
        let greek_index = cfg.config.graph.greeks.ids[index];
        const min_greek = d3.min(greeks_data[greek_index], d => d.y);
        const max_greek = d3.max(greeks_data[greek_index], d => d.y);
        const padding_greek = (max_greek - min_greek) * 0.1;
        const scale_greek = d3.scaleLinear()
            .domain([min_greek - padding_greek, max_greek + padding_greek])
            .range([greek_graph_height, 0]);
        let greek_graph = greeks_graph_area.append("g").attr("class", "greek_graph");
        let top_position = window.margin.top + p_and_l_graph_height + window.margin.vspacer;
        top_position += index * (greek_graph_height + window.margin.greeks_vspacer);
        greek_graph.attr("transform", `translate(${window.margin.left}, ${top_position})`);
        greek_graph.attr("width", window.width - window.margin.left);
        greek_graph.append("g").call(d3.axisLeft(scale_greek).ticks(5));
        greek_graph.append("g").attr("transform", `translate(0,${scale_greek(0)})`).call(d3.axisBottom(x_scale)).selectAll(".tick text").remove();

        greek_graph.append("text")
            .attr("transform", "rotate(-90)")  // Rotate text for Y-axis
            .attr("x", -greek_graph_height / 2)            // Center the label
            .attr("y", -window.margin.left + 15)      // Position left of Y-axis
            .attr("dy", "1em")                 // Fine-tune vertical alignment
            .style("text-anchor", "middle")    // Center alignment
            .text(cfg.config.graph.greeks.labels[greek_index]);        // Change this to your label

        draw_greek(greek_graph, scale_greek, greeks_data[greek_index]);

    }

    add_strike_lines(svg, cfg);
    create_strike_buttons(p_and_l_graph, cfg);
    create_underlying_current_price_buttons(svg, cfg);
    add_crosshair(svg, cfg, window, x_scale, scale_p_and_l);
}

use_local = await is_mode_local(); // Auto-detect local/remote mode
console.log("use_local=", use_local);
setup_volatility_type();
await draw_graph();
display_local_status();
setup_combos_list();
setup_days_left_slider();
setup_volatility_sliders();
document.getElementById('ivCheckbox').addEventListener('change', setup_volatility_sliders);
