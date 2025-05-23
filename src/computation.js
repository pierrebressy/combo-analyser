export function get_use_computed_volatility() {
    return false;
}
export function compute_greeks_data_for_price(global_data, greek_index, use_legs_volatility, price) {

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
function compute_greeks_data(global_data, use_legs_volatility) {

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
            let data = compute_greeks_data_for_price(global_data, greek_index, use_legs_volatility, price);
            greeks_data[greek_index].push(data);
        }
        if (global_data.get_combo_params().legs.length === 1) {
            // add the computation of the intrinsic value and time value
            let intrinsic_value = 0;
            let time_value = 0;
            const interest_rate_of_combo = global_data.get_interest_rate_of_combo();
            const time_for_simulation_of_combo = global_data.get_time_for_simulation_of_active_combo();
            const mean_volatility_of_combo = global_data.get_mean_volatility_of_combo(get_use_real_values)
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
export function compute_p_and_l_data_for_price(global_data, use_legs_volatility, num_days_left, price) {
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
function compute_p_and_l_data(global_data, use_legs_volatility, num_days_left) {

    const minPrice = global_data.get_simul_min_price_of_combo();
    const maxPrice = global_data.get_simul_max_price_of_combo();
    const stepPrice = global_data.get_simul_step_price_of_combo();

    let p_and_l_data = [];
    for (let price = minPrice; price <= maxPrice; price += stepPrice) {
        const data = compute_p_and_l_data_for_price(global_data, use_legs_volatility, num_days_left, price);
        p_and_l_data.push(data);
    }
    return p_and_l_data
}
export function compute_data_to_display(global_data, volatility_is_per_leg) {
    global_data.set_pl_at_exp_data(compute_p_and_l_data(global_data, volatility_is_per_leg, 0));
    global_data.set_pl_at_init_data(compute_p_and_l_data(global_data, volatility_is_per_leg, global_data.get_time_to_expiry_of_active_combo()));
    global_data.set_pl_at_sim_data(compute_p_and_l_data(global_data, volatility_is_per_leg, global_data.get_time_for_simulation_of_active_combo()));

    global_data.set_greeks_data(compute_greeks_data(global_data, volatility_is_per_leg));
}



export function erf(x) {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-x * x);

    return sign * y;
}

export function normalCDF(x) {
    return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

export function computeOptionPrice(price = 0., strike = 0., interest_rate = 0., volatility = 0., num_days_left = 0., option_type = 'call') {
    ///console.log("computeOptionPrice");
    // If num_days_left is 0 or negative, set it to a very small number to avoid division by zero
    num_days_left = num_days_left > 0 ? num_days_left : 1e-15;

    let T = num_days_left / 365.0; // Time to expiration in years
    let sqrtT = Math.sqrt(T);
    let exp_interest_rate_T = Math.exp(-interest_rate * T);

    // Compute d1 and d2
    let d1 = (Math.log((1.0*price) / strike) + (interest_rate + (volatility ** 2) / 2.0) * T) / (volatility * sqrtT);
    let d2 = d1 - volatility * sqrtT;

    // Define the normal distribution PDF and CDF using jStat or your own implementation
    let pdf_d1 = Math.exp(-(d1 ** 2) / 2.0) / Math.sqrt(2 * Math.PI); // PDF of d1
    let cdf_d1 = normalCDF(d1); // CDF of d1
    let cdf_d2 = normalCDF(d2); // CDF of d2
    let cdf_minus_d2 = normalCDF(-d2); // CDF of -d2

    // If it's a call option
    if (option_type === 'call') {
        let call_delta = cdf_d1;
        let call_gamma = pdf_d1 / (price * volatility * sqrtT);
        let call_vega = price * pdf_d1 * sqrtT / 100.0;
        let call_theta = (- (price * pdf_d1 * volatility) / (2.0 * sqrtT)
            - interest_rate * strike * exp_interest_rate_T * cdf_d2) / 365.0;
        let call_rho = (strike * T * exp_interest_rate_T * cdf_d2) / 100.0;
        let call_premium = price * cdf_d1 - strike * exp_interest_rate_T * cdf_d2;

        return [
            call_premium,
            call_delta,
            call_gamma,
            call_theta,
            call_vega,
            call_rho
        ];
    }


    // If it's a put option
    //console.log("cdf_d1",cdf_d1);
    //console.log("cdf_minus_d2",cdf_minus_d2);
    //console.log("pdf_d1",pdf_d1);
    //console.log("price",price);
    //console.log("volatility",volatility);
    //console.log("sqrtT",sqrtT);
    let put_delta = cdf_d1 - 1.0;
    let put_gamma = pdf_d1 / (price * volatility * sqrtT);
    let put_vega = price * pdf_d1 * sqrtT / 100.0;
    let put_theta = (- (price * pdf_d1 * volatility) / (2.0 * sqrtT)
        - interest_rate * strike * exp_interest_rate_T * cdf_minus_d2) / 365.0;
    let put_rho = (strike * T * exp_interest_rate_T * cdf_minus_d2) / 100.0;
    let put_premium = -price * normalCDF(-d1) + strike * exp_interest_rate_T * cdf_minus_d2;

    return [
        put_premium,
        put_delta,
        put_gamma,
        put_theta,
        put_vega,
        put_rho
    ];
}