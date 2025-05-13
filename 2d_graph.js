import { get_sigma_factor } from './global.js';
import { get_volatility_is_per_leg } from './global.js';
import { computeOptionPrice } from './computation.js';
import { VerticalCursor, HorizontalCursor, TextRect, Line, TextRectPlus } from './graphic_objects.js';
import { display_local_status } from './frame.js';
import { update_3d_view } from './3d_view.js';
import { set_simulated_underlying_price_changed } from './global.js';
import { set_combo_changed } from './global.js';
import { addLog } from './log.js';
import { get_use_computed_volatility } from './global.js';
import { global_data } from './main_script.js';

import { onGraphContainerVisible } from './frame.js';

let pl_at_expiration_cursor;
let pl_at_initial_cursor;
let pl_at_sim_cursor;
let svg;
let scale_p_and_l;
let price_cursor;
let memo_price_at_mouse_down = 0;


export function compute_greeks_data_for_price(greek_index, use_legs_volatility, price) {

    const use_computed_volatility = get_use_computed_volatility();

    const interest_rate_of_combo = global_data.get_interest_rate_of_combo();
    const time_for_simulation_of_combo = global_data.get_time_for_simulation_of_active_combo();
    const mean_volatility_of_combo = global_data.get_mean_volatility_of_combo(false)
    const get_greek_scaler = global_data.get_greek_scaler();

    let greek = 0;
    global_data.get_combo_params().legs.forEach(option => {
        let v = !use_legs_volatility ? mean_volatility_of_combo :
            use_computed_volatility ? option.computed_volatility : option.iv;
        let greeks = computeOptionPrice(price, option.strike, interest_rate_of_combo, v, time_for_simulation_of_combo + option.expiration_offset, option.type);
        greek = greek + option.qty * greeks[greek_index] * get_greek_scaler[greek_index];
    });
    return { x: price, y: greek }
}
function compute_greeks_data(use_legs_volatility) {

    const num_greeks = global_data.get_computation_num_greeks();
    let greeks_data = Array.from({ length: num_greeks + 3 }, () => []);

    const minPrice = global_data.get_simul_min_price_of_combo();
    const maxPrice = global_data.get_simul_max_price_of_combo();
    const stepPrice = global_data.get_simul_step_price_of_combo();
    //const get_use_real_values = global_data.get_use_real_values();
    const get_use_real_values = get_use_computed_volatility();
    for (let price = minPrice; price <= maxPrice; price = price + stepPrice) {

        let greek_index = 0;
        for (greek_index = 0; greek_index < num_greeks; greek_index++) {
            let data = compute_greeks_data_for_price(greek_index, use_legs_volatility, price);
            greeks_data[greek_index].push(data);
        }
        if (global_data.get_combo_params().legs.length == 1) {
            // add the computation of the intrinsic value and time value
            let intrinsic_value = 0;
            let time_value = 0;
            const interest_rate_of_combo = global_data.get_interest_rate_of_combo();
            const time_for_simulation_of_combo = global_data.get_time_for_simulation_of_active_combo();
            const mean_volatility_of_combo = global_data.get_mean_volatility_of_combo(get_use_real_values)
            let greek = 0;
            global_data.get_combo_params().legs.forEach(option => {
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

    const use_computed_volatility = get_use_computed_volatility();
    const interest_rate_of_combo = global_data.get_interest_rate_of_combo();
    const simulation_time_to_expiry = global_data.get_simulation_time_to_expiry();
    const mean_volatility_of_combo = global_data.get_mean_volatility_of_combo(false)

    global_data.get_combo_params().legs.forEach(option => {
        let v = !use_legs_volatility ? mean_volatility_of_combo :
            use_computed_volatility ? option.computed_volatility : option.iv;
        let option_price = computeOptionPrice(global_data.get_underlying_price(), option.strike, interest_rate_of_combo, v, simulation_time_to_expiry + option.expiration_offset, option.type);
        let premium = option_price[0];
        let greeks = computeOptionPrice(price, option.strike, interest_rate_of_combo, v, num_days_left + option.expiration_offset, option.type);
        p_and_l_profile = p_and_l_profile + option.qty * 100 * (greeks[0] - premium);
    });

    return { x: price, y: p_and_l_profile }
}
function compute_p_and_l_data(use_legs_volatility, num_days_left) {

    const minPrice = global_data.get_simul_min_price_of_combo();
    const maxPrice = global_data.get_simul_max_price_of_combo();
    const stepPrice = global_data.get_simul_step_price_of_combo();

    let p_and_l_data = [];
    for (let price = minPrice; price <= maxPrice; price += stepPrice) {
        const data = compute_p_and_l_data_for_price(use_legs_volatility, num_days_left, price);
        p_and_l_data.push(data);
    }
    return p_and_l_data
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
export function draw_greek(graph, scale, data) {
    // Create SVG definitions for gradients
    const defs = graph.append("defs");
    create_green_gradient(defs);
    create_red_gradient(defs);

    // Define the area generator for positive values (above zero)
    const area_below = d3.area()
        .x(d => global_data.get_x_scale()(d.x))
        .y0(scale(0))  // Fill down to y=0
        .y1(d => Math.max(scale(d.y), scale(0))) // Only fill above zero
        .curve(d3.curveBasis); // Optional smoothing

    // Define the area generator for negative values (below zero)
    const area_above = d3.area()
        .x(d => global_data.get_x_scale()(d.x))
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
        .attr("stroke", "var(--pl-exp-path-color)")
        .attr("stroke-width", 2)
        .attr("d", d3.line()
            .x(d => global_data.get_x_scale()(d.x))
            .y(d => scale(d.y))
            .curve(d3.curveBasis) // Optional smoothing
        );

}
export function draw_one_sigma_area(svg, underlying_current_price, p_and_l_graph_height) {
    const get_use_real_values = get_use_computed_volatility();

    let sigma = underlying_current_price * global_data.get_mean_volatility_of_combo(get_use_real_values) * Math.sqrt(global_data.get_time_for_simulation_of_active_combo() / 365);
    let sigma_text = `σ = ${sigma.toFixed(0)}`;
    let price_less_sigma = underlying_current_price - get_sigma_factor() * sigma;
    let price_plus_sigma = underlying_current_price + get_sigma_factor() * sigma;
    let price_less_sigma_text = `${price_less_sigma.toFixed(1)}`;
    let price_plus_sigma_text = `${price_plus_sigma.toFixed(1)}`;

    svg.append("rect")
        .attr("x", global_data.get_window_left_margin() + global_data.get_x_scale()(underlying_current_price - get_sigma_factor() * sigma))
        .attr("y", global_data.get_window_top_margin())
        .attr("width", global_data.get_x_scale()(underlying_current_price + get_sigma_factor() * sigma) - global_data.get_x_scale()(underlying_current_price - get_sigma_factor() * sigma))
        .attr("height", p_and_l_graph_height)
        .attr("font-family", "Menlo, monospace")  // Set font to Menlo
        .attr("fill", "var(--sigma-area-color)")
    svg.append("text")
        .attr("x", global_data.get_window_left_margin() + global_data.get_x_scale()(underlying_current_price) - 30)
        .attr("y", global_data.get_window_top_margin() + 20)
        .attr("font-family", "Menlo, monospace")  // Set font to Menlo
        .attr("fill", "var(--text-color)")
        .text(sigma_text);
    svg.append("text")
        .attr("x", global_data.get_window_left_margin() + global_data.get_x_scale()(underlying_current_price - get_sigma_factor() * sigma) - 15)
        .attr("y", global_data.get_window_top_margin() + 15)
        .attr("font-family", "Menlo, monospace")  // Set font to Menlo
        .attr("fill", "var(--text-color)")
        .text(`-${get_sigma_factor().toFixed(1)}σ`);
    svg.append("text")
        .attr("x", global_data.get_window_left_margin() + global_data.get_x_scale()(underlying_current_price - get_sigma_factor() * sigma) - 15)
        .attr("y", global_data.get_window_top_margin() + 30)
        .attr("font-family", "Menlo, monospace")  // Set font to Menlo
        .attr("fill", "var(--text-color)")
        .text(price_less_sigma_text);
    svg.append("text")
        .attr("x", global_data.get_window_left_margin() + global_data.get_x_scale()(underlying_current_price + get_sigma_factor() * sigma) - 15)
        .attr("y", global_data.get_window_top_margin() + 15)
        .attr("font-family", "Menlo, monospace")  // Set font to Menlo
        .attr("fill", "var(--text-color)")
        .text(`+${get_sigma_factor().toFixed(1)}σ`);
    svg.append("text")
        .attr("x", global_data.get_window_left_margin() + global_data.get_x_scale()(underlying_current_price + get_sigma_factor() * sigma) - 15)
        .attr("y", global_data.get_window_top_margin() + 30)
        .attr("font-family", "Menlo, monospace")  // Set font to Menlo
        .attr("fill", "var(--text-color)")
        .text(price_plus_sigma_text);

}
export function add_y_axis_label(graph, graph_height, label) {

    graph.append("text")
        .attr("class", "y-label-std-text")             // Add your custom class
        .attr("transform", "rotate(-90)")  // Rotate text for Y-axis
        .attr("x", -graph_height / 2)            // Center the label
        .attr("y", -global_data.get_window_left_margin() + 15)      // Position left of Y-axis
        .attr("dy", "1em")                 // Fine-tune vertical alignment
        .attr("font-family", "Menlo, monospace")  // Set font to Menlo
        .style("text-anchor", "middle")    // Center alignment
        .text(label);        // Change this to your label
}
export function add_grid(graph, y_scale) {

    const defs = graph.select("defs").empty()
        ? graph.append("defs")
        : graph.select("defs");

    defs.selectAll("#clip-plot-area").remove(); // avoid duplicates

    defs.append("clipPath")
        .attr("id", "clip-plot-area")
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", p_and_l_graph_width)
        .attr("height", p_and_l_graph_height);
    const clipped_group = graph.append("g")
        .attr("clip-path", "url(#clip-plot-area)");
    clipped_group
        .append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${y_scale(0)})`)
        .call(d3.axisBottom(global_data.get_x_scale())).selectAll(".tick text").remove();

    const y_axis_grid = d3.axisLeft(y_scale)
        .tickSize(-global_data.get_window_width() + global_data.get_window_left_margin() + global_data.get_window_right_margin())
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
function create_red_gradient(defs) {
    const red_gradient = defs.append("linearGradient")
        .attr("id", "redGradient")
        .attr("x1", "0%").attr("y1", "0%")   // Start at top
        .attr("x2", "0%").attr("y2", "100%"); // End at bottom

    red_gradient.append("stop")
        .attr("offset", "0%")
        .style("stop-color", "var(--gradient-start)");

    red_gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "var(--negative-gradient-stop)");
    return red_gradient;
}
function create_green_gradient(defs) {
    const green_gradient = defs.append("linearGradient")
        .attr("id", "greenGradient")
        .attr("x1", "0%").attr("y1", "100%")  // Start at bottom
        .attr("x2", "0%").attr("y2", "0%");   // End at top

    green_gradient.append("stop")
        .attr("offset", "0%")
        .style("stop-color", "var(--gradient-start)");

    green_gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "var(--positive-gradient-stop)");
    return green_gradient;
}
export function draw_p_and_l(graph, scale) {

    // Create SVG definitions for gradients
    const defs = graph.append("defs");
    create_green_gradient(defs);
    create_red_gradient(defs);

    defs.append("clipPath")
        .attr("id", "clip-plot-area")
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", p_and_l_graph_width)
        .attr("height", p_and_l_graph_height);


    // Define the area generator for positive values (above zero)
    const area_below = d3.area()
        .x(d => global_data.get_x_scale()(d.x))
        .y0(scale(0))  // Fill down to y=0
        .y1(d => Math.max(scale(d.y), scale(0))) // Only fill above zero
        .curve(d3.curveBasis); // Optional smoothing

    // Define the area generator for negative values (below zero)
    const area_above = d3.area()
        .x(d => global_data.get_x_scale()(d.x))
        .y0(scale(0))  // Fill up to y=0
        .y1(d => Math.min(scale(d.y), scale(0))) // Only fill below zero
        .curve(d3.curveBasis);

    // Append the positive (green) gradient area
    graph.append("path")
        .datum(global_data.get_pl_at_sim_data())
        .attr("clip-path", "url(#clip-plot-area)")
        .attr("fill", "url(#greenGradient)") // Apply green gradient
        .attr("opacity", 0.6)
        .attr("d", area_above);

    // Append the negative (red) gradient area
    graph.append("path")
        .datum(global_data.get_pl_at_sim_data())
        .attr("clip-path", "url(#clip-plot-area)")
        .attr("fill", "url(#redGradient)") // Apply red gradient
        .attr("opacity", 0.6)
        .attr("d", area_below);

    // Append the line on top
    graph.append("path")
        .datum(global_data.get_pl_at_exp_data())
        .attr("clip-path", "url(#clip-plot-area)")
        .attr("fill", "none")
        .attr("stroke", "var(--pl-exp-path-color)")
        .attr("stroke-width", 2)
        .attr("d", d3.line()
            .x(d => global_data.get_x_scale()(d.x))
            .y(d => scale(d.y))
            .curve(d3.curveBasis) // Optional smoothing
        );


    let plData = global_data.get_pl_at_exp_data();  // Get P/L data
    let zeroCrossings = find_zero_crossings(plData); // Find x-values where P/L crosses zero

    // Draw vertical lines and label with price value at zero crossings X position
    zeroCrossings.forEach(x => {
        graph.append("line")
            .attr("x1", global_data.get_x_scale()(x))
            .attr("x2", global_data.get_x_scale()(x))
            .attr("y1", scale.range()[0])  // Bottom of graph
            .attr("y2", scale.range()[1])          // y = 0 line
            .attr("stroke", "var(--zero-crossing-line-color)")
            .attr("stroke-dasharray", "4,4")  // Dashed line
            .attr("stroke-width", 1);

        let zero_crossing_label = new TextRect(graph, "price", "var(--zero-crossing-line-color)");
        zero_crossing_label.set_rect_position(global_data.get_x_scale()(x) - zero_crossing_label.get_width() / 2, scale.range()[0]);
        zero_crossing_label.set_text_position(global_data.get_x_scale()(x), scale.range()[0]);
        zero_crossing_label.set_text(x.toFixed(1));
        zero_crossing_label.set_text_color("var(--zero-crossing-text-color)");
        zero_crossing_label.show();
    });



    // Append the line on top
    graph.append("path")
        .datum(global_data.get_pl_at_sim_data())
        .attr("fill", "none")
        .attr("stroke", "var(--pl-sim-path-color)")
        .attr("stroke-width", 2)
        .attr("d", d3.line()
            .x(d => global_data.get_x_scale()(d.x))
            .y(d => scale(d.y))
            .curve(d3.curveBasis) // Optional smoothing
        );

    // Append the line on top
    graph.append("path")
        .datum(global_data.get_pl_at_init_data())
        .attr("fill", "none")
        .attr("stroke", "var(--pl-init-path-color)")
        .attr("stroke-width", 2)
        .attr("d", d3.line()
            .x(d => global_data.get_x_scale()(d.x))
            .y(d => scale(d.y))
            .curve(d3.curveBasis) // Optional smoothing
        );

}
let dragging = false;
let price_shift = 0.;

export function add_crosshair() {

    const crosshair = svg.append("g");


    // Add vertical line
    crosshair.append("line")
        .attr("class", "crosshair-line")
        .attr("id", "crosshair-x")
        .attr("y1", global_data.get_window_top_margin())
        .attr("y2", global_data.get_window_height() - global_data.get_window_bottom_margin())
        .attr("stroke", "var(--crosshair-line-color)")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,4");

    // Add horizontal line
    crosshair.append("line")
        .attr("class", "crosshair-line")
        .attr("id", "crosshair-y")
        .attr("x1", global_data.get_window_left_margin())
        .attr("x2", global_data.get_window_width() - global_data.get_window_right_margin())
        .attr("stroke", "var(--crosshair-line-color)")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,4");

    pl_at_expiration_cursor = new VerticalCursor(svg, global_data.get_pl_at_exp_data(), scale_p_and_l, "pl-exp", "#808080");
    pl_at_initial_cursor = new VerticalCursor(svg, global_data.get_pl_at_init_data(), scale_p_and_l, "pl-init", "orange");
    pl_at_sim_cursor = new VerticalCursor(svg, global_data.get_pl_at_sim_data(), scale_p_and_l, "pl-sim", "green");
    price_cursor = new HorizontalCursor(svg, global_data.get_pl_at_sim_data(), scale_p_and_l, "price", "blue");
    price_cursor.set_vpos(global_data.get_window_top_margin());
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
        const price = global_data.get_x_scale().invert(x - global_data.get_window_left_margin());
        if (event.buttons === 1) {  // Check if left mouse button is pressed
            // Your code here when left mouse button is pressed
            //const mousePos = d3.pointer(event);
            //const mouseX = mousePos[0]- global_data.get_window_left_margin();
            event.preventDefault();  // Prevent default behavior (e.g., text selection)

            if (!dragging) {
                dragging = true;
                console.log("DRAG ON");
                memo_price_at_mouse_down = price;
                console.log("start price:", price.toFixed(1));
            }
            else {
                price_shift = price - memo_price_at_mouse_down;
                //console.log("shift:", price_shift.toFixed(1));
                global_data.set_simul_min_price_of_combo(global_data.get_simul_min_price_of_combo() - price_shift);
                global_data.set_simul_max_price_of_combo(global_data.get_simul_max_price_of_combo() - price_shift);
                //let svg = d3.select("#pl-container");
                //svg.selectAll("*").remove();
                draw_graph();
            }
        }


        else {
            if (dragging) {
                dragging = false;
                console.log("DRAG OFF");
            }
            memo_price_at_mouse_down = 0;
        }
        if (y < global_data.get_window_top_margin() || y > global_data.get_window_height() - global_data.get_window_bottom_margin()) {
            crosshair.style("visibility", "hidden");
            return;
        }
        if (x < global_data.get_window_left_margin() || x > global_data.get_window_width() - global_data.get_window_right_margin()) {
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


        pl_at_expiration_cursor.update(global_data, price);
        pl_at_initial_cursor.update(global_data, price);
        pl_at_sim_cursor.update(global_data, price);
        price_cursor.update(global_data, x);

    });

}
export function display_current_price(svg) {

    const x_position = global_data.get_x_scale()(global_data.get_underlying_price());
    let l = new Line(svg, global_data);
    l.set_position(x_position, -14, x_position, global_data.get_window_height());
    l.set_color("var(--current-price-rect-color)");

    let label = new TextRect(svg, "current_price", "#0055FF");
    label.set_width(80);
    label.set_rect_position(
        global_data.get_window_left_margin() + global_data.get_x_scale()(global_data.get_underlying_price()) - label.get_width() / 2,
        global_data.get_button_default_text_vpos() + 6);
    label.set_text_position(
        global_data.get_window_left_margin() + global_data.get_x_scale()(global_data.get_underlying_price()),
        global_data.get_button_default_text_vpos() + 8);
    label.set_text(`${global_data.get_underlying_price().toFixed(1)}`);
    label.set_text_color("var(--current-price-text-color)");
    label.text_element.style("cursor", "grabbing")
    label.show();

    label.text_element
        .call(d3.drag()
            .on("drag", function (event) {
                set_simulated_underlying_price_changed(true);
                let newX = Math.max(0, Math.min(global_data.get_window_width(), (event.x - global_data.get_window_left_margin())));
                d3.select(this).attr("x", newX - 15);
                let newStrike = global_data.get_x_scale().invert(newX);
                //option.strike = Math.round(newStrike);
                global_data.set_underlying_price(newStrike);
                draw_graph();
            })
        )
        .on("contextmenu", function (event) {
            event.preventDefault(); // Prevent default right-click menu
            global_data.set_underlying_price(global_data.get_original_underlying_price());
            set_simulated_underlying_price_changed(false);

            draw_graph();
        });


}
export function display_strike_buttons() {

    let index = 0;
    global_data.get_combo_params().legs.forEach(option => {

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

        const x_position = global_data.get_x_scale()(option.strike);
        let l = new Line(svg, global_data);
        l.set_position(x_position, -14, x_position, global_data.get_window_height());
        l.set_color(option.type === "call" ? "var(--call-rect-color)" : "var(--put-rect-color)");

        let label = new TextRectPlus(svg, "strike", option.type === "call" ? "var(--call-rect-color)" : "var(--put-rect-color)", option.expiration_offset);
        label.set_width(80);
        label.set_rect_position(
            global_data.get_window_left_margin() + global_data.get_x_scale()(option.strike) - label.get_width() / 2,
            global_data.get_button_default_text_vpos() - 15);
        label.set_text_position(
            global_data.get_window_left_margin() + global_data.get_x_scale()(option.strike),
            global_data.get_button_default_text_vpos() - 14);
        let ot = option.type === "call" ? "C" : "P";
        label.set_text(` ${option.qty} ${ot} ${(1.0 * option.strike).toFixed(1)}`);
        label.set_text_color("var(--put-call-text-color)");
        label.text_element.style("cursor", "grabbing")
        label.show();
        //strike_label.text_element.attr("class", "draggable-button")

        label.text_element
            .call(d3.drag()
                .on("drag", function (event) {
                    let newX = Math.max(0, Math.min(global_data.get_window_width(), (event.x - global_data.get_window_left_margin())));
                    d3.select(this).attr("x", newX - 15);
                    let newStrike = global_data.get_x_scale().invert(newX);
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
                        let option = global_data.get_combo_params().legs[current_index - 1];
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
                        let option = global_data.get_combo_params().legs[current_index - 1];
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
export function display_greeks_graph(greeks_graph_area, greeks_graphs_height) {
    let num_greeks_to_display = global_data.graph_params.greeks.ids.length;
    const greek_graph_height = Math.round(
        (greeks_graphs_height - global_data.get_window_greeks_vspacer_margin() * (num_greeks_to_display + 1)) / num_greeks_to_display
    );


    for (let index = 0; index < num_greeks_to_display; index++) {
        let greek_index = global_data.graph_params.greeks.ids[index];
        const yExtent = d3.extent(global_data.get_greeks_data()[greek_index], d => d.y);
        const min_greek = Math.min(0, yExtent[0]);  // Ensure axis is visible
        const max_greek = Math.max(0, yExtent[1]);
        const padding_greek = (max_greek - min_greek) * 0.1;
        const scale_greek = d3.scaleLinear()
            .domain([min_greek - padding_greek, max_greek + padding_greek])
            .range([greek_graph_height, 0]);
        let greek_graph = greeks_graph_area.append("g").attr("class", "greek_graph");
        let top_position = global_data.get_window_top_margin();
        top_position += index * (greek_graph_height + global_data.get_window_greeks_vspacer_margin());
        greek_graph.attr("transform", `translate(${global_data.get_window_left_margin()}, ${top_position})`);
        greek_graph.attr("width", global_data.get_window_width() - global_data.get_window_left_margin());

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
            .call(d3.axisBottom(global_data.get_x_scale()))
            .selectAll(".tick text")
            .remove();

        // Add y main label
        greek_graph.append("text")
            .attr("class", "y-label-std-text")             // Add your custom class
            .attr("transform", "rotate(-90)")  // Rotate text for Y-axis
            .attr("x", -greek_graph_height / 2)            // Center the label
            .attr("y", -global_data.get_window_left_margin() + 15)      // Position left of Y-axis
            .attr("dy", "1em")                 // Fine-tune vertical alignment
            .attr("font-family", "Menlo, monospace")  // Set font to Menlo
            .style("text-anchor", "middle")    // Center alignment
            .text(global_data.graph_params.greeks.labels[greek_index]);        // Change this to your label

        draw_greek(greek_graph, scale_greek, global_data.get_greeks_data()[greek_index]);

    }
}
let p_and_l_graph_height;
let p_and_l_graph_width;

export function display_p_and_l_graph(p_and_l_area, p_and_l_area_height) {

    // P&L graph
    const min_p_and_l = global_data.get_min_of_dataset();
    const max_p_and_l = global_data.get_max_of_dataset();
    const padding_p_and_l = (max_p_and_l - min_p_and_l) * 0.1;
    p_and_l_graph_height = p_and_l_area_height - global_data.get_window_top_margin() - global_data.get_window_vspacer_margin();
    p_and_l_graph_width = global_data.get_window_width() - global_data.get_window_left_margin() - global_data.get_window_right_margin();
    scale_p_and_l = d3.scaleLinear()
        .domain([min_p_and_l - padding_p_and_l, max_p_and_l + padding_p_and_l])
        .range([p_and_l_graph_height, 0]);
    global_data.set_x_scale(d3.scaleLinear().domain([global_data.get_simul_min_price_of_combo(), global_data.get_simul_max_price_of_combo()]).range([0, p_and_l_graph_width]));
    let p_and_l_graph = p_and_l_area.
        append("g").
        attr("class", "p_and_l_graph")
        .attr("transform", `translate(${global_data.get_window_left_margin()}, ${global_data.get_window_top_margin()})`)
        .attr("width", p_and_l_graph_width)
        .attr("height", p_and_l_graph_height)
    p_and_l_graph.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", p_and_l_graph_width)
        .attr("height", p_and_l_graph_height)
        .attr("fill", "var(--bg-right-container)");

    p_and_l_graph.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(scale_p_and_l));

    p_and_l_graph.append("g")
        .attr("transform", `translate(0,${p_and_l_graph_height})`)
        .call(d3.axisBottom(global_data.get_x_scale()))

    draw_p_and_l(p_and_l_graph, scale_p_and_l);
    add_grid(p_and_l_graph, scale_p_and_l)
    add_y_axis_label(p_and_l_graph, p_and_l_graph_height, "Profit / Loss ($)");
    draw_one_sigma_area(svg, global_data.get_underlying_price(), p_and_l_graph_height);
}
export function compute_data_to_display() {
    global_data.set_pl_at_exp_data(compute_p_and_l_data(get_volatility_is_per_leg(), 0));
    global_data.set_pl_at_init_data(compute_p_and_l_data(get_volatility_is_per_leg(), global_data.get_time_to_expiry_of_active_combo()));
    global_data.set_pl_at_sim_data(compute_p_and_l_data(get_volatility_is_per_leg(), global_data.get_time_for_simulation_of_active_combo()));

    global_data.set_greeks_data(compute_greeks_data(get_volatility_is_per_leg()));
}
function svg_cleanup(svg) {
    if (!svg) {

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
let p_and_l_graph_area;
let p_and_l_area_height;
export function draw_graph() {

    svg = svg_cleanup(svg);
    //console.log("[draw_graph] window size:", global_data.get_window_width(), global_data.get_window_height());
    onGraphContainerVisible();
    if (global_data.get_window_width() < 100 || global_data.get_window_height() < 100) {
        console.log("[draw_graph] window size too small");
        return;
    }
    //console.log("[draw_graph] window size:", global_data.get_window_width(), global_data.get_window_height());
    p_and_l_area_height = global_data.get_graph_p_and_l_ratio() * global_data.get_window_height() - global_data.get_window_vspacer_margin();
    const greeks_graph_height = global_data.get_window_height() - p_and_l_area_height;
    //console.log("[draw_graph] p_and_l_area_height:", p_and_l_area_height);
    //console.log("[draw_graph] greeks_graph_height:", greeks_graph_height);
    p_and_l_graph_area = svg
        .append("g")
        .attr("transform", `translate(0,0)`)
        .attr("width", global_data.get_window_width())
        .attr("height", p_and_l_area_height)

    let greeks_graph_area = svg
        .append("g")
        .attr("transform", `translate(0,${p_and_l_area_height + global_data.get_window_vspacer_margin()})`)
        .attr("width", global_data.get_window_width())
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

}
