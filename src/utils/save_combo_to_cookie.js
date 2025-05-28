import { cookie_manager } from '../utils/cookie.js';
import { DateManager } from '../utils/date.js';

export   function save_combo_to_cookie(cookie_name, legs, symbol) {
    console.log("[save_combo] legs=", legs, legs === undefined);
    if (legs === undefined || legs.length === 0) {
      console.log("[save_combo] no legs");
      return;
    }
    let json = {};
    json.ticker = symbol;
    json.legs = [];
    let soonest_expiry = legs[0].expiry;
    let max_price = legs[0].strike;
    let min_price = legs[0].strike;
    console.log("[save_combo] json=", json);
    legs.forEach(leg => {
      console.log("[save_combo] leg=", leg);
      if (leg.expiry < soonest_expiry) {
        soonest_expiry = leg.expiry;
      }
      if (leg.strike > max_price) {
        max_price = leg.strike;
      }
      if (leg.strike < min_price) {
        min_price = leg.strike;
      }

      let l = {};
      // TODO: replace 0.2 with a real IV
      l.iv = 0.2;
      l.qty = leg.count;
      l.strike = leg.strike;
      l.type = leg.type;
      l.price = leg.price;
      // TODO: replace 0 with a real expiration_offset
      l.expiration_offset = 0;
      json.legs.push(l);

    });
    console.log("min_price=", min_price * 0.8);
    console.log("max_price=", max_price * 1.2);
    json.name = "Combo Builder";
    json.simulation = {};
    // TODO: replace 0 with a real expiration_offset
    json.simulation.expiration_offset = 0;
    // TODO: replace 0.04 with a real interest_rate
    json.simulation.interest_rate = 0.04;
    json.simulation.max_price = max_price * 1.2;
    // TODO: replace 0.3 with a real mean_volatility
    json.simulation.mean_volatility = 0.3;
    json.simulation.min_price = min_price * 0.8;
    // TODO: replace 0.5 with a adapted  simulation
    json.simulation.step = 0.5
    console.log("soonest_expiry=", soonest_expiry);
    const remaining_days = new DateManager(soonest_expiry).remaining_days()
    console.log("remaining_days=", remaining_days);
    // TODO: replace 10 with a real time_for_simulation
    json.simulation.time_for_simulation = 10;
    // TODO: replace 30 with a real time_to_expiry
    json.simulation.time_to_expiry = 30;
    json.ticker = symbol;
    console.log("json=", json);
    cookie_manager.save_JSON_in_cookie(cookie_name, json);

  }

