import { computeOptionPrice } from './functions.js';
import { is_mode_local, load_local_price, load_local_config, update_remote_config, fetch_configuration, fetch_price } from './async.js';
import { Environment, ComboTemplater } from './configuration.js';
import { VerticalCursor, HorizontalCursor, TextRect } from './cursor.js';

import { days_difference, days_difference_with_today } from './functions.js';

let use_local = false;
let underlying;
let ticker;
let env;
let combo_tpl;
let svg;

let use_legs_volatility_checkbox;
let display_mode_checkbox;
let scale_p_and_l;

let pl_at_expiration_cursor;
let pl_at_initial_cursor;
let pl_at_sim_cursor;
let price_cursor;
let test_cursor;

let underlying_current_price_drag=false;
let underlying_current_price_display_value=0;
let x_zoom_factor = 1;

function add_strike_lines() {
    //
    // Add vertical lines for each strike on the full height graph
    //
    // Parameters:
    // None.
    //
    // Returns:
    // Nothing.
    //
    env.get_combo_params().legs.forEach(option => {

        const strike_value = env.get_x_scale()(option.strike);

        svg.append("line")
            .attr("x1", strike_value)
            .attr("y1", 0)
            .attr("x2", strike_value)
            .attr("y2", env.get_full_graph_height())
            .attr("stroke", "red")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "5,5")
            .attr("transform", `translate(${env.get_window_left_margin()},${env.get_window_top_margin()})`);

    });
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

function create_strike_buttons(graph) {

    graph.selectAll(".strike-button").remove();
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


        svg.append("rect")
            .attr("width", env.get_button_default_width())
            .attr("height", env.get_button_default_height())
            .attr("fill", option.type === "call" ? "red" : "green")
            .attr("rx", 2)
            .attr("ry", 2)
            .attr("x", env.get_window_left_margin() + env.get_x_scale()(option.strike) - env.get_button_default_width() / 2)
            .attr("y", 0)
            .attr("stroke", "black")
            .attr("stroke-width", 2)


        let ot = option.type === "call" ? "C" : "P";
        svg.append("text")
            .attr("x", env.get_window_left_margin() + env.get_x_scale()(option.strike) + 4 - env.get_button_default_width() / 2)
            .attr("y", env.get_button_default_text_vpos())
            .attr("fill", "white")
            .attr("class", "draggable-button")
            .attr("font-family", "Menlo, monospace")  // Set font to Menlo
            .attr("font-size", "12px")
            .attr("cursor", "pointer")
            .text(` ${option.qty}x ${ot} ${option.strike}`)
            .call(d3.drag()
                .on("drag", function (event) {
                    let newX = Math.max(0, Math.min(env.get_window_width(), (event.x - env.get_window_left_margin())));
                    d3.select(this).attr("x", newX - 15);
                    let newStrike = env.get_x_scale().invert(newX);
                    option.strike = Math.round(newStrike);
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

function create_underlying_current_price_buttons() {

    let underlying_price=env.get_underlying_current_price();

    if(underlying_current_price_drag==true) {
        underlying_price=underlying_current_price_display_value;
    }
    else {
        underlying_current_price_display_value=underlying_price;
    }
    let textRect = new TextRect(svg, "underlying-price", "#0080FF");
    textRect.set_width(env.get_button_default_width());
    textRect.set_height(env.get_button_default_height());
    textRect.set_rect_position(
        env.get_window_left_margin() + env.get_x_scale()(underlying_price) - env.get_button_default_width() / 2,
        env.get_button_underlying_text_vpos() - 5)
    textRect.set_text(underlying_price.toFixed(2));
    //const textWidth = textRect.text_element.node().getBBox().width;
    //console.log("textWidth=", textWidth);
    textRect.set_text_position(
        env.get_window_left_margin()+env.get_x_scale()(underlying_price),
        env.get_button_underlying_text_vpos() - 5);

    if(underlying_current_price_drag==true) {
        //textRect.set_rect_border_color("red");
        textRect.rect_element
        .classed('blinking-border', true);  // Apply blinking stroke class

    }
    textRect.show();

    textRect.text_element.call(d3.drag()
    .on("drag", function (event) {
        
        if(underlying_current_price_drag==false) {
           underlying_current_price_display_value=env.get_underlying_current_price();
           console.log("underlying_current_price_display_value=",underlying_current_price_display_value);
           underlying_current_price_drag=true;
        }

        let newval = env.get_x_scale().invert(event.x - env.get_window_left_margin());

        underlying_current_price_display_value = newval;
        textRect.set_rect_position(
            env.get_window_left_margin() + env.get_x_scale()(newval) - env.get_button_default_width() / 2,
            env.get_button_underlying_text_vpos() - 5)
        textRect.set_text_position(
            env.get_window_left_margin()+env.get_x_scale()(newval),
            env.get_button_underlying_text_vpos() - 5);
        textRect.set_text(newval.toFixed(2));
      
        draw_graph();
    })
    )
    .on("contextmenu", function (event) {
        event.preventDefault(); // Prevent default right-click menu
        underlying_current_price_drag=false;
        draw_graph();
    })


    const price_value = env.get_x_scale()(underlying_current_price_display_value);

    svg.append("line")
        .attr("x1", env.get_window_left_margin() + price_value)
        .attr("y1", env.get_window_top_margin())
        .attr("x2", env.get_window_left_margin() + price_value)
        .attr("y2", env.get_window_height())
        .attr("stroke", "blue")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "5,5");

}

function compute_p_and_l_data(use_legs_volatility, num_days_left) {

    let p_and_l_data = [];

    console.log('compute_p_and_l_data - underlying_current_price_display_value=',underlying_current_price_display_value);
    for (let price = env.get_simul_min_price_of_combo(); price <= env.get_simul_max_price_of_combo(); price += env.get_simul_step_price_of_combo()) {
        let p_and_l_profile = 0;
        env.get_combo_params().legs.forEach(option => {
            let ov = env.get_use_real_values() ?
                option.trade_volatility : option.sim_volatility;
            let v = use_legs_volatility ? ov : env.get_mean_volatility_of_combo(env.get_use_real_values());
            let option_price = computeOptionPrice(underlying_current_price_display_value, option.strike, env.get_interest_rate_of_combo(), v, env.get_simulation_time_to_expiry() + option.expiration_offset, option.type);
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

async function setup_volatility_sliders() {

    use_legs_volatility_checkbox = document.getElementById('ivCheckbox');
    const sliders_container = document.getElementById('sliders_container');

    // Clear existing sliders
    sliders_container.innerHTML = '';

    if (use_legs_volatility_checkbox.checked) {

        // Multiple sliders for each leg
        env.get_combo_params().legs.forEach((option, index) => {
            const slider_container = document.createElement('div');
            const label = document.createElement('label');
            label.textContent = `${option.type} ${option.strike} IV`;

            const slider = document.createElement('input');
            slider.type = env.get_iv_slider_type();
            slider.style.width = env.get_iv_slider_width();
            slider.min = env.get_iv_slider_min_val();
            slider.max = env.get_iv_slider_max_val();
            slider.step = env.get_iv_slider_step();
            slider.value = env.get_use_real_values() ?
                option.trade_volatility : option.sim_volatility;

            // Display the IV value next to the slider
            const value_display = document.createElement('span');
            value_display.textContent = ` ${slider.value}`;
            slider.addEventListener('input', () => {
                value_display.textContent = ` ${slider.value}`;
                if (env.get_use_real_values()) {
                    option.trade_volatility = parseFloat(slider.value);
                } else {
                    option.sim_volatility = parseFloat(slider.value);
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
        slider.min = env.get_iv_slider_min_val();
        slider.max = env.get_iv_slider_max_val();
        slider.step = env.get_iv_slider_step();
        slider.value = env.get_mean_volatility_of_combo(env.get_use_real_values());

        // Display the IV value next to the slider
        const value_display = document.createElement('span');
        value_display.textContent = ` ${slider.value}`;
        slider.addEventListener('input', () => {
            value_display.textContent = ` ${slider.value}`;
            env.set_mean_volatility_of_combo(env.get_use_real_values(), parseFloat(slider.value));
            draw_graph();
        });

        slider_container.appendChild(label);
        slider_container.appendChild(slider);
        slider_container.appendChild(value_display);

        sliders_container.appendChild(slider_container);
    }
    document.getElementById('ivCheckbox').addEventListener('change', setup_volatility_sliders);

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
    slider.type = env.config.window.days_left.type;
    slider.style.width = env.config.window.days_left.width;
    slider.min = env.config.window.days_left.min;
    slider.max = env.get_time_to_expiry_of_combo();
    slider.step = env.config.window.days_left.step;
    slider.value = env.get_time_for_simulation_of_combo();

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

function update_display_mode() {

    const trade = env.get_trade_params();
    display_mode_checkbox = document.getElementById('displayModeCheckbox');
    env.set_use_real_values(display_mode_checkbox.checked)

    if (env.get_use_real_values()) {
        const today = new Date().toISOString().split('T')[0];
        let current_expiration_date = trade.expiration_date
        let trade_open_by = trade.trade_open_by
        let time_to_expiry = days_difference(current_expiration_date, trade_open_by);
    }
    reload_page();
}

async function setup_display_mode() { // sim or real

    d3.select("#displayModeCheckboxContainer")
        .append("input")
        .attr("type", "checkbox")
        .attr("id", "displayModeCheckbox")
        .attr("name", "displayModeCheckbox").property("checked", env.get_use_real_values());

    // Append a label for the checkbox
    d3.select("#displayModeCheckboxContainer")
        .append("label")
        .attr("for", "displayModeCheckbox")
        .text("Use real values");
    d3.select("#displayModeCheckbox").on("change", function () {
        update_display_mode();
    });
    display_mode_checkbox = document.getElementById('displayModeCheckbox');
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

function reload_page() {
    const url = new URL(window.location);
    url.searchParams.set("use_real_values", env.get_use_real_values()); // Add or update the parameter
    window.location.href = url.toString(); // Navigate to the new URL
}

async function setup_combos_list() {

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

function setup_combo_templates_list() {

    const titleContainer = d3.select("#title_combo_tpl_container");
    //    titleContainer.insert("label", "#comboTplName")
    //        .text("Combo Templates");

    const comboContainer = d3.select("#combo_tpl_container");
    comboContainer.insert("label", "#comboTplName")
        .text("Template: ");
    const dropdown = comboContainer.append("select")
        .attr("id", "comboTplBox");
    dropdown.selectAll("option")
        .data(combo_tpl.get_combo_templates())
        .enter()
        .append("option")
        .text(d => d)
        .attr("value", d => d);
    //        .attr("selected", d => d === env.config.config.combo ? "selected" : null);
}

function setup_underlyings_list() {

    const titleContainer = d3.select("#title_combo_tpl_container");
    //    titleContainer.insert("label", "#comboUnderlyingName")
    //        .text("Underlying");

    const comboContainer = d3.select("#underlying_list_container");
    comboContainer.insert("label", "#comboTplName")
        .text("Underlying: ");
    const dropdown = comboContainer.append("select")
        .attr("id", "comboUnderlyingBox");
    dropdown.selectAll("option")
        .data(["AAPL", "PLTR", "TSLA", "SPX"])
        .enter()
        .append("option")
        .text(d => d)
        .attr("value", d => d);
    //        .attr("selected", d => d === env.config.config.combo ? "selected" : null);
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
        .datum(env.get_pl_at_exp_data())
        .attr("fill", "url(#greenGradient)") // Apply green gradient
        .attr("opacity", 0.6)
        .attr("d", area_above);

    // Append the negative (red) gradient area
    graph.append("path")
        .datum(env.get_pl_at_exp_data())
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

    // Draw vertical lines at zero crossings
    zeroCrossings.forEach(x => {
        graph.append("line")
            .attr("x1", env.get_x_scale()(x))
            .attr("x2", env.get_x_scale()(x))
            .attr("y1", scale.range()[0])  // Bottom of graph
            .attr("y2", scale.range()[1])          // y = 0 line
            .attr("stroke", "blue")
            .attr("stroke-dasharray", "4,4")  // Dashed line
            .attr("stroke-width", 1);

        let xScaled = env.get_x_scale()(x);
        let yZero = scale(0); // y position for P/L=0 line
        let rectWidth = 50, rectHeight = 20;
        let textOffsetX = -rectWidth / 2, textOffsetY = -rectHeight + 5; // Positioning above the line

        graph.append("rect")
            .attr("x", xScaled + textOffsetX)
            .attr("y", scale.range()[0] + textOffsetY)
            .attr("width", rectWidth)
            .attr("height", rectHeight)
            .attr("fill", "blue")
            .attr("rx", 5)  // Rounded corners
            .attr("ry", 5);

        // Add white text inside the rectangle
        graph.append("text")
            .attr("x", xScaled)
            .attr("y", scale.range()[0] + textOffsetY + rectHeight / 1.5) // Centered in rectangle
            .attr("fill", "white")
            .attr("font-size", "12px")
            .attr("font-family", "Menlo, monospace")  // Set font to Menlo
            .attr("text-anchor", "middle")
            .text(x.toFixed(0)); // Display x value with 2 decimals


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

function display_local_status() {
    d3.select("#graph-container")
        .append("div")
        .attr("class", use_local ? "red-dot" : "green-dot");
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

function draw_graph() {

    // get the data
    env.set_pl_at_exp_data(compute_p_and_l_data(use_legs_volatility_checkbox.checked, 0));
    env.set_pl_at_init_data(compute_p_and_l_data(use_legs_volatility_checkbox.checked, env.get_time_to_expiry_of_combo()));
    env.set_pl_at_sim_data(compute_p_and_l_data(use_legs_volatility_checkbox.checked, env.get_time_for_simulation_of_combo()));

    env.set_greeks_data(compute_greeks_data(use_legs_volatility_checkbox.checked));

    // prepare the graph area
    if (!svg) {
        svg = d3.select("#graph-container")
            .append("svg")
            .attr("width", env.get_window_width())
            .attr("height", env.get_window_height());
    }
    svg.selectAll("*").remove();


    // X scale for the price axis ; set at the bottom of the graph window
    const graph_width = env.get_window_width() - env.get_window_left_margin() - env.get_window_right_margin();
    env.set_x_scale(d3.scaleLinear().domain([env.get_simul_min_price_of_combo(), env.get_simul_max_price_of_combo()]).range([0, graph_width]));
    let y_offset = env.get_window_top_margin() + env.get_window_height() + env.get_window_vspacer_margin();
    y_offset = env.get_window_height() - env.get_window_vspacer_price_axis();
    svg.append("g").attr("transform", `translate(${env.get_window_left_margin()},${y_offset})`).call(d3.axisBottom(env.get_x_scale()));


    // P&L and Greeks graph areas
    const p_and_l_graph_height = env.get_window_p_and_l_ratio() * (env.get_window_height() - env.get_window_top_margin() - env.get_window_bottom_margin() - env.get_window_vspacer_margin());
    const greeks_graphs_height = env.get_window_height() - p_and_l_graph_height - env.get_window_top_margin() - env.get_window_bottom_margin() - env.get_window_vspacer_margin();

    let p_and_l_graph_area = svg
        .append("g")
        .attr("width", env.get_window_width())
        .attr("height", p_and_l_graph_height);

    let greeks_graph_area = svg
        .append("g")
        .attr("width", env.get_window_width())
        .attr("height", greeks_graphs_height);

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

    add_grid(p_and_l_graph, scale_p_and_l)


    draw_p_and_l(p_and_l_graph, scale_p_and_l);

    // Add Y-axis label
    p_and_l_graph.append("text")
        .attr("transform", "rotate(-90)")  // Rotate text for Y-axis
        .attr("x", -p_and_l_graph_height / 2)            // Center the label
        .attr("y", -env.get_window_left_margin() + 15)      // Position left of Y-axis
        .attr("dy", "1em")                 // Fine-tune vertical alignment
        .attr("font-family", "Menlo, monospace")  // Set font to Menlo
        .style("text-anchor", "middle")    // Center alignment
        .text("Profit / Loss ($)");        // Change this to your label



    let sigma = env.get_underlying_current_price() * env.get_mean_volatility_of_combo(env.get_use_real_values()) * Math.sqrt(env.get_time_for_simulation_of_combo() / 365);
    let sigma_text = `σ = ${sigma.toFixed(0)}`;
    let price_less_sigma = env.get_underlying_current_price() - sigma;
    let price_plus_sigma = env.get_underlying_current_price() + sigma;
    let price_less_sigma_text = `${price_less_sigma.toFixed(0)}`;
    let price_plus_sigma_text = `${price_plus_sigma.toFixed(0)}`;
    svg.append("text")
        .attr("x", env.get_window_left_margin() + env.get_x_scale()(env.get_underlying_current_price()) - 30)
        .attr("y", env.get_window_top_margin() + 20)
        .attr("font-family", "Menlo, monospace")  // Set font to Menlo
        .attr("fill", "black")
        .text(sigma_text);

    svg.append("text")
        .attr("x", env.get_window_left_margin() + env.get_x_scale()(env.get_underlying_current_price() - sigma) - 15)
        .attr("y", env.get_window_top_margin() + 15)
        .attr("font-family", "Menlo, monospace")  // Set font to Menlo
        .attr("fill", "black")
        .text(`-1σ`);
    svg.append("text")
        .attr("x", env.get_window_left_margin() + env.get_x_scale()(env.get_underlying_current_price() - sigma) - 15)
        .attr("y", env.get_window_top_margin() + 30)
        .attr("font-family", "Menlo, monospace")  // Set font to Menlo
        .attr("fill", "black")
        .text(price_less_sigma_text);
    svg.append("text")
        .attr("x", env.get_window_left_margin() + env.get_x_scale()(env.get_underlying_current_price() + sigma) - 15)
        .attr("y", env.get_window_top_margin() + 15)
        .attr("font-family", "Menlo, monospace")  // Set font to Menlo
        .attr("fill", "black")
        .text(`+1σ`);
    svg.append("text")
        .attr("x", env.get_window_left_margin() + env.get_x_scale()(env.get_underlying_current_price() + sigma) - 15)
        .attr("y", env.get_window_top_margin() + 30)
        .attr("font-family", "Menlo, monospace")  // Set font to Menlo
        .attr("fill", "black")
        .text(price_plus_sigma_text);

    svg.append("rect")
        .attr("x", env.get_window_left_margin() + env.get_x_scale()(env.get_underlying_current_price() - sigma))
        .attr("y", env.get_window_top_margin())
        .attr("width", env.get_x_scale()(env.get_underlying_current_price() + sigma) - env.get_x_scale()(env.get_underlying_current_price() - sigma))
        .attr("height", p_and_l_graph_height)
        .attr("font-family", "Menlo, monospace")  // Set font to Menlo
        .attr("fill", "blue")
        .attr("opacity", 0.07);





    // Greeks graphs

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

    add_strike_lines();
    create_strike_buttons(p_and_l_graph);
    create_underlying_current_price_buttons();
    add_crosshair();
}

async function setup_global_env(e) {
    if (!e) {
        e = new Environment(use_local ? await load_local_config() : await fetch_configuration());
    }

    combo_tpl = new ComboTemplater();
    if (!use_local) {
        await combo_tpl.fetch_combo_templates();
        console.log('combo_tpl=', combo_tpl.combo_templates);
    }
    return e
}

function set_combo_to_tmp() {
    env.set_combo_to_tmp();
    if (!use_local) {
        update_remote_config(env.config);
        console.log("Remote config updated", env.config);
        env = 0
    }
    location.reload();
    reloadWithParam("combo", "TMP");
}

// prepare the environment
//use_local = await is_mode_local(); // Auto-detect local/remote mode
use_local = true;
env = await setup_global_env(env);
ticker = env.get_ticker_of_combo();
underlying = use_local ? await load_local_price(ticker) : await fetch_price(ticker);
env.set_underlying_current_price(underlying.price);

// construct the display
setup_volatility_type();
setup_display_mode();
display_local_status();
setup_combos_list();
setup_combo_templates_list();
setup_underlyings_list();
setup_days_left_slider();
setup_volatility_sliders();
draw_graph();

