export function remaining_days(expiry) {
    // Convert expiry string to Date (YYYYMMDD -> 16:30 UTC-5)
    const expiryStr = expiry.toString();
    const expiryYear = parseInt(expiryStr.substring(0, 4));
    const expiryMonth = parseInt(expiryStr.substring(4, 6)) - 1; // JS months are 0-based
    const expiryDay = parseInt(expiryStr.substring(6, 8));

    // Create expiry date at 16:30 in UTC-5
    const expiryDate = new Date(Date.UTC(expiryYear, expiryMonth, expiryDay, 21, 30)); // 16:30 UTC-5 = 21:30 UTC

    // Get current time (now) in UTC
    const now = new Date();

    // Compute the difference in milliseconds and convert to days (fractional)
    const diffMs = expiryDate - now;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    return Math.round(diffDays * 10) / 10;
}

export function is_third_friday(expiry) {
    const year = parseInt(expiry.slice(0, 4), 10);
    const month = parseInt(expiry.slice(4, 6), 10) - 1; // JS months = 0-based
    const day = parseInt(expiry.slice(6, 8), 10);

    const date = new Date(year, month, day);
    if (date.getDay() !== 5) return false; // Not a Friday

    // Find the first Friday of the month
    const firstDay = new Date(year, month, 1);
    const firstFridayOffset = (5 - firstDay.getDay() + 7) % 7;
    const thirdFridayDate = 1 + firstFridayOffset + 14;

    return day === thirdFridayDate;
}



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
export function days_between_dates(date1, date2) {
    // Parse yyyymmdd strings to Date objects
    const parseDate = (yyyymmdd) => {
        const year = parseInt(yyyymmdd.substring(0, 4), 10);
        const month = parseInt(yyyymmdd.substring(4, 6), 10) - 1; // JS months are 0-based
        const day = parseInt(yyyymmdd.substring(6, 8), 10);
        return new Date(year, month, day);
    };

    const d1 = parseDate(date1);
    const d2 = parseDate(date2);

    // Calculate the time difference in milliseconds
    const diffTime = Math.abs(d2 - d1);

    // Convert milliseconds to days
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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

