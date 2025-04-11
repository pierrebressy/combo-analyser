let auto_save = true;
let dark_mode = true;
let sigma_factor = 1.;
let volatility_is_per_leg=false;
let use_computed_volatility=false;
let computed_volatility_available=false;
let combo_changed = false;
let two_colors_cmap = true;
let show_hplane = true;
let show_3dbox = true;
let simulated_underlying_price_changed = false;
let use_local = false;
let underlying_current_price = 0;


export function set_computed_volatility_available(value) {
    computed_volatility_available = value;
}
export function get_computed_volatility_available() {
    return computed_volatility_available;
}

export function set_use_computed_volatility(value) {
    use_computed_volatility = value;
}
export function get_use_computed_volatility() {
    return use_computed_volatility;
}
export function set_underlying_current_price(value) {
    underlying_current_price = value;
}
export function get_underlying_current_price() {
    return underlying_current_price;
}
export function set_use_local(value) {
    use_local = value;
}
export function get_use_local() {
    return use_local;
}
export function set_simulated_underlying_price_changed(value) {
    simulated_underlying_price_changed = value;
}
export function get_simulated_underlying_price_changed() {
    return simulated_underlying_price_changed;
}
export function set_combo_changed(value) {
    combo_changed = value;
}
export function get_combo_changed() {
    return combo_changed;
}
export function set_auto_save(value) {
    auto_save = value;
}
export function get_auto_save() {
    return auto_save;
}

export function set_dark_mode(value) {
    dark_mode = value;
}
export function get_dark_mode() {
    return dark_mode;
}

export function set_sigma_factor(value) {
    sigma_factor = value;
}
export function get_sigma_factor() {
    return sigma_factor;
}

export function set_volatility_is_per_leg(value) {
    volatility_is_per_leg = value;
}
export function get_volatility_is_per_leg() {
    return volatility_is_per_leg;
}

export function set_two_colors_cmap(value) {
    two_colors_cmap = value;
}
export function get_two_colors_cmap() {
    return two_colors_cmap;
}
export function set_show_hplane(value) {
    show_hplane = value;
}
export function get_show_hplane() {
    return show_hplane;
}
export function set_show_3dbox(value) {
    show_3dbox = value;
}
export function get_show_3dbox() {
    return show_3dbox;
}