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
function d1(sigma, S, K, T, r) {
  return (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
}

export function test_iv() {
  const tickerPrice = 182.68;   // S
  const strikePrice = 170;   // K
  const optionType = "call"; // "call" or "put"
  const optionPrice = 17.83;     // Market price of the option
  const timeToExpiration = 18/365.; // Time to expiration in years
  const riskFreeRate = 0.05; // Annualized risk-free rate
  addLog("Ticker price: ", tickerPrice.toFixed(2));
  addLog("Strike price: ", strikePrice.toFixed(2));
  addLog("Option price: ", optionPrice.toFixed(2));
  addLog("Expiration:   ", (365*timeToExpiration).toFixed(1)," days");
  
  const iv = impliedVolatility(tickerPrice, strikePrice, timeToExpiration, riskFreeRate, optionPrice, optionType);
  addLog("=> IV = ", (100*iv).toFixed(2)," %");
  }
