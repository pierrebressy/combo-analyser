import { set_use_local, get_use_local, set_volatility_is_per_leg } from './global.js';
import { is_mode_local, load_local_price, load_local_config, fetch_price } from './network.js';
import { DataManager } from './data_manager.js';
import { create_main_frame } from './frame.js';
import { cookie_manager } from './cookie.js';
export let global_data;


async function main(reset_data = false) {

    if (reset_data) {
        let config = await load_local_config();
        localStorage.setItem('config', JSON.stringify(config));
    }

    set_use_local(await is_mode_local());
    //set_use_local(true);

    global_data = new DataManager(get_use_local())
    await global_data.setup();

    set_volatility_is_per_leg(global_data.check_if_volatility_is_per_leg());

    let ticker = global_data.get_ticker_for_active_combo()

    let price = get_use_local() ? await load_local_price(ticker) : await fetch_price(ticker);
    global_data.set_underlying_price(price.price);
    global_data.set_original_underlying_price(global_data.get_underlying_price());

    let active_combo_name = cookie_manager.get_cookie("active_combo_name");
    if (active_combo_name) {
        global_data.set_active_combo_name(active_combo_name);
    }
    else {
        global_data.set_active_combo_name("LONG CALL");
    }

    create_main_frame();

}


main(true);

