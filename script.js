import { computeOptionPrice } from './functions.js';

class Configuration {

    constructor(config) {
        // Attributes (properties)
        this.config = config;
        this.combo = this.get_combo();
        this.simulation = this.get_simulation();
    }
    get_window() {
        return this.config.window;
    }
    get_combo() {
        return this.config.combos[this.config.config.combo];
    }
    get_simulation() {
        return this.combo.simulation;
    }
    set_underlying_current_price(price) {
        this.config.underlying_current_price = price;
    }
    get_underlying_current_price() {
        return this.config.underlying_current_price;
    }
    get_ticker() {
        return this.combo.ticker;
    }
    get_time_to_expiry() {
        return this.combo.simulation.time_to_expiry;
    }
    get_time_for_simulation() {
        return this.combo.simulation.time_for_simulation;
    }
    set_time_for_simulation(time) {
        this.combo.simulation.time_for_simulation = time;
    }
    get_max_price() {
        return this.combo.simulation.max_price;
    }
    get_min_price() {
        return this.combo.simulation.min_price;
    }
    get_step() {
        return this.combo.simulation.step;
    }
    get_volatility() {
        return this.combo.simulation.volatility;
    }
    set_volatility(volatility) {
        this.combo.simulation.volatility = volatility;
    }
    get_interest_rate() {
        return this.combo.simulation.interest_rate;
    }
}
let use_local = true;
let cfg;
let svg;
let x_scale;

let local_config= {    
    "underlying_current_price": 335,
    "config": {
        "combo": "001"
    },
    "combos": {
        "001": {
            "ticker": "TSLA",
            "legs": [
                {
                    "qty": 1,
                    "type": "put",
                    "strike": 315,
                    "volatility": 0.4
                },
                {
                    "qty": -1,
                    "type": "put",
                    "strike": 300,
                    "volatility": 0.4
                },
                {
                    "qty": -1,
                    "type": "put",
                    "strike": 265,
                    "volatility": 0.41
                }
            ],
            "simulation": {
                "min_price": 240,
                "max_price": 340,
                "step": 1,
                "volatility": 0.4,
                "interest_rate": 0.0,
                "time_to_expiry": 35,
                "time_for_simulation": 15
            }
        }
    },
    "window": {
        "width": 1600,
        "height": 800,
        "p_and_l_ratio": 0.5,
        "margin": {
            "top": 40,
            "right": 20,
            "bottom": 40,
            "left": 80,
            "vspacer": 20,
            "greeks_vspacer": 20,
            "price_axis": 17
        },
        "button": {
            "width": 85,
            "height": 25,
            "text_vpos": 15
        }
    },
    "graph": {
        "greeks": {
            "labels": [
                "Premium",
                "Delta",
                "Gamma",
                "Theta",
                "Vega",
                "Rho"
            ],
            "ids": [
                1,
                2,
                3,
                4
            ]
        }
    }
}

async function fetch_configuration() {
    const response = await fetch("http://127.0.0.1:5000/config");
    return response.json();
}

async function fetch_price(ticker) {
    const response = await fetch("http://127.0.0.1:5000/price/" + ticker);
    return response.json();
}

function add_strike_lines(svg, cfg) {

    const window = cfg.get_window();
    const combo = cfg.get_combo();

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

    const window = cfg.get_window();
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

    const window = cfg.get_window();
    const combo = cfg.get_combo();

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

    const window = cfg.get_window();

    // Add draggable buttons for call & put
    let p_and_l_graph = d3.select("p_and_l_graph");
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

    graph.append("text")
        .attr("x", window.margin.left + x_scale(cfg.get_underlying_current_price()) + 4 - button_width / 2)
        .attr("y", window.button.text_vpos)
        .attr("fill", "white")
        .attr("class", "draggable-button")
        .attr("cursor", "pointer")
        .text(`${cfg.get_underlying_current_price()}`)
        .call(d3.drag()
            .on("drag", function (event) {
                let newX = Math.max(0, Math.min(window.width, (event.x - window.margin.left)));
                d3.select(this).attr("x", newX - 15);
                let newStrike = x_scale.invert(newX);
                cfg.set_underlying_current_price(Math.round(newStrike));
                draw_graph();
            })
        );

}

function compute_p_and_l_data(cfg, use_legs_volatility, num_days_left) {

    const combo = cfg.get_combo();
    const simulation = cfg.get_simulation();

    let p_and_l_data = [];

    for (let price = cfg.get_min_price(); price <= cfg.get_max_price(); price += cfg.get_step()) {
        let p_and_l_profile = 0;
        combo.legs.forEach(option => {
            let v = use_legs_volatility ? option.volatility : simulation.volatility;
            let option_price = computeOptionPrice(cfg.get_underlying_current_price(), option.strike, cfg.get_interest_rate(), v, simulation.time_to_expiry, option.type);
            let premium = option_price[0];
            let greeks = computeOptionPrice(price, option.strike, cfg.get_interest_rate(), v, num_days_left, option.type);
            p_and_l_profile = p_and_l_profile + option.qty * 100 * (greeks[0] - premium);
        });
        p_and_l_data.push({ x: price, y: p_and_l_profile });
    }
    return p_and_l_data
}

function compute_greeks_data(cfg, use_legs_volatility) {

    const simulation = cfg.get_simulation();
    const combo = cfg.get_combo();
    let greeks_data = [[], [], [], [], [], []];

    for (let price = cfg.get_min_price(); price <= cfg.get_max_price(); price += cfg.get_step()) {

        const num_greeks = 6;
        let greek_index = 0;
        let greek_scaler = [1, 100, 100, 100, 100, 100];
        for (greek_index = 0; greek_index < num_greeks; greek_index++) {
            let greek = 0;
            combo.legs.forEach(option => {
                let v = use_legs_volatility ? option.volatility : cfg.get_volatility();
                let greeks = computeOptionPrice(price, option.strike, cfg.get_interest_rate(), v, cfg.get_time_for_simulation(), option.type);
                greek = greek + option.qty * greeks[greek_index] * greek_scaler[greek_index];
            });
            greeks_data[greek_index].push({ x: price, y: greek });
        }
    }
    return greeks_data;
}

async function update_volatility_sliders() {

    const use_legs_volatility_checkbox = document.getElementById('use_legs_volatility_checkbox');
    const sliders_container = document.getElementById('sliders_container');
    cfg = new Configuration(use_local ? local_config : await fetch_configuration());
    local_config
    const combo = cfg.get_combo();

    // Clear existing sliders
    sliders_container.innerHTML = '';

    if (use_legs_volatility_checkbox.checked) {

        // Multiple sliders for each leg
        combo.legs.forEach((option, index) => {
            const slider_container = document.createElement('div');
            const label = document.createElement('label');
            label.textContent = `${option.type} - Strike: ${option.strike} IV`;

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = 0;
            slider.max = 1;  // You can adjust this range as needed
            slider.step = 0.01;
            slider.value = option.volatility;// || 0.2;  // Assuming you store IV in each option's volatility

            // Display the IV value next to the slider
            const value_display = document.createElement('span');
            value_display.textContent = ` ${slider.value}`;
            slider.addEventListener('input', () => {
                value_display.textContent = ` ${slider.value}`;
                option.volatility = parseFloat(slider.value);
                //console.log("=> new option.volatility("+index+")="+option.volatility);
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
        label.textContent = 'Mean volatility';
        //console.log(config);
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = 0;
        slider.max = 1;  // Adjust this range as needed
        slider.step = 0.01;
        slider.value = cfg.get_volatility();

        // Display the IV value next to the slider
        const value_display = document.createElement('span');
        value_display.textContent = ` ${slider.value}`;
        slider.addEventListener('input', () => {
            value_display.textContent = ` ${slider.value}`;
            cfg.set_volatility(parseFloat(slider.value));
            //console.log("config.volatility="+config.volatility);
            draw_graph();
        });

        slider_container.appendChild(label);
        slider_container.appendChild(slider);
        slider_container.appendChild(value_display);

        sliders_container.appendChild(slider_container);
    }
}

async function update_time_slider() {
    // Fetch the config each time the slider needs to be updated
    cfg = new Configuration(use_local ? local_config : await fetch_configuration());

    // Get the container for the time slider
    const time_slider_container = document.getElementById('timeSliderContainer');

    // Clear existing sliders
    time_slider_container.innerHTML = '';

    // Create the time slider
    const slider_container = document.createElement('div');
    const label = document.createElement('label');
    label.textContent = 'Days left';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0;
    slider.max = cfg.get_time_to_expiry();  // You can set this to a maximum value from config
    slider.step = 1;
    slider.value = cfg.get_time_for_simulation();  // Set the default value from config

    // Display the time value next to the slider
    const value_display = document.createElement('span');
    value_display.textContent = ` ${slider.value}`;
    slider.addEventListener('input', () => {
        value_display.textContent = ` ${slider.value}`;
        cfg.set_time_for_simulation(parseInt(slider.value));
        draw_graph();
    });

    slider_container.appendChild(label);
    slider_container.appendChild(slider);
    slider_container.appendChild(value_display);

    time_slider_container.appendChild(slider_container);
}


function draw_p_and_l(graph, scale, pl_at_expiration_data, pl_at_initial_data, pl_at_sim_date_data) {
    // Create SVG definitions for gradients
    const defs = graph.append("defs");

    // Green gradient for positive areas
    const greenGradient = defs.append("linearGradient")
        .attr("id", "greenGradient")
        .attr("x1", "0%").attr("y1", "100%")  // Start at bottom
        .attr("x2", "0%").attr("y2", "0%");   // End at top

    greenGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "white");

    greenGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "green");

    // Red gradient for negative areas
    const redGradient = defs.append("linearGradient")
        .attr("id", "redGradient")
        .attr("x1", "0%").attr("y1", "0%")   // Start at top
        .attr("x2", "0%").attr("y2", "100%"); // End at bottom

    redGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "white");

    redGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "red");

    // Define the area generator for positive values (above zero)
    const areaBelow = d3.area()
        .x(d => x_scale(d.x))
        .y0(scale(0))  // Fill down to y=0
        .y1(d => Math.max(scale(d.y), scale(0))) // Only fill above zero
        .curve(d3.curveBasis); // Optional smoothing

    // Define the area generator for negative values (below zero)
    const areaAbove = d3.area()
        .x(d => x_scale(d.x))
        .y0(scale(0))  // Fill up to y=0
        .y1(d => Math.min(scale(d.y), scale(0))) // Only fill below zero
        .curve(d3.curveBasis);

    // Append the positive (green) gradient area
    graph.append("path")
        .datum(pl_at_expiration_data)
        .attr("fill", "url(#greenGradient)") // Apply green gradient
        .attr("opacity", 0.6)
        .attr("d", areaAbove);

    // Append the negative (red) gradient area
    graph.append("path")
        .datum(pl_at_expiration_data)
        .attr("fill", "url(#redGradient)") // Apply red gradient
        .attr("opacity", 0.6)
        .attr("d", areaBelow);

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
    const greenGradient = defs.append("linearGradient")
        .attr("id", "greenGradient")
        .attr("x1", "0%").attr("y1", "100%")  // Start at bottom
        .attr("x2", "0%").attr("y2", "0%");   // End at top

    greenGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "white");

    greenGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "green");

    // Red gradient for negative areas
    const redGradient = defs.append("linearGradient")
        .attr("id", "redGradient")
        .attr("x1", "0%").attr("y1", "0%")   // Start at top
        .attr("x2", "0%").attr("y2", "100%"); // End at bottom

    redGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "white");

    redGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "red");

    // Define the area generator for positive values (above zero)
    const areaBelow = d3.area()
        .x(d => x_scale(d.x))
        .y0(scale(0))  // Fill down to y=0
        .y1(d => Math.max(scale(d.y), scale(0))) // Only fill above zero
        .curve(d3.curveBasis); // Optional smoothing

    // Define the area generator for negative values (below zero)
    const areaAbove = d3.area()
        .x(d => x_scale(d.x))
        .y0(scale(0))  // Fill up to y=0
        .y1(d => Math.min(scale(d.y), scale(0))) // Only fill below zero
        .curve(d3.curveBasis);

    // Append the positive (green) gradient area
    graph.append("path")
        .datum(data)
        .attr("fill", "url(#greenGradient)") // Apply green gradient
        .attr("opacity", 0.6)
        .attr("d", areaAbove);

    // Append the negative (red) gradient area
    graph.append("path")
        .datum(data)
        .attr("fill", "url(#redGradient)") // Apply red gradient
        .attr("opacity", 0.6)
        .attr("d", areaBelow);

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

async function draw_graph() {

    //if (!config) config = await fetch_configuration();
    if (!cfg) cfg = new Configuration(use_local ? local_config : await fetch_configuration());

    const window = cfg.get_window();

    let ticker = cfg.get_ticker()
    let r = use_local ? 0 : await fetch_price(ticker);
    if(!use_local)
        cfg.set_underlying_current_price(use_local ? cfg.underlying_current_price : r.price);
    console.log(ticker, r.price)

    // get the data
    let pl_at_expiration_data = compute_p_and_l_data(cfg, use_legs_volatility_checkbox.checked, 0);
    let pl_at_initial_data = compute_p_and_l_data(cfg, use_legs_volatility_checkbox.checked, cfg.get_time_to_expiry());
    let pl_at_sim_date_data = compute_p_and_l_data(cfg, use_legs_volatility_checkbox.checked, cfg.get_time_for_simulation());
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
    x_scale = d3.scaleLinear().domain([cfg.get_min_price(), cfg.get_max_price()]).range([0, graph_width]);
    let y_offset = window.margin.top + window.height + window.margin.vspacer;
    y_offset = window.height - window.margin.price_axis;
    svg.append("g").attr("transform", `translate(${window.margin.left},${y_offset})`).call(d3.axisBottom(x_scale));


    // P&L and Greeks graph areas
    const p_and_l_graph_height = window.p_and_l_ratio * (window.height - window.margin.top - window.margin.bottom - window.margin.vspacer);
    const greeks_graphs_height = window.height - p_and_l_graph_height - window.margin.top - window.margin.bottom - window.margin.vspacer;
    //console.log("p_and_l_graph_height", p_and_l_graph_height);
    //console.log("greeks_graphs_height", greeks_graphs_height);

    let p_and_l_graph_area = svg
        .append("g")
        .attr("width", window.width)
        .attr("height", p_and_l_graph_height);

    let greeks_graph_area = svg
        .append("g")
        .attr("width", window.width)
        .attr("height", greeks_graphs_height);

    // P&L graph
    const min_p_and_l = d3.min(pl_at_expiration_data, d => d.y);
    const max_p_and_l = d3.max(pl_at_expiration_data, d => d.y);
    const padding_p_and_l = (max_p_and_l - min_p_and_l) * 0.1;
    const scale_p_and_l = d3.scaleLinear()
        .domain([min_p_and_l - padding_p_and_l, max_p_and_l + padding_p_and_l])
        .range([p_and_l_graph_height, 0]);

    let p_and_l_graph = p_and_l_graph_area.append("g").attr("class", "p_and_l_graph");
    p_and_l_graph.attr("transform", `translate(${window.margin.left}, ${window.margin.top})`);
    p_and_l_graph.attr("width", window.width - window.margin.left);
    p_and_l_graph.append("g").call(d3.axisLeft(scale_p_and_l));
    p_and_l_graph.append("g").attr("transform", `translate(0,${scale_p_and_l(0)})`).call(d3.axisBottom(x_scale)).selectAll(".tick text").remove();

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

        //const line1 = d3.line().x(d => x_scale(d.x)).y(d => scale_greek(d.y));
        //greek_graph.append("path").datum(greeks_data[greek_index]).attr("fill", "none").attr("stroke", "blue").attr("stroke-width", 2).attr("d", line1);
    }

    add_strike_lines(svg, cfg);
    create_strike_buttons(p_and_l_graph, cfg);
    create_underlying_current_price_buttons(svg, cfg);

}

draw_graph();
update_time_slider();
update_volatility_sliders();
document.getElementById('use_legs_volatility_checkbox').addEventListener('change', update_volatility_sliders);
