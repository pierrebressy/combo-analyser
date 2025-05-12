import { TabsManager } from './tabs_manager.js';
import { update_remote_config } from './network.js';
import { RadioButton } from './radiobutton.js';
import { update_3d_view, cameraPosition } from './3d_view.js';
import { add_log_container_in_tab_container, addLog } from './log.js';
import { draw_graph } from './2d_graph.js';
import { set_volatility_is_per_leg, get_volatility_is_per_leg } from './global.js';
import { set_use_computed_volatility, get_use_computed_volatility } from './global.js';
import { get_computed_volatility_available } from './global.js';
import { set_dark_mode, get_dark_mode } from './global.js';
import { set_auto_save, get_auto_save } from './global.js';
import { set_sigma_factor, get_sigma_factor } from './global.js';
import { set_two_colors_cmap, get_two_colors_cmap } from './global.js';
import { set_show_hplane, get_show_hplane } from './global.js';
import { set_show_3dbox, get_show_3dbox } from './global.js';
import { get_combo_changed } from './global.js';
import { get_simulated_underlying_price_changed } from './global.js';
import { get_use_local } from './global.js';
import { add_option_chain_container_in_tab_container } from './option_chain.js';
import { cookie_manager } from './cookie.js';
import { add_polygon_container_in_tab_container, addPolygonLog } from './polygon.js';
import { global_data } from './main_script.js';

let tabs_manager;

export function display_combos_list() {

    const comboContainer = d3.select("#combo-list-container")
    comboContainer.selectAll("*").remove();
    const dropdown = comboContainer.append("select")
        .attr("id", "comboBox")
        .on("change", function () {
            global_data.set_active_combo_name(this.value);
            if (!get_use_local()) {
                //update_remote_config(env.config);
                //console.log("Remote config updated", env.config);
                //env = 0
                alert("Remote config not updated - need to adapt with DataManager");
            }
            cookie_manager.set_cookie("active_combo_name", this.value, 365);
            location.reload();
            this.value = cookie_manager.get_cookie("active_combo_name");

        });
    //console.log("get_active_combo_name", global_data.get_active_combo_name());
    dropdown.selectAll("option")
        .data(global_data.get_combos_names_list())
        .enter()
        .append("option")
        .text(d => d)
        .attr("value", d => d)
        .attr("selected", d => d === global_data.get_active_combo_name() ? "selected" : null);
    comboContainer.insert("label", "#comboBox")
        .attr("class", "std-text")
        .text("Choose combo: ");

}
export function display_local_status() {

    const local_status_container = d3.select("#local-status-container")
    local_status_container.selectAll("*").remove();

    /*local_status_container.append("p")
        .attr("class", "checkbox-title")
        .text(" The Local Status Info");*/

    const status = local_status_container.append("p")
        .attr("class", "checkbox-title");

    status.append("span")
        .attr("class", "status-icon sun-icon")
        .text("🌞")
        .style("cursor", "pointer")
        .on("click", () => {
            console.log("Sun clicked – switch to light mode?");
            set_dark_mode(get_dark_mode() == "DARK" ? 0 : 1);
            d3.select("body").classed("dark-mode", get_dark_mode() == "DARK");
            d3.select("body").classed("light-mode", get_dark_mode() != "DARK");
        });

    // MOON icon
    status.append("span")
        .attr("class", "status-icon moon-icon")
        .text("🌙")
        .style("cursor", "pointer")
        .on("click", () => {
            console.log("Moon clicked – switch to dark mode?");
            set_dark_mode(get_dark_mode() == "DARK" ? 0 : 1);
            d3.select("body").classed("dark-mode", get_dark_mode() == "DARK");
            d3.select("body").classed("light-mode", get_dark_mode() != "DARK");
        });


    status.append("span")
        .text(" Local Status Info");



    const local_status_remote_data_state = local_status_container.append("p")
        .attr("class", get_use_local() ? "text-local-mode-active" : "text-remote-mode-active")
        .text("Remote data");
    const local_status_underlying_state = local_status_container.append("p")
        .attr("class", !get_simulated_underlying_price_changed() ? "checkbox-text-inactive" : "checkbox-text-active")
        .text("Underlying price modified");
    const local_status_strikes_state = local_status_container.append("p")
        .attr("class", !get_combo_changed() ? "checkbox-text-inactive" : "checkbox-text-active")
        .text("Strike(s) modified");

    const auto_save_container = d3.select("#auto-save-container")
    auto_save_container.selectAll("*").remove();
    d3.select("#auto-save-container")
        .append("input")
        .attr("type", "checkbox")
        .attr("id", "autosaveCheckbox")
        .attr("checked", get_auto_save() ? "checked" : null)
        .attr("name", "autosaveCheckbox");
    d3.select("#auto-save-container")
        .append("label")
        .attr("class", "std-text")
        .attr("for", "autosaveCheckbox")
        .text(" Auto-save");
    // Event listener to detect changes
    d3.select("#autosaveCheckbox").on("change", function () {
        set_auto_save(document.getElementById('autosaveCheckbox').checked);
        console.log("Auto-save is now", get_auto_save());
    });

}
export function display_days_left_slider() {

    //console.log("display_days_left_slider",global_data);

    const days_left_container = d3.select("#days-left-container")
    days_left_container.selectAll("*").remove();

    let days_left_text = days_left_container.append("p")
        .attr("class", "checkbox-title")
        .text("Days left:");
    days_left_container.append("input")
        .attr("type", "range")
        .attr("id", "days-left-slider")
        .attr("class", "slider-reverse")
        .attr("min", global_data.window_params.days_left.min)
        .attr("max", global_data.get_time_to_expiry_of_active_combo())
        .attr("value", global_data.get_time_for_simulation_of_active_combo())
        .attr("step", global_data.window_params.days_left.step)
        .style("width", "100%"); // Make it full width
    days_left_text.text(`Days left: ${global_data.get_time_for_simulation_of_active_combo()}/${global_data.get_time_to_expiry_of_active_combo()}`);

    d3.select("#days-left-slider").on("input", function () {
        days_left_text.text(`Days left: ${this.value}/${global_data.get_time_to_expiry_of_active_combo()}`);
        global_data.set_time_for_simulation_of_active_combo(parseFloat(this.value));
        draw_graph();
    });

}
export function display_checkbox_for_volatility_mode() {

    const volatility_main_container = d3.select("#volatility-main-container")
    volatility_main_container.selectAll("*").remove();
    const per_leg_volatility_container = d3.select("#per-leg-volatility-container")
    const mean_volatility_container = d3.select("#mean-volatility-container")

    volatility_main_container.append("p")
        .attr("class", "checkbox-title")
        .text("Volatility Management");
    const checkbox_by_leg = volatility_main_container.append("input")
        .attr("type", "checkbox")
        .attr("id", "myCheckbox2")
        .attr("name", "Volatility by leg")
        .attr("checked", get_volatility_is_per_leg() ? "checked" : null);
    volatility_main_container.append("label")
        .attr("for", "myCheckbox2")
        .attr("class", "std-text")
        .text("By leg ");
    if (get_volatility_is_per_leg()) {
        per_leg_volatility_container.style("display", "block"); // Show the new container
        mean_volatility_container.style("display", "none"); // Show the new container
    } else {
        per_leg_volatility_container.style("display", "none"); // Hide the new container
        mean_volatility_container.style("display", "block"); // Hide the new container
    }

    const checkbox_computed = volatility_main_container.append("input")
        .attr("type", "checkbox")
        .attr("id", "myCheckbox2")
        .attr("name", "Computed")
        .attr("disabled", get_computed_volatility_available() ? null : true)
        .attr("checked", get_use_computed_volatility() ? "checked" : null);
    volatility_main_container.append("label")
        .attr("for", "myCheckbox2")
        .attr("class", "std-text")
        .attr("disabled", get_computed_volatility_available() ? null : true)
        .text("Computed");
    display_volatility_sliders();


    checkbox_by_leg.on("change", function () {
        set_volatility_is_per_leg(this.checked);
        if (this.checked) {
            per_leg_volatility_container.style("display", "block"); // Show the new container
            mean_volatility_container.style("display", "none"); // Show the new container
        } else {
            set_use_computed_volatility(false);
            checkbox_computed.property("checked", false);
            per_leg_volatility_container.style("display", "none"); // Hide the new container
            mean_volatility_container.style("display", "block"); // Hide the new container
        }
        display_volatility_sliders();
        draw_graph();
    });

    checkbox_computed.on("change", function () {
        set_use_computed_volatility(this.checked);
        if (this.checked) {
            checkbox_by_leg.property("checked", true);
            set_volatility_is_per_leg(true);
            per_leg_volatility_container.style("display", "block"); // Show the new container
            mean_volatility_container.style("display", "none"); // Show the new container
        } else {
        }
        display_volatility_sliders();
        draw_graph();
    });
}
export function display_volatility_sliders() {

    const per_leg_volatility_container = d3.select("#per-leg-volatility-container")
    per_leg_volatility_container.selectAll("*").remove();
    global_data.get_combo_params().legs.forEach((option, index) => {

        let v = option.iv;
        if (get_use_computed_volatility()) {
            v = option.computed_volatility;
        }
        let iv_value = 100. * v;
        let leg_vol_text = per_leg_volatility_container.append("p")
            .attr("class", "checkbox-title")
            .text(`${option.type} ${option.strike} IV ` + iv_value.toFixed(1) + "%");
        let leg_vol_slider = per_leg_volatility_container.append("input")
            .attr("type", "range")
            .attr("id", "leg_vol_slider" + index)
            .attr("min", 100 * global_data.window_params.iv_slider.min)
            .attr("max", 100 * global_data.window_params.iv_slider.max)
            .attr("value", iv_value)
            .attr("step", 100 * global_data.window_params.iv_slider.step)
            .style("width", "100%"); // Make it full width
        leg_vol_slider.on("input", function () {
            const use_computed_volatility = get_use_computed_volatility();
            leg_vol_text.text(`${option.type} ${option.strike} IV ` + (this.value * 1.0).toFixed(1) + "%");
            if (use_computed_volatility) {
                option.computed_volatility = parseFloat(this.value / 100.0);
            }
            else {
                option.iv = parseFloat(this.value / 100.0);
            }
            draw_graph();
        });

    });

    const mean_volatility_container = d3.select("#mean-volatility-container")
    mean_volatility_container.selectAll("*").remove();
    let use_real_values = global_data.get_use_real_values();
    let v = global_data.get_mean_volatility_of_combo()
    let iv_value = 100 * v;
    let mean_vol_text = mean_volatility_container.append("p")
        .attr("class", "checkbox-title")
        .text("Mean Volatility " + iv_value.toFixed(1) + "%");
    mean_volatility_container.append("input")
        .attr("type", "range")
        .attr("id", "mean_vol_slider")
        .attr("min", 100 * global_data.window_params.iv_slider.min)
        .attr("max", 100 * global_data.window_params.iv_slider.max)
        .attr("value", iv_value)
        .attr("step", 100 * global_data.window_params.iv_slider.step)
        .style("width", "100%"); // Make it full width
    d3.select("#mean_vol_slider").on("input", function () {
        mean_vol_text.text("Mean Volatility " + (this.value * 1.0).toFixed(1) + "%");
        global_data.set_mean_volatility_of_combo(global_data.get_use_real_values(), parseFloat(this.value / 100.0));
        draw_graph();
    });
}
export function display_sigma_selector() {
    const sigma_selector_container = d3.select("#sigma-selector-container")
    sigma_selector_container.selectAll("*").remove();
    sigma_selector_container.append("p")
        .attr("class", "checkbox-title")
        .text("Sigma");

    const sigma_factors = global_data.get_sigma_factors();

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
function handleRadioChange() {
    if (this.checked) {
        global_data.set_3d_view(this.value);
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
    //zoomGroup.appendChild(sliderZoomContainer);


    const showHplaneContainer = document.createElement("div");
    showHplaneContainer.setAttribute("class", "simple_checkbox")
    const showHplane_label = document.createElement("text");
    showHplane_label.setAttribute("class", "std-text")
    showHplane_label.textContent = "Plane  ";
    const showHplane_checkbox = document.createElement("input");
    showHplane_checkbox.setAttribute("type", "checkbox");
    showHplane_checkbox.setAttribute("id", "show-hplane-container");
    showHplane_checkbox.setAttribute("name", "show-hplane-container");
    showHplane_checkbox.checked = get_show_hplane();
    showHplane_checkbox.addEventListener("change", function () {
        set_show_hplane(this.checked);
        update_3d_view();
    });
    showHplaneContainer.appendChild(showHplane_label);
    showHplaneContainer.appendChild(showHplane_checkbox);
    //zoomGroup.appendChild(showHplaneContainer);

    const show3DBoxContainer = document.createElement("div");
    show3DBoxContainer.setAttribute("class", "simple_checkbox")
    const show3DBox_label = document.createElement("text");
    show3DBox_label.setAttribute("class", "std-text")
    show3DBox_label.textContent = "3DBox ";
    const show3DBox_checkbox = document.createElement("input");
    show3DBox_checkbox.setAttribute("type", "checkbox");
    show3DBox_checkbox.setAttribute("id", "show-3dbox-container");
    show3DBox_checkbox.setAttribute("name", "show-3dbox-container");
    show3DBox_checkbox.checked = get_show_3dbox();
    show3DBox_checkbox.addEventListener("change", function () {
        set_show_3dbox(this.checked);
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
    cmapStyle_checkbox.checked = get_two_colors_cmap();
    cmapStyle_checkbox.addEventListener("change", function () {
        set_two_colors_cmap(this.checked);
        update_3d_view();
    });
    cmapStyleContainer.appendChild(cmapStyle_label);
    cmapStyleContainer.appendChild(cmapStyle_checkbox);
    //zoomGroup.appendChild(cmapStyleContainer);

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
function add_parameters_container_in_tab_container(tab_container) {
    let param_container = document.createElement('div');
    param_container.classList.add('param-container');
    param_container.id = 'param-container';

    // Create header container (for heading + button)
    const headerContainer = document.createElement('div');
    headerContainer.style.display = 'flex';
    headerContainer.style.justifyContent = 'space-between';
    headerContainer.style.alignItems = 'center';

    // Heading
    const heading = document.createElement('h2');
    heading.classList.add('std-text');
    heading.textContent = 'PARAMETERS';

    // Clear Button
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Reset configuration local storage';
    //clearBtn.classList.add('clear-log-btn');
    clearBtn.onclick = () => {
        localStorage.removeItem('config');
        // display a confirmation message
        const confirmationMessage = document.createElement('div');
        confirmationMessage.textContent = 'Configuration reset successfully.';
        confirmationMessage.style.color = 'green';
        confirmationMessage.style.fontSize = '14px';
        confirmationMessage.style.marginTop = '10px';
        confirmationMessage.style.fontWeight = 'bold';
        param_container.appendChild(confirmationMessage);
        // Reload the page after a delay
        setTimeout(() => {
            location.reload();
        }
            , 1000); // 1 second delay
    };


    const status = document.createElement('button');
    status.textContent = get_dark_mode() == "DARK" ? "🌞" : "🌙"
    status.style.cursor = "pointer";
    status.style.fontSize = "20px";
    status.style.backgroundColor = "transparent";
    status.style.border = "none";
    status.onclick = () => {
        console.log("clicked – switch to other mode");
        console.log(get_dark_mode());
        set_dark_mode(get_dark_mode() == "DARK" ? 0 : 1);
        d3.select("body").classed("dark-mode", get_dark_mode() == "DARK");
        d3.select("body").classed("light-mode", get_dark_mode() != "DARK");
        status.textContent = get_dark_mode() == "DARK" ? "🌞" : "🌙"
    }

    // Assemble header
    param_container.appendChild(status);
    //headerContainer.appendChild(heading);
    param_container.appendChild(headerContainer);
    param_container.appendChild(clearBtn);

    tab_container.appendChild(param_container);

}
export function get_container_size(container_id) {
    const container = d3.select(container_id);
    let width = 0;
    let height = 0;
    const node = container.node();
    const rect = node.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    //console.log("\n-------\n[get_container_size] container_id", container_id);
    //console.log("Width:", rect.width);
    //console.log("Height:", rect.height);
    return { width: width, height: height };
}
function insert_text_header(container, text) {

    const head_container = document.createElement('div');
    head_container.style.display = 'flex';
    head_container.style.justifyContent = 'space-between';
    head_container.style.alignItems = 'center';
    //container.appendChild(head_container);


    const head_text = document.createElement('h2');
    head_text.classList.add('std-text');
    head_text.textContent = text;
    container.appendChild(head_text);
}
function update_right_container_size() {
    onGraphContainerVisible();
    display_pl_tab();
}
function add_left_and_right_containers_in_container(parent_container) {
    const pl_headerContainer = document.createElement('div');
    pl_headerContainer.classList.add('pl-split-container');
    parent_container.appendChild(pl_headerContainer);

    const leftContainer = document.createElement('div');
    leftContainer.classList.add('left-container');
    leftContainer.id = 'pl-left-header';
    pl_headerContainer.appendChild(leftContainer);

    const rightContainer = document.createElement('div');
    rightContainer.classList.add('right-container');
    rightContainer.id = 'pl-right-header';
    pl_headerContainer.appendChild(rightContainer);
}
function prepare_left_container() {
    let left_container = d3.select("#pl-left-header");
    left_container.selectAll("*").remove();

    d3.select("#pl-left-header").append("div")
        .attr("class", "local-status-container")
        .attr("id", "local-status-container");
    d3.select("#pl-left-header").append("div")
        .attr("class", "local-status-container")
        .attr("id", "auto-save-container");
    display_local_status();

    d3.select("#pl-left-header").append("div").append("br")

    d3.select("#pl-left-header").append("div")
        .attr("class", "combo-list-container")
        .attr("id", "combo-list-container");
    display_combos_list();

    d3.select("#pl-left-header").append("div").append("br")

    d3.select("#pl-left-header").append("div")
        .attr("class", "days-left-container")
        .attr("id", "days-left-container");
    display_days_left_slider();

    d3.select("#pl-left-header").append("div").append("br")

    d3.select("#pl-left-header").append("div")
        .attr("class", "volatility-main-container")
        .attr("id", "volatility-main-container");
    d3.select("#pl-left-header").append("div")
        .attr("class", "per-leg-volatility-container")
        .attr("id", "per-leg-volatility-container")
        .style("display", "none"); // Initially hidden
    d3.select("#pl-left-header").append("div")
        .attr("class", "mean-volatility-container")
        .attr("id", "mean-volatility-container")
        .style("display", "block")  // Initially hidden
    display_checkbox_for_volatility_mode();
    display_volatility_sliders();

    d3.select("#pl-left-header").append("div").append("br")

    d3.select("#pl-left-header").append("div")
        .attr("class", "sigma-selector-container")
        .attr("id", "sigma-selector-container");
    display_sigma_selector();

    d3.select("#pl-left-header").append("div").append("br")

}
function prepare_right_container() {
    draw_graph();
    update_3d_view();
}
export function display_pl_tab() {
    const isHidden = d3.select("#pl-container").classed("hidden");
    //console.log("Is hidden by class:", isHidden);
    if (!isHidden) {
        let right_size = get_container_size("#pl-container");
        //console.log("[display] -> right_size", right_size);
        global_data.update_window_data(right_size);
    }

    prepare_right_container();
}
function resize_display() {
    //console.log("[resize_display] Resizing display");
    display_pl_tab();
}
export function create_main_frame() {

    if (get_dark_mode() == "DARK") {
        d3.select("body").classed("dark-mode", true);
        d3.select("body").classed("light-mode", false);
    } else {
        d3.select("body").classed("dark-mode", false);
        d3.select("body").classed("light-mode", true);
    }

    const body = document.body;

    const main_container = document.createElement('div');
    main_container.classList.add('main-container');
    main_container.id = 'main-container';
    body.appendChild(main_container);

    let main_tabs_manager = new TabsManager(main_container, "main");

    let graphs_tab_container = main_tabs_manager.add_tab('Graphs', 'graphs', update_right_container_size);

    add_left_and_right_containers_in_container(graphs_tab_container);
    prepare_left_container();

    const right_container = document.getElementById("pl-right-header");
    let graphs_tabs_manager = new TabsManager(right_container, "graphs");
    let pl_container = graphs_tabs_manager.add_tab('P/L', 'pl', draw_graph);
    let view3D_container = graphs_tabs_manager.add_tab('3D View', 'view3d');
    add_view3d_controler_container_in_view3d_container(view3D_container);
    add_view3d_gragh_container_in_view3d_container(view3D_container);


    let combo_builder_tab_container = main_tabs_manager.add_tab('Combo Builder', 'combo-builder');
    let parameters_tab_container = main_tabs_manager.add_tab('Parameters', 'parameters');
    let log_tab_container = main_tabs_manager.add_tab('Log', 'log');
    let polygon_tab_container = main_tabs_manager.add_tab('Polygon', 'polygon');

    add_option_chain_container_in_tab_container(combo_builder_tab_container);
    add_parameters_container_in_tab_container(parameters_tab_container);
    add_log_container_in_tab_container(log_tab_container);
    add_polygon_container_in_tab_container(polygon_tab_container);

    setup_container_resize_observer(pl_container, onGraphPLContainerVisible);
    setup_container_resize_observer(view3D_container, onGraphView3DContainerVisible);

    main_tabs_manager.activate_last_tab();
    graphs_tabs_manager.activate_last_tab();

    window.addEventListener("resize", resize_display);
    addLog("TEST", { error: true, blink: true });
    addPolygonLog("TEST", { warning: true, blink: true });


}
function setup_container_resize_observer(container, callback) {
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === "attributes" && mutation.attributeName === "class") {
                const wasHidden = mutation.oldValue?.includes("hidden");
                const isNowVisible = !container.classList.contains("hidden");

                if (wasHidden && isNowVisible) {
                    //console.log("🚀 Container is now visible!");
                    // call your function here
                    callback();
                }
            }
        }
    });

    observer.observe(container, {
        attributes: true,
        attributeFilter: ["class"],
        attributeOldValue: true
    });

}
function onGraphPLContainerVisible() {
    console.log("*** onGraphPLContainerVisible");
    onGraphContainerVisible();
    draw_graph();
}

export function onGraphView3DContainerVisible() {
    console.log("+++ onGraphView3DContainerVisible");
    onGraphContainerVisible();
    draw_graph();
    update_3d_view();

}
export function onGraphContainerVisible() {
    let right_size = get_container_size("#pl-right-header");
    console.log("onGraphContainerVisible -> pl-right-header", right_size);
    let right_tabs_size = get_container_size("#graphs-tabs-selector-container");
    console.log("onGraphContainerVisible -> view3d-controler-container", right_tabs_size);
    right_size.height = right_size.height - right_tabs_size.height;
    console.log("onGraphContainerVisible -> size", right_size);
    global_data.update_window_data(right_size);
}
