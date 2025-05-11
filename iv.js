import { addLog } from './log.js';
import { normalCDF } from './computation.js';

function d1(sigma, S, K, T, r) {
  return (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
}

function blackScholesPrice(S, K, T, r, sigma, optionType) {
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  if (optionType === "call") {
    return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
  } else if (optionType === "put") {
    return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
  } else {
    throw new Error("Invalid option type");
  }
}

// Newtown-Raphson Algorithm
function compute_iv_newtown_raphson(S, K, T, r, marketPrice, optionType) {
  let sigma = 0.2; // Initial guess for volatility
  const tolerance = 1e-4; // Acceptable error
  const maxIterations = 100;

  for (let i = 0; i < maxIterations; i++) {
    let price = blackScholesPrice(S, K, T, r, sigma, optionType);
    let vega = S * Math.sqrt(T) * normalCDF(d1(sigma, S, K, T, r)); // Vega: Sensitivity to volatility

    let priceDiff = price - marketPrice;
    //addLog("sigma: ", sigma.toFixed(5));

    if (Math.abs(priceDiff) < tolerance) {
      addLog("iterations: ", i);
      return sigma;
    }

    sigma = sigma - priceDiff / vega; // Update sigma (volatility) using Newton's method
  }

  throw new Error("Implied volatility calculation did not converge");
}

// Dichomoty algorithm
export function compute_iv_dichotomy(S, K, T, r, marketPrice, optionType) {
  let sigma_left = 0.0001;
  let sigma_right = 2.0;
  let sigma_center = 0.5 * (sigma_left + sigma_right);
  const tolerance = 1e-4; // Acceptable error
  const maxIterations = 100;

  for (let i = 0; i < maxIterations; i++) {

    let price_left = blackScholesPrice(S, K, T, r, sigma_left, optionType);
    let price_center = blackScholesPrice(S, K, T, r, sigma_center, optionType);
    let price_right = blackScholesPrice(S, K, T, r, sigma_right, optionType);

    //addLog("iteration:   ", i, "marketPrice:   ", marketPrice.toFixed(2));
    //addLog("sigma_left:   ", sigma_left.toFixed(5), "price_left:   ", price_left.toFixed(2));
    //addLog("sigma_center: ", sigma_center.toFixed(5), "price_center: ", price_center.toFixed(2));
    //addLog("sigma_right:  ", sigma_right.toFixed(5), "price_right:  ", price_right.toFixed(2));
    let priceDiff = price_center - marketPrice;
    if (Math.abs(priceDiff) < tolerance) {
      //addLog("iterations: ", i);
      return sigma_center;
    }
    if (price_left < marketPrice && marketPrice < price_center) {
      sigma_right = sigma_center;
      sigma_center = 0.5 * (sigma_left + sigma_right);
    }
    else if (price_center < marketPrice && marketPrice < price_right) {
      sigma_left = sigma_center;
      sigma_center = 0.5 * (sigma_left + sigma_right);
    }
    else {
      break;
    }

  }
  //addLog("[compute_iv_dichotomy] max iterations: ", maxIterations, { warning: true });
  return 0;
}

export function hestonMonteCarlo(params, S0, K, T, r, q, numPaths, numSteps) {
  const { v0, theta, kappa, sigma, rho } = params;
  const dt = T / numSteps;
  let payoffs = 0;

  // Monte Carlo loop
  for (let i = 0; i < numPaths; i++) {
    let S = S0;
    let v = v0;

    // Simulate the asset price and volatility process
    for (let j = 0; j < numSteps; j++) {
      const dzS = Math.random() * Math.sqrt(dt);  // Standard normal random variable for asset price
      const dzV = rho * dzS + Math.sqrt(1 - rho * rho) * Math.random() * Math.sqrt(dt);  // Volatility random shock

      // Euler-Maruyama discretization for the Heston model
      v = Math.max(v + kappa * (theta - v) * dt + sigma * Math.sqrt(v) * dzV, 0);  // Ensure v > 0 (volatility must be positive)
      S = S * Math.exp((r - q - 0.5 * v) * dt + Math.sqrt(v) * dzS);  // Asset price process
    }

    // Compute payoff for the option (European call)
    const payoff = Math.max(S - K, 0);  // Call option payoff
    payoffs += Math.exp(-r * T) * payoff;  // Discount the payoff at maturity
  }

  // Return the average price of the option
  return payoffs / numPaths;
}



function randn_bm() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random(); // évite log(0)
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function monteCarloOptionPrice(S, K, r, T, sigma, isCall, simulations = 10000) {
  let payoffSum = 0;

  for (let i = 0; i < simulations; i++) {
    //const Z = Math.random() * 2 - 1; // Box-Muller serait plus précis
    const Z = randn_bm(); // N(0,1)
    const ST = S * Math.exp((r - 0.5 * sigma ** 2) * T + sigma * Math.sqrt(T) * Z);
    const payoff = isCall ? Math.max(ST - K, 0) : Math.max(K - ST, 0);
    payoffSum += payoff;
  }

  const discountedPayoff = Math.exp(-r * T) * (payoffSum / simulations);
  return discountedPayoff;
}

function compute_iv_monte_carlo(S, K, r, T, marketPrice, isCall, tol = 1e-4, maxIter = 1000) {
  let low = 0.0001;
  let high = 2.0;
  let mid, price;
  let i;
  for (i = 0; i < maxIter; i++) {
    mid = (low + high) / 2;
    price = monteCarloOptionPrice(S, K, r, T, mid, isCall);

    if (Math.abs(price - marketPrice) < tol) {
      addLog("iterations: ", i);
      return mid;
    }

    if (price > marketPrice) {
      high = mid;
    } else {
      low = mid;
    }
  }
  addLog("iterations: ", i);

  return mid; // retourne la meilleure estimation
}



export function test_iv_1() {
  /*const tickerPrice = 70.69;   // S
  const strikePrice = 67.5;   // K
  const optionType = "call"; // "call" or "put"
  const optionPrice = 4.69;     // Market price of the option
  const timeToExpiration = 36 / 365.; // Time to expiration in years
  const riskFreeRate = 0.04; // Annualized risk-free rate*/
  const tickerPrice = 190.42;   // S
  const strikePrice = 180;   // K
  const optionType = "call"; // "call" or "put"
  const optionPrice = 20;     // Market price of the option
  const timeToExpiration = 35 / 365.; // Time to expiration in years
  const riskFreeRate = 0.04; // Annualized risk-free rate
  addLog("Ticker price: ", tickerPrice.toFixed(2));
  addLog("Strike price: ", strikePrice.toFixed(2));
  addLog("Option price: ", optionPrice.toFixed(2));
  addLog("Expiration:   ", (365 * timeToExpiration).toFixed(1), " days");

  let iv = compute_iv_newtown_raphson(tickerPrice, strikePrice, timeToExpiration, riskFreeRate, optionPrice, optionType);
  addLog("compute_iv_newtown_raphson => IV = ", (100 * iv).toFixed(2), " % (yearly)", (100 * iv / Math.sqrt(252)).toFixed(2), " % (daily)");

  iv = compute_iv_dichotomy(tickerPrice, strikePrice, timeToExpiration, riskFreeRate, optionPrice, optionType);
  addLog("compute_iv_dichotomy => IV = ", (100 * iv).toFixed(2), " % (yearly)", (100 * iv / Math.sqrt(252)).toFixed(2), " % (daily)");

  const isCall = true;

  const volImp = compute_iv_monte_carlo(tickerPrice, strikePrice, riskFreeRate, timeToExpiration, optionPrice, isCall);
  addLog("compute_iv_monte_carlo => IV = ", (100 * iv).toFixed(2), " % (yearly)", (100 * iv / Math.sqrt(252)).toFixed(2), " % (daily)");

}



export function test_iv() {
  const tickerPrice = 202.12;   // S
  const strikePrice = 200;   // K
  const optionType = "call"; // "call" or "put"
  const optionPrice = 4.24;     // Market price of the option
  const timeToExpiration = 1 / 365.; // Time to expiration in years
  const riskFreeRate = 0.04; // Annualized risk-free rate
  addLog("Ticker price: ", tickerPrice.toFixed(2));
  addLog("Strike price: ", strikePrice.toFixed(2));
  addLog("Option price: ", optionPrice.toFixed(2));
  addLog("Expiration:   ", (365 * timeToExpiration).toFixed(1), " days");

  //let iv = compute_iv_newtown_raphson(tickerPrice, strikePrice, timeToExpiration, riskFreeRate, optionPrice, optionType);
  //addLog("compute_iv_newtown_raphson => IV = ", (100 * iv).toFixed(2), " % (yearly)", (100 * iv / Math.sqrt(252)).toFixed(2), " % (daily)");

  let iv = compute_iv_dichotomy(tickerPrice, strikePrice, timeToExpiration, riskFreeRate, optionPrice, optionType);
  addLog("compute_iv_dichotomy => IV = ", (100 * iv).toFixed(2), " % (yearly)", (100 * iv / Math.sqrt(252)).toFixed(2), " % (daily)");

  //const isCall = true;

  //const volImp = compute_iv_monte_carlo(tickerPrice, strikePrice, riskFreeRate, timeToExpiration, optionPrice, isCall);
  //addLog("compute_iv_monte_carlo => IV = ", (100 * iv).toFixed(2), " % (yearly)", (100 * iv / Math.sqrt(252)).toFixed(2), " % (daily)");

}