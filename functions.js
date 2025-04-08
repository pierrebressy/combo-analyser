export function days_difference(d1,d2) {
    const given_date_1 = new Date(d1);
    const given_date_2 = new Date(d2);
    // Compute difference in milliseconds
    const diffTime = given_date_2 - given_date_1;
    
    // Convert to days
    let diff_days = -Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diff_days;
}
export function days_difference_with_today(d) {
    const today = new Date();
    let diff_days = Math.max(0,days_difference(d,today));
    return diff_days;
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

export function erf2    (x) {
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    // Abramowitz and Stegun approximation
    const a = 0.254829592;
    const b = -0.284496736;
    const c = 1.421413741;
    const d = -1.453152027;
    const e = 1.061405429;
    const p = 0.3275911;

    const t = 1 / (1 + p * x);
    const y = 1 - (((((a * t + b) * t + c) * t + d) * t + e) * t) * Math.exp(-x * x);

    return sign * y;
}

export function normalCDF(x) {
    return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

export function normalCDF2(x) {
    return (1.0 + erf(x / Math.sqrt(2))) / 2.0;
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

