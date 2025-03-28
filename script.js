import { computeOptionPrice } from './functions.js';
import { is_mode_local, load_local_price, load_local_config, update_remote_config, fetch_configuration, fetch_price } from './async.js';
import { Environment, ComboTemplater } from './configuration.js';
import { VerticalCursor, HorizontalCursor, TextRect, Line } from './cursor.js';
import { hestonMonteCarlo } from './heston.js';

  
let volatility_is_per_leg;
let auto_save=true;
let simulated_underlying_price_changed=false;
let underlying_current_price = 0;
let svg;
let scale_p_and_l;
let combo_changed = false;
let pl_at_expiration_cursor;
let pl_at_initial_cursor;
let pl_at_sim_cursor;
let price_cursor;

function reloadWithParam(key, value) {
    const url = new URL(window.location);
    url.searchParams.set(key, value); // Add or update the parameter
    window.location.href = url.toString(); // Navigate to the new URL
}

async function setup_global_env(e) {
    if (!e) {
        e = new Environment(use_local ? await load_local_config() : await fetch_configuration());
    }

    return e
}

function display_checkbox_for_volatility_mode() {

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
        display_volatility_sliders();
    });
    volatility_is_per_leg = document.getElementById('ivCheckbox').checked;
}

function display_volatility_sliders() {

    volatility_is_per_leg = document.getElementById('ivCheckbox').checked;
    const sliders_container = document.getElementById('sliders_container');

    // Clear existing sliders
    sliders_container.innerHTML = '';

    if (volatility_is_per_leg) {

        // Multiple sliders for each leg
        env.get_combo_params().legs.forEach((option, index) => {
            const slider_container = document.createElement('div');
            const label = document.createElement('label');
            label.textContent = `${option.type} ${option.strike} IV`;

            const slider = document.createElement('input');
            slider.type = env.get_iv_slider_type();
            slider.style.width = env.get_iv_slider_width();
            slider.min = 100*env.get_iv_slider_min_val();
            slider.max = 100*env.get_iv_slider_max_val();
            slider.step = 100*env.get_iv_slider_step();
            slider.value = 100*(env.get_use_real_values() ?
                option.trade_volatility : option.sim_volatility);

            // Display the IV value next to the slider
            const value_display = document.createElement('span');
            value_display.textContent = ` ${slider.value} %`;
            slider.addEventListener('input', () => {
                value_display.textContent = ` ${slider.value} %`;
                if (env.get_use_real_values()) {
                    option.trade_volatility = parseFloat(slider.value/100.0);
                } else {
                    option.sim_volatility = parseFloat(slider.value/100.0);
                }
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
        const slider = document.createElement('input');
        slider.type = env.get_iv_slider_type();
        slider.style.width = env.get_iv_slider_width();
        slider.min = 100*env.get_iv_slider_min_val();
        slider.max = 100*env.get_iv_slider_max_val();
        slider.step = 100*env.get_iv_slider_step();
        slider.value = 100*env.get_mean_volatility_of_combo(env.get_use_real_values());

        // Display the IV value next to the slider
        const value_display = document.createElement('span');
        value_display.textContent = ` ${slider.value} %`;
        slider.addEventListener('input', () => {
            value_display.textContent = ` ${slider.value} %`;
            env.set_mean_volatility_of_combo(env.get_use_real_values(), parseFloat(slider.value/100.0));
            draw_graph();
        });

        slider_container.appendChild(label);
        slider_container.appendChild(slider);
        slider_container.appendChild(value_display);

        sliders_container.appendChild(slider_container);
    }
    document.getElementById('ivCheckbox').addEventListener('change', display_volatility_sliders);

}

function display_local_status() {
    // Display a red or green dot depending on whether we are using local data
    // red for local
    // green for remote

    let c = d3.select("#local-status-container");
    c.selectAll("*").remove();
    let s = c.append("svg")
    s.attr("width", 220)    // Adjust size as needed
        .attr("height", 20)
        .append("circle")
        .attr("cx", 10)        // X position of the center
        .attr("cy", 10)        // Y position of the center
        .attr("r", 5)         // Radius of the circle
        .attr("class", use_local ? "red-dot" : "green-dot")

    s.append("text")
        .attr("fill", use_local ? "red" : "green")
        .attr("color", "white")
        .attr("text-anchor", "left")
        .attr("dy", "1em")
        .style("font-size", "12px")
        .attr("font-family", "Menlo, monospace")  // Set font to Menlo
        .style("font-weight", "bold")
        .attr("x", 20).attr("y", 2)
        .text(use_local ? "Local data" : "Remote data" );


        
        c = d3.select("#change-status-container");
        c.selectAll("*").remove();
        s = c.append("svg")
        s.attr("width", 200)    // Adjust size as needed
            .attr("height", 20);
        s.append("circle")
            .attr("cx", 10)        // X position of the center
            .attr("cy", 10)        // Y position of the center
            .attr("r", 5)         // Radius of the circle
            .attr("class", combo_changed ? "blinking-red-circle" : "gray-dot");
    
        s.append("text")
            .attr("fill", combo_changed ? "red" : "gray")
            .attr("color", "white")
            .attr("text-anchor", "left")
            .attr("dy", "1em")
            .style("font-size", "12px")
            .attr("font-family", "Menlo, monospace")  // Set font to Menlo
            .style("font-weight", "bold")
            .attr("x", 20).attr("y", 2)
            .text(combo_changed ? "Modified combo" : "");
    

            
        
            c = d3.select("#underlying-status-container");
            c.selectAll("*").remove();
            s = c.append("svg")
            s.attr("width", 220)    // Adjust size as needed
                .attr("height", 20);
            s.append("circle")
                .attr("cx", 10)        // X position of the center
                .attr("cy", 10)        // Y position of the center
                .attr("r", 5)         // Radius of the circle
                .attr("class", simulated_underlying_price_changed ? "blinking-orange-circle" : "gray-dot");
        
            s.append("text")
                .attr("fill", simulated_underlying_price_changed ? "orange" : "gray")
                .attr("color", "white")
                .attr("text-anchor", "left")
                .attr("dy", "1em")
                .style("font-size", "12px")
                .attr("font-family", "Menlo, monospace")  // Set font to Menlo
                .style("font-weight", "bold")
                .attr("x", 20).attr("y", 2)
                .text(simulated_underlying_price_changed ? "Simulated underliying price" : "");
        
        



    d3.select("#auto-save-checkbox-container").selectAll("*").remove();
    d3.select("#auto-save-checkbox-container")
        .append("input")
        .attr("type", "checkbox")
        .attr("id", "autosaveCheckbox")
        .attr("checked", auto_save ? "checked" : null)
        .attr("name", "autosaveCheckbox");

    // Append a label for the checkbox
    d3.select("#auto-save-checkbox-container")
        .append("label")
        .attr("for", "autosaveCheckbox")
        .text("Auto save");

    // Event listener to detect changes
    d3.select("#autosaveCheckbox").on("change", function () {
        auto_save = document.getElementById('autosaveCheckbox').checked;
        console.log("Auto-save is now", auto_save);
    });

}

function display_days_left_slider() {
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
    slider.type = env.config.window.days_left.type;
    slider.style.width = env.config.window.days_left.width;
    slider.min = env.config.window.days_left.min;
    slider.max = env.get_time_to_expiry_of_combo();
    slider.step = env.config.window.days_left.step;
    slider.value = env.get_time_for_simulation_of_combo();
    slider.style.transform = 'scaleX(-1)'; // Mirror effect

    // Display the time value next to the slider
    const value_display = document.createElement('span');
    value_display.textContent = ` ${slider.value}/${env.get_time_to_expiry_of_combo()}`;
    slider.addEventListener('input', () => {
        value_display.textContent = ` ${slider.value}/${env.get_time_to_expiry_of_combo()}`;
        env.set_time_for_simulation(parseInt(slider.value));
        draw_graph();
    });

    slider_container.appendChild(label);
    slider_container.appendChild(slider);
    slider_container.appendChild(value_display);

    time_slider_container.appendChild(slider_container);
}

function display_combos_list() {

    const titleContainer = d3.select("#title_container");
    titleContainer.insert("label", "#comboName")
        .text(env.get_combo_params().name);

    const comboContainer = d3.select("#combo_container");
    const dropdown = comboContainer.append("select")
        .attr("id", "comboBox")
        .on("change", function () {
            console.log("Selected:", this.value);
            env.config.config.combo = this.value;

            if (!use_local) {
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
        .text("Choose combo: ");

}

function compute_p_and_l_data(use_legs_volatility, num_days_left) {

    let p_and_l_data = [];
    for (let price = env.get_simul_min_price_of_combo(); price <= env.get_simul_max_price_of_combo(); price += env.get_simul_step_price_of_combo()) {
        let p_and_l_profile = 0;
        env.get_combo_params().legs.forEach(option => {
            let ov = env.get_use_real_values() ?
                option.trade_volatility : option.sim_volatility;
            let v = use_legs_volatility ? ov : env.get_mean_volatility_of_combo(env.get_use_real_values());
            //let option_price = computeOptionPrice(option.strike, option.strike, env.get_interest_rate_of_combo(), v, env.get_simulation_time_to_expiry() + option.expiration_offset, option.type);
            let option_price = computeOptionPrice(underlying_current_price , option.strike, env.get_interest_rate_of_combo(), v, env.get_simulation_time_to_expiry() + option.expiration_offset, option.type);
            let premium = option_price[0];
            let greeks = computeOptionPrice(price, option.strike, env.get_interest_rate_of_combo(), v, num_days_left + option.expiration_offset, option.type);
            p_and_l_profile = p_and_l_profile + option.qty * 100 * (greeks[0] - premium);
        });
        p_and_l_data.push({ x: price, y: p_and_l_profile });
    }
    return p_and_l_data
}

function compute_greeks_data(use_legs_volatility) {

    const num_greeks = env.get_computation_num_greeks();
    let greeks_data = Array.from({ length: num_greeks }, () => []);

    for (let price = env.get_simul_min_price_of_combo(); price <= env.get_simul_max_price_of_combo(); price += env.get_simul_step_price_of_combo()) {

        let greek_index = 0;
        for (greek_index = 0; greek_index < num_greeks; greek_index++) {
            let greek = 0;
            env.get_combo_params().legs.forEach(option => {
                let ov = env.get_use_real_values() ?
                    option.trade_volatility : option.sim_volatility;
                let v = use_legs_volatility ? ov : env.get_mean_volatility_of_combo(env.get_use_real_values());
                let greeks = computeOptionPrice(price, option.strike, env.get_interest_rate_of_combo(), v, env.get_time_for_simulation_of_combo() + option.expiration_offset, option.type);
                greek = greek + option.qty * greeks[greek_index] * env.config.computation.greek_scaler[greek_index];
            });
            greeks_data[greek_index].push({ x: price, y: greek });
        }
    }
    return greeks_data;
}

function add_grid(graph, y_scale) {

    const x_axis_grid = d3.axisBottom(env.get_x_scale())
        .tickSize(-env.get_window_height())
        .tickFormat("");  // Hide tick labels

    const y_axis_grid = d3.axisLeft(y_scale)
        .tickSize(-env.get_window_width() + env.get_window_left_margin() + env.get_window_right_margin())
        .tickFormat("");

    // Add X-axis grid
    graph.append("g")
        .attr("class", "x-grid")
        .attr("transform", `translate(0, ${env.get_window_height()})`)
        .call(x_axis_grid)
        .selectAll("line")
        .attr("stroke", "lightgray")
        .attr("stroke-opacity", 0.7)
        .attr("stroke-dasharray", "4,4");

    // Add Y-axis grid
    graph.append("g")
        .attr("class", "y-grid")
        .call(y_axis_grid)
        .selectAll("line")
        .attr("stroke", "lightgray")
        .attr("stroke-opacity", 0.7)
        .attr("stroke-dasharray", "4,4");
}

function find_zero_crossings(data) {
    let crossings = [];

    for (let i = 1; i < data.length; i++) {
        let y1 = data[i - 1].y;
        let y2 = data[i].y;

        if (y1 * y2 < 0) { // Sign change detected
            let x1 = data[i - 1].x;
            let x2 = data[i].x;

            // Linear interpolation to estimate x where y = 0
            let xCross = x1 - y1 * (x2 - x1) / (y2 - y1);
            crossings.push(xCross);
        }
    }

    return crossings;
}

function draw_one_sigma_area(svg, underlying_current_price, p_and_l_graph_height) {
    let sigma = underlying_current_price * env.get_mean_volatility_of_combo(env.get_use_real_values()) * Math.sqrt(env.get_time_for_simulation_of_combo() / 365);
    let sigma_text = `σ = ${sigma.toFixed(0)}`;
    let price_less_sigma = underlying_current_price - sigma;
    let price_plus_sigma = underlying_current_price + sigma;
    let price_less_sigma_text = `${price_less_sigma.toFixed(0)}`;
    let price_plus_sigma_text = `${price_plus_sigma.toFixed(0)}`;

    svg.append("text")
        .attr("x", env.get_window_left_margin() + env.get_x_scale()(underlying_current_price) - 30)
        .attr("y", env.get_window_top_margin() + 20)
        .attr("font-family", "Menlo, monospace")  // Set font to Menlo
        .attr("fill", "black")
        .text(sigma_text);
    svg.append("text")
        .attr("x", env.get_window_left_margin() + env.get_x_scale()(underlying_current_price - sigma) - 15)
        .attr("y", env.get_window_top_margin() + 15)
        .attr("font-family", "Menlo, monospace")  // Set font to Menlo
        .attr("fill", "black")
        .text(`-1σ`);
    svg.append("text")
        .attr("x", env.get_window_left_margin() + env.get_x_scale()(underlying_current_price - sigma) - 15)
        .attr("y", env.get_window_top_margin() + 30)
        .attr("font-family", "Menlo, monospace")  // Set font to Menlo
        .attr("fill", "black")
        .text(price_less_sigma_text);
    svg.append("text")
        .attr("x", env.get_window_left_margin() + env.get_x_scale()(underlying_current_price + sigma) - 15)
        .attr("y", env.get_window_top_margin() + 15)
        .attr("font-family", "Menlo, monospace")  // Set font to Menlo
        .attr("fill", "black")
        .text(`+1σ`);
    svg.append("text")
        .attr("x", env.get_window_left_margin() + env.get_x_scale()(underlying_current_price + sigma) - 15)
        .attr("y", env.get_window_top_margin() + 30)
        .attr("font-family", "Menlo, monospace")  // Set font to Menlo
        .attr("fill", "black")
        .text(price_plus_sigma_text);

    svg.append("rect")
        .attr("x", env.get_window_left_margin() + env.get_x_scale()(underlying_current_price - sigma))
        .attr("y", env.get_window_top_margin())
        .attr("width", env.get_x_scale()(underlying_current_price + sigma) - env.get_x_scale()(underlying_current_price - sigma))
        .attr("height", p_and_l_graph_height)
        .attr("font-family", "Menlo, monospace")  // Set font to Menlo
        .attr("fill", "blue")
        .attr("opacity", 0.07);
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
        .x(d => env.get_x_scale()(d.x))
        .y0(scale(0))  // Fill down to y=0
        .y1(d => Math.max(scale(d.y), scale(0))) // Only fill above zero
        .curve(d3.curveBasis); // Optional smoothing

    // Define the area generator for negative values (below zero)
    const area_above = d3.area()
        .x(d => env.get_x_scale()(d.x))
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
            .x(d => env.get_x_scale()(d.x))
            .y(d => scale(d.y))
            .curve(d3.curveBasis) // Optional smoothing
        );

}

function add_y_axis_label(graph, graph_height, label) {
    graph.append("text")
        .attr("transform", "rotate(-90)")  // Rotate text for Y-axis
        .attr("x", -graph_height / 2)            // Center the label
        .attr("y", -env.get_window_left_margin() + 15)      // Position left of Y-axis
        .attr("dy", "1em")                 // Fine-tune vertical alignment
        .attr("font-family", "Menlo, monospace")  // Set font to Menlo
        .style("text-anchor", "middle")    // Center alignment
        .text(label);        // Change this to your label
}

function display_greeks_graph(greeks_graph_area, greeks_graphs_height, p_and_l_graph_height) {
    let num_greeks_to_display = env.config.graph.greeks.ids.length;
    const greek_graph_height = (greeks_graphs_height - (num_greeks_to_display - 1) * env.get_window_greeks_vspacer_margin()) / num_greeks_to_display;


    for (let index = 0; index < num_greeks_to_display; index++) {
        let greek_index = env.config.graph.greeks.ids[index];
        const yExtent = d3.extent(env.get_greeks_data()[greek_index], d => d.y);
        const min_greek = Math.min(0, yExtent[0]);  // Ensure axis is visible
        const max_greek = Math.max(0, yExtent[1]);
        const padding_greek = (max_greek - min_greek) * 0.1;
        const scale_greek = d3.scaleLinear()
            .domain([min_greek - padding_greek, max_greek + padding_greek])
            .range([greek_graph_height, 0]);
        let greek_graph = greeks_graph_area.append("g").attr("class", "greek_graph");
        let top_position = env.get_window_top_margin() + p_and_l_graph_height + env.get_window_vspacer_margin();
        top_position += index * (greek_graph_height + env.get_window_greeks_vspacer_margin());
        greek_graph.attr("transform", `translate(${env.get_window_left_margin()}, ${top_position})`);
        greek_graph.attr("width", env.get_window_width() - env.get_window_left_margin());
        greek_graph.append("g").call(d3.axisLeft(scale_greek).ticks(5));
        greek_graph.append("g").attr("transform", `translate(0,${scale_greek(0)})`).call(d3.axisBottom(env.get_x_scale())).selectAll(".tick text").remove();

        greek_graph.append("text")
            .attr("transform", "rotate(-90)")  // Rotate text for Y-axis
            .attr("x", -greek_graph_height / 2)            // Center the label
            .attr("y", -env.get_window_left_margin() + 15)      // Position left of Y-axis
            .attr("dy", "1em")                 // Fine-tune vertical alignment
            .attr("font-family", "Menlo, monospace")  // Set font to Menlo
            .style("text-anchor", "middle")    // Center alignment
            .text(env.config.graph.greeks.labels[greek_index]);        // Change this to your label

        draw_greek(greek_graph, scale_greek, env.get_greeks_data()[greek_index]);

    }
}

function display_strike_buttons() {
    //
    // Add vertical lines for each strike on the full height graph
    //
    // Parameters:
    // None.
    //
    // Returns:
    // Nothing.
    //
    let index = 0;
    env.get_combo_params().legs.forEach(option => {

        index++;

        let floatingWindow;
        if (d3.select("#floating-window" + index).empty()) {
            floatingWindow = d3.select("body")
                .append("div")
                .attr("class", "floating-window")
                .attr("id", "floating-window" + index)
                .attr("index", index);
        }
        else {
            floatingWindow = d3.select("#floating-window" + index);
        }

        const x_position = env.get_x_scale()(option.strike);
        let l = new Line(svg, env);
        l.set_position(x_position, -14, x_position, env.get_window_height());
        l.set_color(option.type === "call" ? "red" : "green");

        let label = new TextRect(svg, "strike", option.type === "call" ? "red" : "green");
        label.set_width(80);
        label.set_rect_position(
            env.get_window_left_margin() + env.get_x_scale()(option.strike) - label.get_width() / 2,
            env.get_button_default_text_vpos() - 15);
        label.set_text_position(
            env.get_window_left_margin() + env.get_x_scale()(option.strike),
            env.get_button_default_text_vpos() - 14);
        let ot = option.type === "call" ? "C" : "P";
        label.set_text(` ${option.qty}x ${ot} ${option.strike.toFixed(1)}`);
        label.set_text_color("white");
        label.show();
        //strike_label.text_element.attr("class", "draggable-button")

        label.text_element
            .call(d3.drag()
                .on("drag", function (event) {
                    let newX = Math.max(0, Math.min(env.get_window_width(), (event.x - env.get_window_left_margin())));
                    d3.select(this).attr("x", newX - 15);
                    let newStrike = env.get_x_scale().invert(newX);
                    //option.strike = Math.round(newStrike);
                    option.strike = (newStrike);
                    combo_changed = true;
                    draw_graph();
                })
            )
            .on("contextmenu", function (event) {
                event.preventDefault(); // Prevent default right-click menu

                // Clear window content and position it
                floatingWindow.html("")
                    .style("display", "block")
                    .style("left", `${event.pageX}px`)
                    .style("top", `${event.pageY}px`);

                // read the index
                let current_index = parseInt(floatingWindow.attr("index"));
                let qty_label;

                // Create a div container for the buttons (side by side)
                let buttonContainer = floatingWindow.append("div").attr("class", "button-container");

                // Add "-" button
                buttonContainer.append("button")
                    .text("-")
                    .on("click", function () {
                        //alert("Minus button clicked!");
                        let option = env.get_combo_params().legs[current_index - 1];
                        option.qty -= 1;
                        combo_changed = true;
                        qty_label.text("Qty " + option.qty); // Update title text
                        draw_graph();
                    });

                qty_label = buttonContainer.append("text").text("Qty " + option.qty);

                // Add "+" button
                buttonContainer.append("button")
                    .text("+")
                    .on("click", function () {
                        //alert("Plus button clicked!");
                        let option = env.get_combo_params().legs[current_index - 1];
                        option.qty += 1;
                        combo_changed = true;
                        qty_label.text("Qty " + option.qty); // Update title text
                        draw_graph();
                    });



                let exp_offset_label;

                // Create a div container for the buttons (side by side)
                let buttonContainer2 = floatingWindow.append("div").attr("class", "button-container");
                // Add "-" button
                buttonContainer2.append("button")
                    .text("-")
                    .on("click", function () {
                        //alert("Minus button clicked!");
                        let option = env.get_combo_params().legs[current_index - 1];
                        option.expiration_offset -= 1;
                        combo_changed = true;
                        exp_offset_label.text(option.expiration_offset + "d"); // Update title text
                        draw_graph();
                    });


                exp_offset_label = buttonContainer2.append("text").text(option.expiration_offset + "d");


                // Add "+" button
                buttonContainer2.append("button")
                    .text("+")
                    .on("click", function () {
                        //alert("Plus button clicked!");
                        let option = env.get_combo_params().legs[current_index - 1];
                        option.expiration_offset += 1;
                        combo_changed = true;
                        exp_offset_label.text(option.expiration_offset + "d"); // Update title text
                        draw_graph();
                    });




                d3.select("body").on("click", (event) => {
                    if (!floatingWindow.node().contains(event.target) && event.target.id !== "myButton") {
                        floatingWindow.style("display", "none");
                    }
                });

            });

    });
}

function display_current_price(svg) {



    const x_position = env.get_x_scale()(underlying_current_price);
    let l = new Line(svg, env);
    l.set_position(x_position, -14, x_position, env.get_window_height());
    l.set_color("#0055FF");

    let label = new TextRect(svg, "current_price", "#0055FF");
    label.set_width(80);
    label.set_rect_position(
        env.get_window_left_margin() + env.get_x_scale()(underlying_current_price) - label.get_width() / 2,
        env.get_button_default_text_vpos() + 6);
    label.set_text_position(
        env.get_window_left_margin() + env.get_x_scale()(underlying_current_price),
        env.get_button_default_text_vpos() + 8);
    label.set_text(`${underlying_current_price.toFixed(1)}`);
    label.set_text_color("white");
    label.show();

    label.text_element
        .call(d3.drag()
            .on("drag", function (event) {
                simulated_underlying_price_changed=true;
                let newX = Math.max(0, Math.min(env.get_window_width(), (event.x - env.get_window_left_margin())));
                d3.select(this).attr("x", newX - 15);
                let newStrike = env.get_x_scale().invert(newX);
                //option.strike = Math.round(newStrike);
                underlying_current_price = (newStrike);
                draw_graph();
            })
        )
        .on("contextmenu", function (event) {
            event.preventDefault(); // Prevent default right-click menu
            underlying_current_price = env.get_underlying_current_price().price;
            simulated_underlying_price_changed=false;

            draw_graph();
        });


}

function svg_cleanup(svg) {
    if (!svg) {
        svg = d3.select("#graph-container")
            .append("svg")
            .attr("width", env.get_window_width())
            .attr("height", env.get_window_height());
    }
    svg.selectAll("*").remove();
    return svg;
}

function add_crosshair() {

    const crosshair = svg.append("g");


    // Add vertical line
    crosshair.append("line")
        .attr("class", "crosshair-line")
        .attr("id", "crosshair-x")
        .attr("y1", env.get_window_top_margin())
        .attr("y2", env.get_window_height() - env.get_window_bottom_margin())
        .attr("stroke", "green")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,4");

    // Add horizontal line
    crosshair.append("line")
        .attr("class", "crosshair-line")
        .attr("id", "crosshair-y")
        .attr("x1", env.get_window_left_margin())
        .attr("x2", env.get_window_width() - env.get_window_right_margin())
        .attr("stroke", "green")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,4");

    pl_at_expiration_cursor = new VerticalCursor(svg, env.get_pl_at_exp_data(), scale_p_and_l, "pl-exp", "black");
    pl_at_initial_cursor = new VerticalCursor(svg, env.get_pl_at_init_data(), scale_p_and_l, "pl-init", "orange");
    pl_at_sim_cursor = new VerticalCursor(svg, env.get_pl_at_sim_data(), scale_p_and_l, "pl-sim", "green");
    price_cursor = new HorizontalCursor(svg, env.get_pl_at_sim_data(), scale_p_and_l, "price", "blue");

    pl_at_expiration_cursor.set_text_color("white");
    pl_at_initial_cursor.set_text_color("white");
    pl_at_sim_cursor.set_text_color("white");
    price_cursor.set_text_color("white");

    // add event listener for mouse out event
    svg.on("mouseleave", function () {
        pl_at_expiration_cursor.hide()
        pl_at_initial_cursor.hide()
        pl_at_sim_cursor.hide()
        price_cursor.hide()
    });

    svg.on("mousemove", function (event) {
        const [x, y] = d3.pointer(event, this); // Get mouse coordinates
        if (y < env.get_window_top_margin() || y > env.get_window_height() - env.get_window_bottom_margin()) {
            crosshair.style("visibility", "hidden");
            return;
        }
        if (x < env.get_window_left_margin() || x > env.get_window_width() - env.get_window_right_margin()) {
            crosshair.style("visibility", "hidden");
            return;
        }
        // Show crosshair
        crosshair.style("visibility", "visible");
        pl_at_expiration_cursor.show()
        pl_at_initial_cursor.show()
        pl_at_sim_cursor.show()
        price_cursor.show()

        // Update position of the crosshair lines
        crosshair.select("#crosshair-x")
            .attr("x1", x)
            .attr("x2", x);

        crosshair.select("#crosshair-y")
            .attr("y1", y)
            .attr("y2", y);


        const price = env.get_x_scale().invert(x - env.get_window_left_margin());
        pl_at_expiration_cursor.update(env, price);
        pl_at_initial_cursor.update(env, price);
        pl_at_sim_cursor.update(env, price);
        price_cursor.update(env, x);

    });

}

function draw_p_and_l(graph, scale) {

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
        .x(d => env.get_x_scale()(d.x))
        .y0(scale(0))  // Fill down to y=0
        .y1(d => Math.max(scale(d.y), scale(0))) // Only fill above zero
        .curve(d3.curveBasis); // Optional smoothing

    // Define the area generator for negative values (below zero)
    const area_above = d3.area()
        .x(d => env.get_x_scale()(d.x))
        .y0(scale(0))  // Fill up to y=0
        .y1(d => Math.min(scale(d.y), scale(0))) // Only fill below zero
        .curve(d3.curveBasis);

    // Append the positive (green) gradient area
    graph.append("path")
        .datum(env.get_pl_at_sim_data())
        .attr("fill", "url(#greenGradient)") // Apply green gradient
        .attr("opacity", 0.6)
        .attr("d", area_above);

    // Append the negative (red) gradient area
    graph.append("path")
        .datum(env.get_pl_at_sim_data())
        .attr("fill", "url(#redGradient)") // Apply red gradient
        .attr("opacity", 0.6)
        .attr("d", area_below);

    // Append the line on top
    graph.append("path")
        .datum(env.get_pl_at_exp_data())
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .attr("d", d3.line()
            .x(d => env.get_x_scale()(d.x))
            .y(d => scale(d.y))
            .curve(d3.curveBasis) // Optional smoothing
        );


    let plData = env.get_pl_at_exp_data();  // Get P/L data
    let zeroCrossings = find_zero_crossings(plData); // Find x-values where P/L crosses zero

    // Draw vertical lines and label with price value at zero crossings X position
    zeroCrossings.forEach(x => {
        graph.append("line")
            .attr("x1", env.get_x_scale()(x))
            .attr("x2", env.get_x_scale()(x))
            .attr("y1", scale.range()[0])  // Bottom of graph
            .attr("y2", scale.range()[1])          // y = 0 line
            .attr("stroke", "orange")
            .attr("stroke-dasharray", "4,4")  // Dashed line
            .attr("stroke-width", 1);

        let zero_crossing_label = new TextRect(graph, "price", "orange");
        zero_crossing_label.set_rect_position(env.get_x_scale()(x) - zero_crossing_label.get_width() / 2, scale.range()[0]);
        zero_crossing_label.set_text_position(env.get_x_scale()(x), scale.range()[0]);
        zero_crossing_label.set_text(x.toFixed(0));
        zero_crossing_label.set_text_color("black");
        zero_crossing_label.show();
    });



    // Append the line on top
    graph.append("path")
        .datum(env.get_pl_at_sim_data())
        .attr("fill", "none")
        .attr("stroke", "green")
        .attr("stroke-width", 2)
        .attr("d", d3.line()
            .x(d => env.get_x_scale()(d.x))
            .y(d => scale(d.y))
            .curve(d3.curveBasis) // Optional smoothing
        );

    // Append the line on top
    graph.append("path")
        .datum(env.get_pl_at_init_data())
        .attr("fill", "none")
        .attr("stroke", "orange")
        .attr("stroke-width", 2)
        .attr("d", d3.line()
            .x(d => env.get_x_scale()(d.x))
            .y(d => scale(d.y))
            .curve(d3.curveBasis) // Optional smoothing
        );

}

function display_p_and_l_graph(p_and_l_graph_area, p_and_l_graph_height) {

    // P&L graph
    const min_p_and_l = env.get_min_of_dataset();
    const max_p_and_l = env.get_max_of_dataset();
    const padding_p_and_l = (max_p_and_l - min_p_and_l) * 0.1;
    scale_p_and_l = d3.scaleLinear()
        .domain([min_p_and_l - padding_p_and_l, max_p_and_l + padding_p_and_l])
        .range([p_and_l_graph_height, 0]);

    let p_and_l_graph = p_and_l_graph_area.append("g").attr("class", "p_and_l_graph");
    p_and_l_graph.attr("transform", `translate(${env.get_window_left_margin()}, ${env.get_window_top_margin()})`);
    p_and_l_graph.attr("width", env.get_window_width() - env.get_window_left_margin());
    p_and_l_graph.append("g").call(d3.axisLeft(scale_p_and_l));
    p_and_l_graph.append("g").attr("transform", `translate(0,${scale_p_and_l(0)})`).call(d3.axisBottom(env.get_x_scale())).selectAll(".tick text").remove();
    p_and_l_graph.attr("clip-path", "url(#clipBox)");

    draw_p_and_l(p_and_l_graph, scale_p_and_l);
    add_grid(p_and_l_graph, scale_p_and_l)
    add_y_axis_label(p_and_l_graph, p_and_l_graph_height, "Profit / Loss ($)");
    draw_one_sigma_area(svg, underlying_current_price, p_and_l_graph_height);
}

function compute_data_to_display() {

    env.set_pl_at_exp_data(compute_p_and_l_data(volatility_is_per_leg, 0));
    env.set_pl_at_init_data(compute_p_and_l_data(volatility_is_per_leg, env.get_time_to_expiry_of_combo()));
    env.set_pl_at_sim_data(compute_p_and_l_data(volatility_is_per_leg, env.get_time_for_simulation_of_combo()));

    env.set_greeks_data(compute_greeks_data(volatility_is_per_leg));
}

function draw_graph() {

    svg = svg_cleanup(svg);

    // X scale for the price axis ; set at the bottom of the graph window
    const graph_width = env.get_window_width() - env.get_window_left_margin() - env.get_window_right_margin();
    env.set_x_scale(d3.scaleLinear().domain([env.get_simul_min_price_of_combo(), env.get_simul_max_price_of_combo()]).range([0, graph_width]));

    // add the x axis with price values
    let y_offset = env.get_window_top_margin() + env.get_window_height() + env.get_window_vspacer_margin();
    y_offset = env.get_window_height() - env.get_window_vspacer_price_axis();
    svg.append("g").attr("transform", `translate(${env.get_window_left_margin()},${y_offset})`).call(d3.axisBottom(env.get_x_scale()));

    // P&L and Greeks graph areas
    const p_and_l_graph_height = env.get_window_p_and_l_ratio() * (env.get_window_height() - env.get_window_top_margin() - env.get_window_bottom_margin() - env.get_window_vspacer_margin());
    const greeks_graphs_height = env.get_window_height() - p_and_l_graph_height - env.get_window_top_margin() - env.get_window_bottom_margin() - env.get_window_vspacer_margin();

    let p_and_l_graph_area = svg
        .append("g")
        .attr("width", env.get_window_width())
        .attr("height", p_and_l_graph_height)

    let greeks_graph_area = svg
        .append("g")
        .attr("width", env.get_window_width())
        .attr("height", greeks_graphs_height);

    // get the data
    compute_data_to_display()

    // display the data
    display_p_and_l_graph(p_and_l_graph_area, p_and_l_graph_height);
    display_greeks_graph(greeks_graph_area, greeks_graphs_height, p_and_l_graph_height);
    display_strike_buttons();
    display_current_price(svg);
    display_local_status();

    add_crosshair();
}

let use_local = false;
let env;
let ticker;
let price;

use_local = await is_mode_local();
use_local = true;
//console.log('State: use_local='+use_local);
env = await setup_global_env(env);
console.log('State: env=', env);
ticker = env.get_ticker_of_combo();
//console.log('State: ticker=', ticker);
price = use_local ? await load_local_price(ticker) : await fetch_price(ticker);
//console.log('State: price=', price);
env.set_underlying_current_price(price);
underlying_current_price = env.get_underlying_current_price().price;
console.log('State: underlying_current_price=', underlying_current_price);
//console.log('State: env=', env);

display_local_status();

display_checkbox_for_volatility_mode();
display_volatility_sliders();
display_days_left_slider();
display_combos_list();
draw_graph();





let o = computeOptionPrice(220, 225, 0, 0.15, 10, 'call');
console.log('Option price:', o);
