import { addLog } from './log.js';
import { normalCDF } from './functions.js';

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

function impliedVolatility(S, K, T, r, marketPrice, optionType) {
  let sigma = 0.2; // Initial guess for volatility
  const tolerance = 1e-4; // Acceptable error
  const maxIterations = 100;

  for (let i = 0; i < maxIterations; i++) {
      let price = blackScholesPrice(S, K, T, r, sigma, optionType);
      let vega = S * Math.sqrt(T) * normalCDF(d1(sigma, S, K, T, r)); // Vega: Sensitivity to volatility
      
      let priceDiff = price - marketPrice;
      addLog("sigma: ", sigma.toFixed(5));
      
      if (Math.abs(priceDiff) < tolerance) {
        addLog("iterations: ", i);
          return sigma;
      }
      
      sigma = sigma - priceDiff / vega; // Update sigma (volatility) using Newton's method
  }
  
  throw new Error("Implied volatility calculation did not converge");
}


function impliedVolatilityV2(S, K, T, r, marketPrice, optionType) {
  let sigma_min = 0.2;
  let sigma_max = 1.0;
  const tolerance = 1e-4; // Acceptable error
  const maxIterations = 100;
  let sigma_step=(sigma_max-sigma_min)/maxIterations; 
  let sigma=sigma_min;

  for (let i = 0; i < maxIterations; i++) {
      let price = blackScholesPrice(S, K, T, r, sigma, optionType);
      let priceDiff = price - marketPrice;
      addLog("sigma: ", sigma.toFixed(5), "price: ", price.toFixed(2), priceDiff.toFixed(2));
      if (Math.abs(priceDiff) < tolerance) {
        addLog("iterations: ", i);
          return sigma;
      }
      sigma += sigma_step;

  }
  return 0;
}



function impliedVolatilityV3(S, K, T, r, marketPrice, optionType) {
  let sigma_left = 0.0001;
  let sigma_right = 2.0;
  let sigma_center=0.5*(sigma_left+sigma_right);
  const tolerance = 1e-4; // Acceptable error
  const maxIterations = 100;

  for (let i = 0; i < maxIterations; i++) {

    let price_left = blackScholesPrice(S, K, T, r, sigma_left, optionType);
    let price_center = blackScholesPrice(S, K, T, r, sigma_center, optionType);
    let price_right = blackScholesPrice(S, K, T, r, sigma_right, optionType);

    addLog("iteration:   ",i,   "marketPrice:   ", marketPrice.toFixed(2));
    addLog("sigma_left:   ", sigma_left.toFixed(5),   "price_left:   ", price_left.toFixed(2));
    addLog("sigma_center: ", sigma_center.toFixed(5), "price_center: ", price_center.toFixed(2));
    addLog("sigma_right:  ", sigma_right.toFixed(5),  "price_right:  ", price_right.toFixed(2));
    let priceDiff = price_center - marketPrice;
    if (Math.abs(priceDiff) < tolerance) {
      addLog("iterations: ", i);
      return sigma_center;
    }
    if(price_left < marketPrice && marketPrice<price_center) {
      sigma_right=sigma_center;
      sigma_center=0.5*(sigma_left+sigma_right);
    }
    else if(price_center < marketPrice && marketPrice<price_right) {
      sigma_left=sigma_center;
      sigma_center=0.5*(sigma_left+sigma_right);
    }
    else {
      break;
    }

  }
  return 0;
}



function d1(sigma, S, K, T, r) {
  return (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
}

export function test_iv() {
  const tickerPrice = 181.46;   // S
  const strikePrice = 170;   // K
  const optionType = "call"; // "call" or "put"
  const optionPrice = 17.83;     // Market price of the option
  const timeToExpiration = 18/365.; // Time to expiration in years
  const riskFreeRate = 0.03; // Annualized risk-free rate
  addLog("Ticker price: ", tickerPrice.toFixed(2));
  addLog("Strike price: ", strikePrice.toFixed(2));
  addLog("Option price: ", optionPrice.toFixed(2));
  addLog("Expiration:   ", (365*timeToExpiration).toFixed(1)," days");
  
  let iv = impliedVolatility(tickerPrice, strikePrice, timeToExpiration, riskFreeRate, optionPrice, optionType);
  addLog("=> IV = ", (100*iv).toFixed(2)," %");

  iv = impliedVolatilityV2(tickerPrice, strikePrice, timeToExpiration, riskFreeRate, optionPrice, optionType);
  addLog("=> IV = ", (100*iv).toFixed(2)," %");

  iv = impliedVolatilityV3(tickerPrice, strikePrice, timeToExpiration, riskFreeRate, optionPrice, optionType);
  addLog("=> IV = ", (100*iv).toFixed(2)," %");

}
