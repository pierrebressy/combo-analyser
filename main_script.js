import { computeOptionPrice } from './functions.js';
import { is_mode_local, load_local_price, load_local_config, update_remote_config, fetch_configuration, fetch_price } from './async.js';
import { Environment } from './configuration.js';
import { VerticalCursor, HorizontalCursor, TextRect, Line, TextRectPlus } from './cursor.js';
import { update_3d_view } from './3dview.js';
import { addLog } from './log.js';
import { test_iv } from './iv.js';
import { create_main_frame } from './frame.js';
import {display_sigma_selector, display_days_left_slider, display_theme_buttons} from './frame.js';
import {display_volatility_sliders, display_checkbox_for_volatility_mode, display_local_status} from './frame.js';
import { get_sigma_factor } from './global.js';
import { set_volatility_is_per_leg,get_volatility_is_per_leg } from './global.js';
import { set_combo_changed } from './global.js';
import { set_simulated_underlying_price_changed } from './global.js';
import { set_use_local,get_use_local } from './global.js';


export let env;

let pl_at_expiration_cursor;
let pl_at_initial_cursor;
let pl_at_sim_cursor;
let ticker;
let price;
let underlying_current_price = 0;
let svg;
let scale_p_and_l;
let price_cursor;
let memo_price_at_mouse_down = 0;







function reloadWithParam(key, value) {
    const url = new URL(window.location);
    url.searchParams.set(key, value); // Add or update the parameter
    window.location.href = url.toString(); // Navigate to the new URL
}
async function setup_global_env(e) {
    if (!e) {
        console.log("setup_global_env: loading env...");
        e = new Environment(get_use_local() ? await load_local_config() : await fetch_configuration());
        set_volatility_is_per_leg( e.check_if_volatility_is_per_leg() );
    }
    else {
        console.log("setup_global_env: env already set.");
    }
    return e
}
function find_zero_crossing_indices(data) {
    return data.slice(1).reduce((indices, point, i) => {
        if (data[i].y * point.y < 0) indices.push(i + 1);
        return indices;
    }, []);
}
function find_zero_crossings(data) {
    let crossings = [];
    let zeroCrossingIndices = find_zero_crossing_indices(data);
    zeroCrossingIndices.forEach(index => {
        let x1 = data[index - 1].x;
        let x2 = data[index].x;
        let y1 = data[index - 1].y;
        let y2 = data[index].y;

        // Linear interpolation to estimate x where y = 0
        let xCross = x1 - y1 * (x2 - x1) / (y2 - y1);
        crossings.push(xCross);
    });
    return crossings;
}
export function compute_greeks_data_for_price(greek_index, use_legs_volatility, get_use_real_values, price) {

    const interest_rate_of_combo = env.get_interest_rate_of_combo();
    const time_for_simulation_of_combo = env.get_time_for_simulation_of_combo();
    const mean_volatility_of_combo = env.get_mean_volatility_of_combo(get_use_real_values)
    let greek = 0;
    env.get_combo_params().legs.forEach(option => {
        let ov = get_use_real_values ?
            option.trade_volatility : option.sim_volatility;
        let v = use_legs_volatility ? ov : mean_volatility_of_combo;
        let greeks = computeOptionPrice(price, option.strike, interest_rate_of_combo, v, time_for_simulation_of_combo + option.expiration_offset, option.type);
        greek = greek + option.qty * greeks[greek_index] * env.config.computation.greek_scaler[greek_index];
    });
    return { x: price, y: greek }
}
function compute_greeks_data(use_legs_volatility) {

    const num_greeks = env.get_computation_num_greeks();
    let greeks_data = Array.from({ length: num_greeks + 3 }, () => []);

    const minPrice = env.get_simul_min_price_of_combo();
    const maxPrice = env.get_simul_max_price_of_combo();
    const stepPrice = env.get_simul_step_price_of_combo();
    const get_use_real_values = env.get_use_real_values();
    for (let price = minPrice; price <= maxPrice; price = price + stepPrice) {

        let greek_index = 0;
        for (greek_index = 0; greek_index < num_greeks; greek_index++) {
            let data = compute_greeks_data_for_price(greek_index, use_legs_volatility, get_use_real_values, price);
            greeks_data[greek_index].push(data);
        }
        if (env.get_combo_params().legs.length == 1) {
            // add the computation of the intrinsic value and time value
            let intrinsic_value = 0;
            let time_value = 0;
            const interest_rate_of_combo = env.get_interest_rate_of_combo();
            const time_for_simulation_of_combo = env.get_time_for_simulation_of_combo();
            const mean_volatility_of_combo = env.get_mean_volatility_of_combo(get_use_real_values)
            let greek = 0;
            env.get_combo_params().legs.forEach(option => {
                let ov = get_use_real_values ?
                    option.trade_volatility : option.sim_volatility;
                let v = use_legs_volatility ? ov : mean_volatility_of_combo;
                let greeks = computeOptionPrice(price, option.strike, interest_rate_of_combo, v, time_for_simulation_of_combo + option.expiration_offset, option.type);
                if (option.type === "call") {
                    if (price - option.strike < 0) {
                        intrinsic_value = 0;
                    } else {
                        intrinsic_value += price - option.strike;
                    }
                    time_value += greeks[0] - intrinsic_value;
                }
                else {
                    if (option.strike - price < 0) {
                        intrinsic_value = 0;
                    } else {
                        intrinsic_value += option.strike - price;
                    }
                    time_value += greeks[0] - intrinsic_value;
                }
            });
            let data = { x: price, y: intrinsic_value };
            greeks_data[greek_index].push(data);
            greek_index++;
            data = { x: price, y: time_value };
            greeks_data[greek_index].push(data);
            greek_index++;
            data = { x: price, y: intrinsic_value + time_value };
            greeks_data[greek_index].push(data);
    
        }
        else {
            let data = { x: price, y: 0 };
            greeks_data[greek_index].push(data);
            greek_index++;
            data = { x: price, y: 0 };
            greeks_data[greek_index].push(data);
            greek_index++;
            data = { x: price, y: 0 };
            greeks_data[greek_index].push(data);
    
        }

    }

    return greeks_data;
}
export function compute_p_and_l_data_for_price(use_legs_volatility, num_days_left, price) {

    let p_and_l_profile = 0;
    const get_use_real_values = env.get_use_real_values();
    const interest_rate_of_combo = env.get_interest_rate_of_combo();
    const simulation_time_to_expiry = env.get_simulation_time_to_expiry();
    const mean_volatility_of_combo = env.get_mean_volatility_of_combo(get_use_real_values)
    env.get_combo_params().legs.forEach(option => {
        let ov = get_use_real_values ?
            option.trade_volatility : option.sim_volatility;
        let v = use_legs_volatility ? ov : mean_volatility_of_combo;
        let option_price = computeOptionPrice(underlying_current_price, option.strike, interest_rate_of_combo, v, simulation_time_to_expiry + option.expiration_offset, option.type);
        let premium = option_price[0];
        let greeks = computeOptionPrice(price, option.strike, interest_rate_of_combo, v, num_days_left + option.expiration_offset, option.type);
        p_and_l_profile = p_and_l_profile + option.qty * 100 * (greeks[0] - premium);
    });

    return { x: price, y: p_and_l_profile }
}
function compute_p_and_l_data(use_legs_volatility, num_days_left) {

    const minPrice = env.get_simul_min_price_of_combo();
    const maxPrice = env.get_simul_max_price_of_combo();
    const stepPrice = env.get_simul_step_price_of_combo();

    let p_and_l_data = [];
    for (let price = minPrice; price <= maxPrice; price += stepPrice) {
        const data = compute_p_and_l_data_for_price(use_legs_volatility, num_days_left, price);
        p_and_l_data.push(data);
    }
    return p_and_l_data
}
function compute_data_to_display() {
    env.set_pl_at_exp_data(compute_p_and_l_data(get_volatility_is_per_leg(), 0));
    env.set_pl_at_init_data(compute_p_and_l_data(get_volatility_is_per_leg(), env.get_time_to_expiry_of_combo()));
    env.set_pl_at_sim_data(compute_p_and_l_data(get_volatility_is_per_leg(), env.get_time_for_simulation_of_combo()));

    env.set_greeks_data(compute_greeks_data(get_volatility_is_per_leg()));
}
function svg_cleanup(svg) {
    if (!svg) {

        const container = d3.select("#pl-container")
        let original_state = container.classed("hidden")
        container.classed("hidden", false);
        const width = container.node().clientWidth;
        const height = container.node().clientHeight;
        container.classed("hidden", original_state);

        svg = d3.select("#pl-container")
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("width", "100%")
            .attr("height", "100%")
            .style("display", "block");
    }
    svg.selectAll("*").remove();
    return svg;
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
        .style("stop-color", "var(--gradient-start)");

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
        .style("stop-color", "var(--gradient-start)");

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
        .attr("stroke", "var(--exp-path-color)")
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
        zero_crossing_label.set_text(x.toFixed(1));
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
function add_grid(graph, y_scale) {

    graph
        .append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${y_scale(0)})`) // Positioning at the bottom
        .call(d3.axisBottom(env.get_x_scale()))
        .selectAll(".tick text")
        .remove();


    const y_axis_grid = d3.axisLeft(y_scale)
        .tickSize(-env.get_window_width() + env.get_window_left_margin() + env.get_window_right_margin())
        .tickFormat("");

    // Add Y-axis grid
    graph.append("g")
        .attr("class", "y-grid")
        .call(y_axis_grid)
        .selectAll("line")
        .attr("stroke", "var(--horizontal-grid-color)")
        .attr("stroke-opacity", 0.7)
        .attr("stroke-dasharray", "4,4");
}
function add_y_axis_label(graph, graph_height, label) {
    graph.append("text")
        .attr("class", "y-label-std-text")             // Add your custom class
        .attr("transform", "rotate(-90)")  // Rotate text for Y-axis
        .attr("x", -graph_height / 2)            // Center the label
        .attr("y", -env.get_window_left_margin() + 15)      // Position left of Y-axis
        .attr("dy", "1em")                 // Fine-tune vertical alignment
        .attr("font-family", "Menlo, monospace")  // Set font to Menlo
        .style("text-anchor", "middle")    // Center alignment
        .text(label);        // Change this to your label
}
function draw_one_sigma_area(svg, underlying_current_price, p_and_l_graph_height) {
    let sigma = underlying_current_price * env.get_mean_volatility_of_combo(env.get_use_real_values()) * Math.sqrt(env.get_time_for_simulation_of_combo() / 365);
    let sigma_text = `σ = ${sigma.toFixed(0)}`;
    let price_less_sigma = underlying_current_price - get_sigma_factor() * sigma;
    let price_plus_sigma = underlying_current_price + get_sigma_factor() * sigma;
    let price_less_sigma_text = `${price_less_sigma.toFixed(1)}`;
    let price_plus_sigma_text = `${price_plus_sigma.toFixed(1)}`;

    svg.append("text")
        .attr("x", env.get_window_left_margin() + env.get_x_scale()(underlying_current_price) - 30)
        .attr("y", env.get_window_top_margin() + 20)
        .attr("font-family", "Menlo, monospace")  // Set font to Menlo
        .attr("fill", "var(--text-color)")
        .text(sigma_text);
    svg.append("text")
        .attr("x", env.get_window_left_margin() + env.get_x_scale()(underlying_current_price - get_sigma_factor() * sigma) - 15)
        .attr("y", env.get_window_top_margin() + 15)
        .attr("font-family", "Menlo, monospace")  // Set font to Menlo
        .attr("fill", "var(--text-color)")
        .text(`-${get_sigma_factor().toFixed(1)}σ`);
    svg.append("text")
        .attr("x", env.get_window_left_margin() + env.get_x_scale()(underlying_current_price - get_sigma_factor() * sigma) - 15)
        .attr("y", env.get_window_top_margin() + 30)
        .attr("font-family", "Menlo, monospace")  // Set font to Menlo
        .attr("fill", "var(--text-color)")
        .text(price_less_sigma_text);
    svg.append("text")
        .attr("x", env.get_window_left_margin() + env.get_x_scale()(underlying_current_price + get_sigma_factor() * sigma) - 15)
        .attr("y", env.get_window_top_margin() + 15)
        .attr("font-family", "Menlo, monospace")  // Set font to Menlo
        .attr("fill", "var(--text-color)")
        .text(`+${get_sigma_factor().toFixed(1)}σ`);
    svg.append("text")
        .attr("x", env.get_window_left_margin() + env.get_x_scale()(underlying_current_price + get_sigma_factor() * sigma) - 15)
        .attr("y", env.get_window_top_margin() + 30)
        .attr("font-family", "Menlo, monospace")  // Set font to Menlo
        .attr("fill", "var(--text-color)")
        .text(price_plus_sigma_text);

    svg.append("rect")
        .attr("x", env.get_window_left_margin() + env.get_x_scale()(underlying_current_price - get_sigma_factor() * sigma))
        .attr("y", env.get_window_top_margin())
        .attr("width", env.get_x_scale()(underlying_current_price + get_sigma_factor() * sigma) - env.get_x_scale()(underlying_current_price - get_sigma_factor() * sigma))
        .attr("height", p_and_l_graph_height)
        .attr("font-family", "Menlo, monospace")  // Set font to Menlo
        .attr("fill", "var(--sigma-area-color)")
}
function display_p_and_l_graph(p_and_l_area, p_and_l_area_height) {

    // P&L graph
    const min_p_and_l = env.get_min_of_dataset();
    const max_p_and_l = env.get_max_of_dataset();
    const padding_p_and_l = (max_p_and_l - min_p_and_l) * 0.1;
    const p_and_l_graph_height = p_and_l_area_height - env.get_window_top_margin() - env.get_window_vspacer_margin();
    const p_and_l_graph_width = env.get_window_width() - env.get_window_left_margin() - env.get_window_right_margin();
    scale_p_and_l = d3.scaleLinear()
        .domain([min_p_and_l - padding_p_and_l, max_p_and_l + padding_p_and_l])
        .range([p_and_l_graph_height, 0]);
    env.set_x_scale(d3.scaleLinear().domain([env.get_simul_min_price_of_combo(), env.get_simul_max_price_of_combo()]).range([0, p_and_l_graph_width]));
    let p_and_l_graph = p_and_l_area.
        append("g").
        attr("class", "p_and_l_graph")
        .attr("transform", `translate(${env.get_window_left_margin()}, ${env.get_window_top_margin()})`)
        .attr("width", p_and_l_graph_width)
        .attr("height", p_and_l_graph_height)
    p_and_l_graph.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", p_and_l_graph_width)
        .attr("height", p_and_l_graph_height)
        .attr("fill", "var(--bg-right)");

    p_and_l_graph.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(scale_p_and_l));

    p_and_l_graph.append("g").attr("transform", `translate(0,${scale_p_and_l(0)})`).call(d3.axisBottom(env.get_x_scale())).selectAll(".tick text").remove();
    //p_and_l_graph.attr("clip-path", "url(#clipBox)");
    draw_p_and_l(p_and_l_graph, scale_p_and_l);
    add_grid(p_and_l_graph, scale_p_and_l)
    add_y_axis_label(p_and_l_graph, p_and_l_graph_height, "Profit / Loss ($)");
    draw_one_sigma_area(svg, underlying_current_price, p_and_l_graph_height);
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
        .attr("stroke", "var(--exp-path-color)")
        .attr("stroke-width", 2)
        .attr("d", d3.line()
            .x(d => env.get_x_scale()(d.x))
            .y(d => scale(d.y))
            .curve(d3.curveBasis) // Optional smoothing
        );

}
function display_greeks_graph(greeks_graph_area, greeks_graphs_height) {
    let num_greeks_to_display = env.config.graph.greeks.ids.length;
    const greek_graph_height = Math.round(
        (greeks_graphs_height - env.get_window_greeks_vspacer_margin() * (num_greeks_to_display + 1)) / num_greeks_to_display
    );


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
        let top_position = env.get_window_top_margin();
        top_position += index * (greek_graph_height + env.get_window_greeks_vspacer_margin());
        greek_graph.attr("transform", `translate(${env.get_window_left_margin()}, ${top_position})`);
        greek_graph.attr("width", env.get_window_width() - env.get_window_left_margin());

        // add Y-axis
        greek_graph
            .append("g")
            .attr("class", "y-axis-greek")  // <== Custom class for styling
            .call(d3.axisLeft(scale_greek).ticks(2));


        // Add X-axis
        greek_graph
            .append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${scale_greek(0)})`)
            .call(d3.axisBottom(env.get_x_scale()))
            .selectAll(".tick text")
            .remove();

        // Add y main label
        greek_graph.append("text")
            .attr("class", "y-label-std-text")             // Add your custom class
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

        let label = new TextRectPlus(svg, "strike", option.type === "call" ? "red" : "green", option.expiration_offset);
        label.set_width(80);
        label.set_rect_position(
            env.get_window_left_margin() + env.get_x_scale()(option.strike) - label.get_width() / 2,
            env.get_button_default_text_vpos() - 15);
        label.set_text_position(
            env.get_window_left_margin() + env.get_x_scale()(option.strike),
            env.get_button_default_text_vpos() - 14);
        let ot = option.type === "call" ? "C" : "P";
        label.set_text(` ${option.qty} ${ot} ${option.strike.toFixed(1)}`);
        label.set_text_color("white");
        label.text_element.style("cursor", "grabbing")
        label.show();
        //strike_label.text_element.attr("class", "draggable-button")

        label.text_element
            .call(d3.drag()
                .on("drag", function (event) {
                    let newX = Math.max(0, Math.min(env.get_window_width(), (event.x - env.get_window_left_margin())));
                    d3.select(this).attr("x", newX - 15);
                    let newStrike = env.get_x_scale().invert(newX);
                    option.strike = Math.round(newStrike * 2) / 2; // Round to nearest 0.5
                    //option.strike = (newStrike);
                    set_combo_changed(true);
                    addLog('strike=' + (option.strike.toFixed(2)), { warning: true });
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






                let t = buttonContainer.append("table");
                let tr = t.append("tr");
                tr.append("td").text("Qty");
                let tq = tr.append("td");
                tq.append("input")
                    .attr("type", "number")
                    .attr("value", option.qty)
                    .attr("min", -10)
                    .attr("max", 10)
                    .attr("step", 1)
                    .attr("size", 3)
                    .on("input", function () {
                        console.log("Qty changed to: " + this.value);
                        let option = env.get_combo_params().legs[current_index - 1];
                        option.qty = parseInt(this.value);
                        set_combo_changed(true);
                        addLog('qty=' + (option.qty.toFixed(0)), { warning: true });
                        draw_graph();
                    });
                let tr2 = t.append("tr");
                tr2.append("td").text("Exp. offset");
                let tq2 = tr2.append("td");
                tq2.append("input")
                    .attr("type", "number")
                    .attr("value", option.expiration_offset)
                    .attr("min", -50)
                    .attr("max", 50)
                    .attr("step", 1)
                    .attr("size", 3)
                    .on("input", function () {
                        console.log("Exp. offset changed to: " + this.value);
                        let option = env.get_combo_params().legs[current_index - 1];
                        option.expiration_offset = parseInt(this.value);
                        set_combo_changed(true);
                        addLog('expiration_offset=' + (option.expiration_offset.toFixed(0)), { warning: true });
                        draw_graph();
                    });

                buttonContainer.append("button")
                    .text("Dismiss")
                    .on("click", function () {
                        floatingWindow.style("display", "none");
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
    label.text_element.style("cursor", "grabbing")
    label.show();

    label.text_element
        .call(d3.drag()
            .on("drag", function (event) {
                set_simulated_underlying_price_changed(true);
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
            set_simulated_underlying_price_changed(false);

            draw_graph();
        });


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

    pl_at_expiration_cursor = new VerticalCursor(svg, env.get_pl_at_exp_data(), scale_p_and_l, "pl-exp", "#808080");
    pl_at_initial_cursor = new VerticalCursor(svg, env.get_pl_at_init_data(), scale_p_and_l, "pl-init", "orange");
    pl_at_sim_cursor = new VerticalCursor(svg, env.get_pl_at_sim_data(), scale_p_and_l, "pl-sim", "green");
    price_cursor = new HorizontalCursor(svg, env.get_pl_at_sim_data(), scale_p_and_l, "price", "blue");
    price_cursor.set_vpos(env.get_window_top_margin());
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
        const price = env.get_x_scale().invert(x - env.get_window_left_margin());
        if (event.buttons === 1) {  // Check if left mouse button is pressed
            // Your code here when left mouse button is pressed
            //const mousePos = d3.pointer(event);
            //const mouseX = mousePos[0]- env.get_window_left_margin();
            event.preventDefault();  // Prevent default behavior (e.g., text selection)

            if (memo_price_at_mouse_down == 0) {
                memo_price_at_mouse_down = price;
                console.log("start price:", price.toFixed(1));
            }
            else {
            }

        }
        else {
            memo_price_at_mouse_down = 0;
        }
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


        pl_at_expiration_cursor.update(env, price);
        pl_at_initial_cursor.update(env, price);
        pl_at_sim_cursor.update(env, price);
        price_cursor.update(env, x);

    });

}
export function draw_graph() {

    svg = svg_cleanup(svg);
    const p_and_l_area_height = env.get_window_p_and_l_ratio() * env.get_window_height() - env.get_window_vspacer_margin();
    const greeks_graph_height = env.get_window_height() - p_and_l_area_height;
    let p_and_l_graph_area = svg
        .append("g")
        .attr("transform", `translate(0,0)`)
        .attr("width", env.get_window_width())
        .attr("height", p_and_l_area_height)

    let greeks_graph_area = svg
        .append("g")
        .attr("transform", `translate(0,${p_and_l_area_height + env.get_window_vspacer_margin()})`)
        .attr("width", env.get_window_width())
        .attr("height", greeks_graph_height);

    // get the data
    compute_data_to_display()

    // display the data
    display_p_and_l_graph(p_and_l_graph_area, p_and_l_area_height);
    display_greeks_graph(greeks_graph_area, greeks_graph_height);


    display_strike_buttons();
    display_current_price(svg);
    display_local_status();

    add_crosshair();

    update_3d_view();
}
function display_combos_list() {

    const comboContainer = d3.select("#combo-list-container")
    comboContainer.selectAll("*").remove();
    const dropdown = comboContainer.append("select")
        .attr("id", "comboBox")
        .on("change", function () {
            //env.config.config.combo = this.value;
            env.set_combo(this.value);
            if (!get_use_local()) {
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
        .attr("class", "std-text")
        .text("Choose combo: ");

}
function update_main_page() {

    const container = d3.select("#pl-container")
    let original_state = container.classed("hidden")
    container.classed("hidden", false);
    let graph_width = container.node().clientWidth;
    let graph_height = container.node().clientHeight;
    container.classed("hidden", original_state);

    env.set_window_width(graph_width);
    env.set_window_height(graph_height);

    let left_container = d3.select("#left-container");
    left_container.selectAll("*").remove();

    const theme_container = d3.select("#left-container").append("div")
        .attr("class", "theme-container")
        .attr("id", "theme-container");

    const local_status_container = d3.select("#left-container").append("div")
        .attr("class", "local-status-container")
        .attr("id", "local-status-container");

    const auto_save_container = d3.select("#left-container").append("div")
        .attr("class", "local-status-container")
        .attr("id", "auto-save-container");

    d3.select("#left-container").append("div").append("br")

    const combo_list_container = d3.select("#left-container").append("div")
        .attr("class", "combo-list-container")
        .attr("id", "combo-list-container");

    d3.select("#left-container").append("div").append("br")

    const days_left_container = d3.select("#left-container").append("div")
        .attr("class", "days-left-container")
        .attr("id", "days-left-container");

    d3.select("#left-container").append("div").append("br")

    const volatility_main_container = d3.select("#left-container").append("div")
        .attr("class", "volatility-main-container")
        .attr("id", "volatility-main-container");
    const per_leg_volatility_container = d3.select("#left-container").append("div")
        .attr("class", "per-leg-volatility-container")
        .attr("id", "per-leg-volatility-container")
        .style("display", "none"); // Initially hidden
    const mean_volatility_container = d3.select("#left-container").append("div")
        .attr("class", "mean-volatility-container")
        .attr("id", "mean-volatility-container")
        .style("display", "block")  // Initially hidden

    d3.select("#left-container").append("div").append("br")

    /*
    const combo_templater_container = d3.select("#left-container").append("div")
        .attr("class", "combo-templater-container")
        .attr("id", "combo-templater-container");
 
    d3.select("#left-container").append("div").append("br")
    */

    const sigma_container = d3.select("#left-container").append("div")
        .attr("class", "sigma-selector-container")
        .attr("id", "sigma-selector-container");

    //sigma_knob = new Knob(sigma_container, env, env.get_sigma_factors(), draw_graph);

    d3.select("#left-container").append("div").append("br")

    //const camera_container = d3.select("#left-container").append("div")
    //    .attr("class", "camera-position-container")
    //    .attr("id", "camera-position-container");


    //document.body.classList.toggle('dark-theme');


    display_theme_buttons();
    display_local_status();
    display_checkbox_for_volatility_mode();
    display_volatility_sliders();
    display_days_left_slider();
    display_combos_list();
    display_sigma_selector();
    //display_camera_position_sliders();
    draw_graph();
    update_3d_view();
}

set_use_local( await is_mode_local() );
//set_use_local(true);
//console.log('State: use_local='+get_use_local());
env = await setup_global_env(env);
//console.log('State: env=', env);


ticker = env.get_ticker_of_combo();
//console.log('State: ticker=', ticker);
price = get_use_local() ? await load_local_price(ticker) : await fetch_price(ticker);
//console.log('State: price=', price);
env.set_underlying_current_price(price);
underlying_current_price = env.get_underlying_current_price().price;
//console.log('State: underlying_current_price=', underlying_current_price);

create_main_frame(env.config.window.tab_active);

update_main_page();
window.addEventListener("resize", update_main_page);

addLog('State: use_local=' + get_use_local(), { warning: true });

test_iv();