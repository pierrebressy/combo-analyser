import { cookie_manager } from '../utils/cookie.js';

export function save_legs_to_cookie(legs, symbol) {
    const dataStr = JSON.stringify(legs, null, 2);
    const cookie_name = 'combo_' + encodeURIComponent(symbol);
    cookie_manager.set_cookie(cookie_name, dataStr, 7);
    console.log('Exported legs as cookie:', cookie_name, dataStr);
  }
