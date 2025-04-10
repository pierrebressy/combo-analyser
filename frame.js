import { TabsManager } from './tabs_manager.js';
import { RadioButton } from './radiobutton.js';
import { update_3d_view, cameraPosition } from './3dview.js';
import { show_hplane, show_3dbox } from './main_script.js';
import { env, use_local, volatility_is_per_leg} from './main_script.js';
import { add_log_container_in_tab_container } from './log.js';
import { set_sigma_factor,get_sigma_factor,draw_graph } from './main_script.js';
import { set_volatility_is_per_leg,get_volatility_is_per_leg } from './main_script.js';

let tabs_manager;



export function display_sigma_selector() {
    const sigma_selector_container = d3.select("#sigma-selector-container")
    sigma_selector_container.selectAll("*").remove();
    sigma_selector_container.append("p")
        .attr("class", "checkbox-title")
        .text("Sigma");

    const sigma_factors = env.get_sigma_factors();

    const sliderWrapper = sigma_selector_container.append("div")
        .style("position", "relative")
        .style("width", "100%");

    // Create the slider input
    sliderWrapper.append("input")
        .attr("type", "range")
        .attr("min", 0)
        .attr("max", sigma_factors.length - 1) // Indices as values
        .attr("value", sigma_factors.indexOf(get_sigma_factor())) // Set the initial value
        .attr("step", 1) // Discrete steps
        .style("width", "100%")
        .style("margin-bottom", "20px") // Space for labels
        .on("input", function () {
            let index = +this.value;
            let selectedValue = sigma_factors[index];
            d3.select("#slider-label").text("Sigma Factor: " + selectedValue);
            set_sigma_factor(selectedValue);
            draw_graph();
        });

    // Create a label to display the selected value

    const tickContainer = sliderWrapper.append("div")
        .style("position", "relative")
        .style("width", "100%")
        .style("height", "20px") // Space for ticks
        .style("display", "flex")
        .style("justify-content", "space-between")
        .style("pointer-events", "none");

    tickContainer.selectAll("div")
        .data(sigma_factors)
        .enter()
        .append("div")
        .attr("class", "std-text")
        .style("position", "absolute")
        .style("left", (d, i) => `calc(${(i / (sigma_factors.length - 1)) * 95}% + 0px)`) // Center the text
        .style("text-align", "center")
        .style("width", "20px") // Small width to avoid overlap
        .style("font-size", "12px")
        .text(d => d);

}

export function display_days_left_slider() {

    const days_left_container = d3.select("#days-left-container")
    days_left_container.selectAll("*").remove();

    let days_left_text = days_left_container.append("p")
        .attr("class", "checkbox-title")
        .text("Days left:");
    days_left_container.append("input")
        .attr("type", "range")
        .attr("id", "days-left-slider")
        .attr("class", "slider-reverse")
        .attr("min", env.config.window.days_left.min)
        .attr("max", env.get_time_to_expiry_of_combo())
        .attr("value", env.get_time_for_simulation_of_combo())
        .attr("step", env.config.window.days_left.step)
        .style("width", "100%"); // Make it full width
    days_left_text.text(`Days left: ${env.get_time_for_simulation_of_combo()}/${env.get_time_to_expiry_of_combo()}`);

    d3.select("#days-left-slider").on("input", function () {
        days_left_text.text(`Days left: ${this.value}/${env.get_time_to_expiry_of_combo()}`);
        env.set_time_for_simulation(parseFloat(this.value));
        draw_graph();
    });

}

export function display_combos_list() {

    const comboContainer = d3.select("#combo-list-container")
    comboContainer.selectAll("*").remove();
    const dropdown = comboContainer.append("select")
        .attr("id", "comboBox")
        .on("change", function () {
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
        .attr("class", "std-text")
        .text("Choose combo: ");

}

export function display_volatility_sliders() {

    const per_leg_volatility_container = d3.select("#per-leg-volatility-container")
    per_leg_volatility_container.selectAll("*").remove();
    env.get_combo_params().legs.forEach((option, index) => {
        let iv_value = 100 * (env.get_use_real_values() ? option.trade_volatility : option.sim_volatility)
        let leg_vol_text = per_leg_volatility_container.append("p")
            .attr("class", "checkbox-title")
            .text(`${option.type} ${option.strike} IV ` + iv_value + "%");
        let leg_vol_slider = per_leg_volatility_container.append("input")
            .attr("type", "range")
            .attr("id", "leg_vol_slider" + index)
            .attr("min", 100 * env.get_iv_slider_min_val())
            .attr("max", 100 * env.get_iv_slider_max_val())
            .attr("value", iv_value)
            .attr("step", 100 * env.get_iv_slider_step())
            .style("width", "100%"); // Make it full width
        leg_vol_slider.on("input", function () {
            leg_vol_text.text(`${option.type} ${option.strike} IV ` + this.value + "%");
            if (env.get_use_real_values()) {
                option.trade_volatility = parseFloat(this.value / 100.0);
            } else {
                option.sim_volatility = parseFloat(this.value / 100.0);
            }
            draw_graph();
        });

    });

    const mean_volatility_container = d3.select("#mean-volatility-container")
    mean_volatility_container.selectAll("*").remove();

    let iv_value = 100 * env.get_mean_volatility_of_combo(env.get_use_real_values());
    let mean_vol_text = mean_volatility_container.append("p")
        .attr("class", "checkbox-title")
        .text("Mean Volatility " + iv_value + "%");
    let mean_vol_slider = mean_volatility_container.append("input")
        .attr("type", "range")
        .attr("id", "mean_vol_slider")
        .attr("min", 100 * env.get_iv_slider_min_val())
        .attr("max", 100 * env.get_iv_slider_max_val())
        .attr("value", iv_value)
        .attr("step", 100 * env.get_iv_slider_step())
        .style("width", "100%"); // Make it full width
    d3.select("#mean_vol_slider").on("input", function () {
        mean_vol_text.text("Mean Volatility " + this.value + "%");
        env.set_mean_volatility_of_combo(env.get_use_real_values(), parseFloat(this.value / 100.0));
        draw_graph();
    });






    // Display the IV value next to the slider
    //const value_display = document.createElement('span');
    //value_display.textContent = ` ${slider.value} %`;
    //slider.addEventListener('input', () => {
    //    value_display.textContent = ` ${slider.value} %`;
    //    env.set_mean_volatility_of_combo(env.get_use_real_values(), parseFloat(slider.value / 100.0));
    //    draw_graph();
    //});


    //document.getElementById('ivCheckbox').addEventListener('change', display_volatility_sliders);

}

export function display_checkbox_for_volatility_mode() {

    const volatility_main_container = d3.select("#volatility-main-container")
    volatility_main_container.selectAll("*").remove();
    const per_leg_volatility_container = d3.select("#per-leg-volatility-container")
    const mean_volatility_container = d3.select("#mean-volatility-container")

    volatility_main_container.append("p")
        .attr("class", "checkbox-title")
        .text("Volatility Management");
    const checkbox = volatility_main_container.append("input")
        .attr("type", "checkbox")
        .attr("id", "myCheckbox2")
        .attr("name", "Volatility by leg")
        .attr("checked", get_volatility_is_per_leg() ? "checked" : null);
    volatility_main_container.append("label")
        .attr("for", "myCheckbox2")
        .attr("class", "std-text")
        .text(" Volatility by leg");
    if (get_volatility_is_per_leg()) {
        per_leg_volatility_container.style("display", "block"); // Show the new container
        mean_volatility_container.style("display", "none"); // Show the new container
    } else {
        per_leg_volatility_container.style("display", "none"); // Hide the new container
        mean_volatility_container.style("display", "block"); // Hide the new container
    }
    display_volatility_sliders();

    checkbox.on("change", function () {
        set_volatility_is_per_leg(this.checked);
        if (this.checked) {
            per_leg_volatility_container.style("display", "block"); // Show the new container
            mean_volatility_container.style("display", "none"); // Show the new container
        } else {
            per_leg_volatility_container.style("display", "none"); // Hide the new container
            mean_volatility_container.style("display", "block"); // Hide the new container
        }
        display_volatility_sliders();
        draw_graph();
    });
}

function handleRadioChange() {
    if (this.checked) {
        env.set_3d_view(this.value);
        update_3d_view();
    }
}

function add_view3d_control_sliders(view3d_controler_container) {
    let zoomGroup = document.createElement('div');
    zoomGroup.style.display = "flex";
    zoomGroup.style.alignItems = "bottom";
    zoomGroup.style.gap = "5px"; // Optional spacing between label and slider


    const sliderCamDistContainer = document.createElement("div");
    sliderCamDistContainer.style.display = "flex";
    sliderCamDistContainer.style.alignItems = "bottom";
    sliderCamDistContainer.style.gap = "10px"; // Optional spacing between label and slider
    const slider_cam_dist = document.createElement("input");
    slider_cam_dist.setAttribute("type", "range");
    slider_cam_dist.setAttribute("min", 2);
    slider_cam_dist.setAttribute("max", 100); // Indices as values
    slider_cam_dist.setAttribute("value", cameraPosition.dist); // Set the initial value
    slider_cam_dist.setAttribute("step", 1); // Discrete steps
    slider_cam_dist.style.width = "50%";
    slider_cam_dist.style.marginBottom = "20px"; // Space for labels
    slider_cam_dist.addEventListener("input", function () {
        cameraPosition.dist = this.value;
        d3.select("#camera-position-zpos-label").text("dist=" + this.value);
        update_3d_view();
    });
    const slider_cam_dist_label = document.createElement("text");
    slider_cam_dist_label.setAttribute("class", "checkbox-title");
    slider_cam_dist_label.setAttribute("id", "camera-position-zpos-label");
    slider_cam_dist_label.textContent = "dist=" + cameraPosition.dist;
    slider_cam_dist_label.style.display = "inline-block";
    slider_cam_dist_label.style.width = "55px"; // 👈 fixed space
    sliderCamDistContainer.appendChild(slider_cam_dist_label);
    sliderCamDistContainer.appendChild(slider_cam_dist);
    zoomGroup.appendChild(sliderCamDistContainer);
    view3d_controler_container.appendChild(zoomGroup);



    const sliderZRotContainer = document.createElement("div");
    sliderZRotContainer.style.display = "flex";
    sliderZRotContainer.style.alignItems = "bottom";
    sliderZRotContainer.style.gap = "10px"; // Optional spacing between label and slider
    const slider_zrotation = document.createElement("input");
    slider_zrotation.setAttribute("type", "range");
    slider_zrotation.setAttribute("min", -360);
    slider_zrotation.setAttribute("max", 360); // Indices as values
    slider_zrotation.setAttribute("value", cameraPosition.z_rotation); // Set the initial value
    slider_zrotation.setAttribute("step", 1); // Discrete steps
    slider_zrotation.style.width = "50%";
    slider_zrotation.style.marginBottom = "20px"; // Space for labels
    slider_zrotation.addEventListener("input", function () {
        cameraPosition.z_rotation = this.value;
        d3.select("#camera-position-zrot-label").text("θ=" + this.value + "°");
        update_3d_view();
    });
    const slider_zrotation_label = document.createElement("text");
    slider_zrotation_label.setAttribute("class", "checkbox-title");
    slider_zrotation_label.setAttribute("id", "camera-position-zrot-label");
    slider_zrotation_label.textContent = "θ=" + cameraPosition.z_rotation + "°";
    slider_zrotation_label.style.display = "inline-block";
    slider_zrotation_label.style.width = "55px"; // 👈 fixed space
    sliderZRotContainer.appendChild(slider_zrotation_label);
    sliderZRotContainer.appendChild(slider_zrotation);
    zoomGroup.appendChild(sliderZRotContainer);
    view3d_controler_container.appendChild(zoomGroup);




    const sliderViewAngleContainer = document.createElement("div");
    sliderViewAngleContainer.style.display = "flex";
    sliderViewAngleContainer.style.alignItems = "bottom";
    sliderViewAngleContainer.style.gap = "10px"; // Optional spacing between label and slider
    const slider_view_angle = document.createElement("input");
    slider_view_angle.setAttribute("type", "range");
    slider_view_angle.setAttribute("min", -90);
    slider_view_angle.setAttribute("max", 90); // Indices as values
    slider_view_angle.setAttribute("value", cameraPosition.view_angle); // Set the initial value
    slider_view_angle.setAttribute("step", 1); // Discrete steps
    slider_view_angle.style.width = "50%";
    slider_view_angle.style.marginBottom = "20px"; // Space for labels
    slider_view_angle.addEventListener("input", function () {
        cameraPosition.view_angle = this.value;
        d3.select("#camera-view-angle-label").text("α=" + this.value + "°");
        update_3d_view();
    });
    const slider_view_angle_label = document.createElement("text");
    slider_view_angle_label.setAttribute("class", "checkbox-title");
    slider_view_angle_label.setAttribute("id", "camera-view-angle-label");
    slider_view_angle_label.textContent = "α=" + cameraPosition.view_angle + "°";
    slider_view_angle_label.style.display = "inline-block";
    slider_view_angle_label.style.width = "55px"; // 👈 fixed space
    sliderViewAngleContainer.appendChild(slider_view_angle_label);
    sliderViewAngleContainer.appendChild(slider_view_angle);
    zoomGroup.appendChild(sliderViewAngleContainer);
    view3d_controler_container.appendChild(zoomGroup);


    const sliderZoomContainer = document.createElement("div");
    sliderZoomContainer.style.display = "flex";
    sliderZoomContainer.style.alignItems = "bottom";
    sliderZoomContainer.style.gap = "10px"; // Optional spacing between label and slider
    const slider_zoom = document.createElement("input");
    slider_zoom.setAttribute("type", "range");
    slider_zoom.setAttribute("min", 0.1);
    slider_zoom.setAttribute("max", 10); // Indices as values
    slider_zoom.setAttribute("value", cameraPosition.z_zoom_factor); // Set the initial value
    slider_zoom.setAttribute("step", 0.1); // Discrete steps
    slider_zoom.style.width = "50%";
    slider_zoom.style.marginBottom = "20px"; // Space for labels
    slider_zoom.addEventListener("input", function () {
        cameraPosition.z_zoom_factor = this.value;
        d3.select("#camera-position-zoom-label").text("Z x" + this.value);
        update_3d_view();
    });
    const slider_zoom_label = document.createElement("text");
    slider_zoom_label.setAttribute("class", "checkbox-title");
    slider_zoom_label.setAttribute("id", "camera-position-zoom-label");
    slider_zoom_label.textContent = "Z x" + cameraPosition.z_zoom_factor;
    slider_zoom_label.style.display = "inline-block";
    slider_zoom_label.style.width = "55px"; // 👈 fixed space
    sliderZoomContainer.appendChild(slider_zoom_label);
    sliderZoomContainer.appendChild(slider_zoom);
    zoomGroup.appendChild(sliderZoomContainer);


    const showHplaneContainer = document.createElement("div");
    showHplaneContainer.setAttribute("class", "simple_checkbox")
    const showHplane_label = document.createElement("text");
    showHplane_label.setAttribute("class", "std-text")
    showHplane_label.textContent = "Plane  ";
    const showHplane_checkbox = document.createElement("input");
    showHplane_checkbox.setAttribute("type", "checkbox");
    showHplane_checkbox.setAttribute("id", "show-hplane-container");
    showHplane_checkbox.setAttribute("name", "show-hplane-container");
    showHplane_checkbox.checked = show_hplane;
    showHplane_checkbox.addEventListener("change", function () {
        show_hplane = this.checked;
        update_3d_view();
    });
    showHplaneContainer.appendChild(showHplane_label);
    showHplaneContainer.appendChild(showHplane_checkbox);
    zoomGroup.appendChild(showHplaneContainer);

    const show3DBoxContainer = document.createElement("div");
    show3DBoxContainer.setAttribute("class", "simple_checkbox")
    const show3DBox_label = document.createElement("text");
    show3DBox_label.setAttribute("class", "std-text")
    show3DBox_label.textContent = "3DBox ";
    const show3DBox_checkbox = document.createElement("input");
    show3DBox_checkbox.setAttribute("type", "checkbox");
    show3DBox_checkbox.setAttribute("id", "show-3dbox-container");
    show3DBox_checkbox.setAttribute("name", "show-3dbox-container");
    show3DBox_checkbox.checked = show_3dbox;
    show3DBox_checkbox.addEventListener("change", function () {
        show_3dbox = this.checked;
        update_3d_view();
    });
    show3DBoxContainer.appendChild(show3DBox_label);
    show3DBoxContainer.appendChild(show3DBox_checkbox);
    zoomGroup.appendChild(show3DBoxContainer);

    const cmapStyleContainer = document.createElement("div");
    cmapStyleContainer.setAttribute("class", "simple_checkbox")
    const cmapStyle_label = document.createElement("text");
    cmapStyle_label.setAttribute("class", "std-text")
    cmapStyle_label.textContent = "R+G ";
    const cmapStyle_checkbox = document.createElement("input");
    cmapStyle_checkbox.setAttribute("type", "checkbox");
    cmapStyle_checkbox.setAttribute("id", "cmap-style-container");
    cmapStyle_checkbox.setAttribute("name", "cmap-style-container");
    cmapStyle_checkbox.checked = show_3dbox;
    cmapStyle_checkbox.addEventListener("change", function () {
        two_colors_cmap = this.checked;
        update_3d_view();
    });
    cmapStyleContainer.appendChild(cmapStyle_label);
    cmapStyleContainer.appendChild(cmapStyle_checkbox);
    zoomGroup.appendChild(cmapStyleContainer);

}

function add_view3d_controler_container_in_view3d_container(view3d_container) {
    const view3d_controler_container = document.createElement('div');
    view3d_controler_container.classList.add('view3d-controler-container');
    view3d_controler_container.id = 'view3d-controler-container';
    let heading = document.createElement('h2');
    heading.classList.add('std-text');
    heading.textContent = 'VIEW 3D CONTROLLER';
    let paragraph = document.createElement('p');
    paragraph.classList.add('std-text');
    paragraph.textContent = 'Here goes your content.';
    //view3d_controler_container.appendChild(heading);
    //view3d_controler_container.appendChild(paragraph);

    view3d_container.appendChild(view3d_controler_container);

    add_view3d_control_radio(view3d_controler_container);
    add_view3d_control_sliders(view3d_controler_container);

}

function add_view3d_control_radio(view3d_controler_container) {
    let radioGroup = document.createElement('div');
    radioGroup.id = 'radio-group';
    let radio1 = new RadioButton('3d-options', 'P/L', handleRadioChange);
    radio1.appendTo(radioGroup);
    radio1.radio.checked = true;  // ← This makes it selected
    //radioGroup.appendChild(document.createElement('br')); // Line break for spacing
    new RadioButton('3d-options', 'Delta', handleRadioChange).appendTo(radioGroup);
    new RadioButton('3d-options', 'Gamma', handleRadioChange).appendTo(radioGroup);
    new RadioButton('3d-options', 'Theta', handleRadioChange).appendTo(radioGroup);
    new RadioButton('3d-options', 'Vega', handleRadioChange).appendTo(radioGroup);
    new RadioButton('3d-options', 'Rho', handleRadioChange).appendTo(radioGroup);
    view3d_controler_container.appendChild(radioGroup);
}

function add_view3d_gragh_container_in_view3d_container(view3d_container) {
    const view3d_graph_container = document.createElement('div');
    view3d_graph_container.classList.add('view3d-graph-container');
    view3d_graph_container.id = 'view3d-graph-container';
    let heading = document.createElement('h2');
    heading.classList.add('std-text');
    heading.textContent = 'VIEW 3D GRAPH';
    let paragraph = document.createElement('p');
    paragraph.classList.add('std-text');
    paragraph.textContent = 'Here goes your content.';
    //view3d_graph_container.appendChild(heading);
    //view3d_graph_container.appendChild(paragraph);

    view3d_container.appendChild(view3d_graph_container);
}

function create_left_container(body) {

    const leftContainer = document.createElement('div');
    leftContainer.classList.add('left-container');
    leftContainer.id = 'left-container';

    const leftContent = document.createElement('div');
    const leftHeading = document.createElement('h2');
    leftHeading.textContent = 'LEFT CONTAINER';
    const leftParagraph = document.createElement('p');
    leftParagraph.textContent = 'Here goes your left content.';
    leftContent.appendChild(leftHeading);
    leftContent.appendChild(leftParagraph);

    leftContainer.appendChild(leftContent);

    return leftContainer;
}

function create_right_container(tab_active) {
    let container;
    const right_container = document.createElement('div');
    right_container.classList.add('right-container');
    right_container.id = 'right-container';

    tabs_manager = new TabsManager(right_container, tab_active);

    container = tabs_manager.add_tab('P/L Graph', 'pl-tab-container', 'pl-container');
    container = tabs_manager.add_tab('3D View', 'view3d-tab-container', 'view3d-container', update_3d_view);
    add_view3d_controler_container_in_view3d_container(container);
    add_view3d_gragh_container_in_view3d_container(container);

    container = tabs_manager.add_tab('Logs', 'log-tab-container', 'log-container');
    add_log_container_in_tab_container(container);

    container = tabs_manager.add_tab('Test', 'test-tab-container', 'test-container');

    return right_container;

}

export function create_main_frame(tab_active) {
    const body = document.body;
    let leftContainer = create_left_container();
    let rightContainer = create_right_container(tab_active);
    body.appendChild(leftContainer);
    body.appendChild(rightContainer);
    return;
}