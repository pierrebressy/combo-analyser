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
