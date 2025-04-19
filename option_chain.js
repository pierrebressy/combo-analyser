import { load_local_option_chain } from './network.js';
import { addLog } from './log.js';
import { TabsManager } from './tabs_manager.js';
import { compute_iv_dichotomy } from './iv.js';
import { days_between_dates, remaining_days, is_third_friday } from './computation.js';
import { computeOptionPrice } from './computation.js';

import { saveJSONInCookie, loadJSONFromCookie } from './network.js';
let display_profile = false;

function get_td_bid_ask(expiry, strike, type) {
    let selector_bid = 'td[data-expiry="' + expiry + '"][data-strike="' + strike + '"][data-type="' + type + '-bid"]';
    let selector_ask = 'td[data-expiry="' + expiry + '"][data-strike="' + strike + '"][data-type="' + type + '-ask"]';
    const td_bid = document.querySelector(selector_bid);
    const td_ask = document.querySelector(selector_ask);
    return { td_bid, td_ask };
}

function set_td_bgnd(td, count) {
    td.classList.add("oc-dark-bg");
    td.classList.remove("bid");
    td.classList.remove("ask");
    if (count < 0) {
        td.classList.add("bid");
    }
    else if (count > 0) {
        td.classList.add("ask");
    }
    else {
    }
}

function set_td_bid_ask_bgnd(td_bid, td_ask, count) {
    set_td_bgnd(td_bid, Math.min(count, 0));
    set_td_bgnd(td_ask, Math.max(count, 0));
}

class OptionChain {

    constructor(ticker, chain) {
        this.ticker = ticker;
        this.chain = chain;
        this.referencePrice = chain.last_price;
        this.legs = [];
        let leg_from_cookie = loadJSONFromCookie(this.ticker + "-legs");
        if (leg_from_cookie !== null) {
            this.legs = leg_from_cookie;
        }

        this.expiry = [];
        for (const expiry of this.get_expiries_list()) {
            //console.log("... expiry=", expiry);
            chain = this.get_chain_for_expiry(expiry)
            let calls = chain.calls;
            let puts = chain.puts;
            //console.log("..... calls=", calls);
            //console.log("..... puts=", puts);
            const time_to_expiry = remaining_days(expiry) / 365.;
            const referencePrice = this.get_last_price(expiry);
            //console.log("time_to_expiry=", time_to_expiry);
            const riskFreeRate = 0.04; // Example risk-free rate
            const maxLen = Math.max(calls.length, puts.length);
            //console.log("maxLen=", maxLen);

            const combined = Array.from({ length: maxLen }, (_, i) => {
                const call = calls[i];
                const put = puts[i];

                const strike = call?.strike ?? put?.strike ?? null;

                const callPrice = call?.price ?? null;
                const putPrice = put?.price ?? null;

                const callMidIv = (callPrice !== null && strike !== null)
                    ? (100 * compute_iv_dichotomy(referencePrice, strike, time_to_expiry, riskFreeRate, callPrice, 'call'))
                    : null;

                const putMidIv = (putPrice !== null && strike !== null)
                    ? (100 * compute_iv_dichotomy(referencePrice, strike, time_to_expiry, riskFreeRate, putPrice, 'put'))
                    : null;

                return {
                    strike: strike,
                    call_count: 0,
                    put_count: 0,
                    call_bid: callPrice,
                    call_ask: callPrice,
                    call_mid: callPrice,
                    call_mid_iv: callMidIv,
                    put_bid: putPrice,
                    put_ask: putPrice,
                    put_mid: putPrice,
                    put_mid_iv: putMidIv
                };
            });
            this.expiry.push({ expiry: expiry, combined: combined });
        }
        //console.log("this.expiry=", this.expiry);
    }

    clear_legs() {
        this.legs.forEach(leg => {
            let l = this.get_expiries_list();
            const expiryIndex = l.findIndex(e => e === leg.expiry);
            let c = this.expiry[expiryIndex].combined;
            const i = c.findIndex(e => e.strike === leg.strike);
            if (expiryIndex !== -1) {
                this.expiry[expiryIndex].combined[i].call_count = 0;
                const { td_bid, td_ask } = get_td_bid_ask(leg.expiry, leg.strike, leg.type);
                set_td_bid_ask_bgnd(td_bid, td_ask, 0);
                td_bid.textContent = (leg.value * 1.0).toFixed(2);
                td_ask.textContent = (leg.value * 1.0).toFixed(2);
            }
            this.legs = [];
            const btn = document.getElementById("tab-button-" + leg.expiry);
            btn.classList.remove("used");

        });
        saveJSONInCookie(this.ticker + "-legs", this.legs);
    }

    add_leg(leg) {
        this.legs.push(leg);
        this.simplify_legs_table();
    }
    simplify_legs_table() {
        let simplified = [];
        for (const leg of this.legs) {
            const existingLeg = simplified.find(l => l.strike === leg.strike && l.type === leg.type && l.expiry === leg.expiry && l.type === leg.type);
            if (existingLeg) {
                existingLeg.qty += leg.qty;
            } else {
                simplified.push(leg);
            }
        }
        /// remove legs with qty=0
        simplified = simplified.filter(leg => leg.qty !== 0);
        this.legs = simplified;
        addLog("Simplified Legs:", this.legs);
        saveJSONInCookie(this.ticker + "-legs", this.legs);
    }
    get_calls_list(expiry) {
        return this.chain[expiry].calls;
    }
    get_puts_list(expiry) {
        return this.chain[expiry].puts;
    }
    get_strikes_list(expiry) {
        return this.chain[expiry].strikes;
    }
    get_expiries_list() {
        return Object.keys(this.chain)
    }
    get_chain_for_expiry(expiry) {
        return this.chain[expiry];
    }
    get_last_price(expiry) {
        return this.chain[expiry].last_price;
    }
    get_historic_volatility(expiry) {
        return this.chain[expiry].historic_volatility;
    }
    get_combined_data(expiry) {
        for (const e of this.expiry) {
            if (e.expiry === expiry) {
                return e.combined;
            }
        }
        addLog("getCombined: expiry not found", expiry, { error: true });
        return null;
    }
}

function create_selected_contracts_list(option_chain, ticker) {

    console.log(option_chain.legs);
    const selectedListContainer = document.createElement("div");
    selectedListContainer.id = ticker + "-selected-list";
    selectedListContainer.style.marginTop = "20px";
    selectedListContainer.style.padding = "10px";
    selectedListContainer.style.backgroundColor = "#111";
    selectedListContainer.style.color = "#fff";
    selectedListContainer.style.border = "1px solid #444";

    selectedListContainer.querySelector("ul");

    const selectedContainer = document.createElement("div");
    selectedContainer.id = ticker + "-selected-container";
    selectedContainer.style.marginTop = "20px";
    selectedContainer.style.padding = "10px";
    selectedContainer.style.backgroundColor = "#111";
    selectedContainer.style.color = "#fff";
    selectedContainer.style.border = "1px solid #444";


    selectedContainer.innerHTML = ""; // Clear previous content

    // Title
    const title = document.createElement("strong");
    title.textContent = `Selected Options for ${ticker}`;
    selectedContainer.appendChild(title);

    // save Button
    const saveBtn = document.createElement("button");
    saveBtn.id = "save-selected";
    saveBtn.classList.add("clear-button");
    saveBtn.textContent = "Save Combo";
    saveBtn.addEventListener("click", () => {
        create_json_from_combo(option_chain)
    });
    selectedContainer.appendChild(saveBtn);

    // view Button
    const viewBtn = document.createElement("button");
    viewBtn.id = "view-selected";
    viewBtn.classList.add("clear-button");
    viewBtn.textContent = "View Combo Profile";
    viewBtn.addEventListener("click", () => {
        display_profile=true;
        open_modal_window(option_chain)
    });

    selectedContainer.appendChild(viewBtn);

    // Clear Button
    const clearBtn = document.createElement("button");
    clearBtn.id = "clear-selected";
    clearBtn.classList.add("clear-button");
    clearBtn.textContent = "Clear";
    clearBtn.addEventListener("click", () => {
        option_chain.clear_legs();
        update_selected_table(option_chain);
    });

    selectedContainer.appendChild(clearBtn);

    // Table
    const table = document.createElement("table");
    table.id = ticker + "-selected-table";
    table.style.cssText = `
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    `;

    // Thead
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    headerRow.style.backgroundColor = "#222";

    ["Qty", "Type", "Strike", "Expiration", "Premium"].forEach(text => {
        const th = document.createElement("th");
        th.textContent = text;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Tbody
    const tbody = document.createElement("tbody");
    table.appendChild(tbody);

    // Append the table to the container
    selectedContainer.appendChild(table);

    return selectedContainer;
}

function update_selected_table(oc) {

    const selectedTableBody = document.querySelector(`#${oc.ticker}-selected-table tbody`);
    selectedTableBody.innerHTML = "";

    oc.legs.sort((a, b) => a.strike - b.strike);
    oc.legs.forEach(leg => {
        const tr = document.createElement("tr");

        let td = document.createElement("td");
        td.textContent = leg.qty
        td.style.textAlign = "center";
        tr.appendChild(td);

        td = document.createElement("td");
        td.textContent = leg.type.toUpperCase()
        td.style.textAlign = "center";
        tr.appendChild(td);

        td = document.createElement("td");
        td.textContent = leg.strike.toFixed(2);
        td.style.textAlign = "center";
        tr.appendChild(td);

        td = document.createElement("td");
        td.textContent = leg.expiry
        td.style.textAlign = "center";
        tr.appendChild(td);

        td = document.createElement("td");
        td.textContent = leg.value.toFixed(2);
        td.style.textAlign = "center";
        tr.appendChild(td);

        selectedTableBody.appendChild(tr);

    });
    if (oc.legs.length > 0) {
        open_modal_window(oc);
    }
    else {
        close_modal_window();
    }
}

function update_oc_table(oc) {

    oc.legs.forEach(leg => {
        let count;
        let value_bid;
        let value_ask;
        let td_bid;
        let td_ask;
        const expiry_index = oc.expiry.findIndex(e => e.expiry === leg.expiry);
        const strike_index = oc.expiry[expiry_index].combined.findIndex(e => e.strike === leg.strike);
        count = leg.qty
        if (leg.type === "call") {
            oc.expiry[expiry_index].combined[strike_index].call_count = leg.qty
            value_bid = oc.expiry[expiry_index].combined[strike_index].call_bid;
            value_ask = oc.expiry[expiry_index].combined[strike_index].call_ask;
        }
        else {
            oc.expiry[expiry_index].combined[strike_index].put_count = leg.qty
            value_bid = oc.expiry[expiry_index].combined[strike_index].put_bid;
            value_ask = oc.expiry[expiry_index].combined[strike_index].put_ask;
        }
        ({ td_bid, td_ask } = get_td_bid_ask(leg.expiry, leg.strike, leg.type));
        td_bid.textContent = ((count <= -1) ? (count + " x ") : "") + (value_bid * 1.0).toFixed(2)
        td_ask.textContent = ((count >= 1) ? (count + " x ") : "") + (value_ask * 1.0).toFixed(2)

        set_td_bid_ask_bgnd(td_bid, td_ask, count);

        td_bid.dataset.originalColor = td_bid.style.backgroundColor;  // Save current bg
        td_ask.dataset.originalColor = td_ask.style.backgroundColor;  // Save current bg

        const btn = document.getElementById("tab-button-" + leg.expiry);
        if (count == 0) {
            btn.classList.remove("used");
        }
        else {
            btn.classList.add("used");
        }

    });
}

export async function add_option_chain_container_in_tab_container(tab_container) {


    //addLog("option_chain #tickers=", Object.keys(option_chain).length);

    let oc_container = document.createElement('div');
    oc_container.classList.add('oc-container');
    oc_container.id = 'oc-container';

    // Create header container (for heading + button)
    const headerContainer = document.createElement('div');
    headerContainer.style.display = 'flex';
    headerContainer.style.justifyContent = 'space-between';
    headerContainer.style.alignItems = 'center';

    // Heading
    const heading = document.createElement('h2');
    heading.classList.add('std-text');
    heading.textContent = 'TICKERS OPTION CHAIN';

    // Assemble header
    headerContainer.appendChild(heading);
    oc_container.appendChild(headerContainer);

    let oc_tabs_manager = new TabsManager(oc_container, "oc-tabs-manager");
    let container;




    let loaded_option_chain = await load_local_option_chain();
    const option_chain = {};

    Object.keys(loaded_option_chain).forEach(ticker => {
        const cleaned_ticker = ticker.replace(/[\^\$]/g, "");
        option_chain[cleaned_ticker] = loaded_option_chain[ticker];
    });

    for (const ticker of Object.keys(option_chain)) {

        let oc = new OptionChain(ticker, option_chain[ticker]);

        container = oc_tabs_manager.add_tab(ticker, ticker + '-oc');//, open_modal_window, oc);

        const heading = document.createElement('h2');
        heading.classList.add('std-text');
        heading.textContent = 'Expiry dates for ' + ticker

        //addLog("option_chain #Expiry dates=", oc.getExpiries());

        container.appendChild(heading);

        let oc_expiries_tabs_manager = new TabsManager(container, ticker + "oc-expiries-tabs-manager");
        for (const expiry of oc.get_expiries_list()) {
            if (remaining_days(expiry) > 0) {
                let container3 = oc_expiries_tabs_manager.add_tab(
                    expiry + " - " + remaining_days(expiry).toFixed(0) + "d",
                    ticker + '-' + expiry + '-oc');
                let selector = oc_expiries_tabs_manager.selectors[oc_expiries_tabs_manager.selectors.length - 1].selector;
                if (is_third_friday(expiry)) {
                    selector.classList.add("third-friday");
                }
                add_option_chain_table(container3, oc, expiry);

            }
        }
        // Add selected contracts list
        const selectedContainer = create_selected_contracts_list(oc, ticker);
        container.appendChild(selectedContainer);

        oc_expiries_tabs_manager.activate_last_tab();

        // add the content to the tab when all data are loaded
        setTimeout(() => {

            update_selected_table(oc);

        }, 0);

    }
    oc_tabs_manager.activate_last_tab();

    // Add to tab container
    tab_container.appendChild(oc_container);

}

async function add_option_chain_table(test_container, oc, expiry) {

    const referencePrice = oc.get_last_price(expiry);
    //console.log("referencePrice=", referencePrice);
    const historic_volatility = oc.get_historic_volatility(expiry);
    //console.log("historic_volatility=", historic_volatility);
    const strikes = oc.get_strikes_list(expiry);
    //console.log("strikes=", strikes);
    // find the closest strike to the reference price
    let closestStrike = null;
    let closestDiff = Infinity;
    for (const strike of strikes) {
        const diff = Math.abs(strike - referencePrice);
        if (diff < closestDiff) {
            closestDiff = diff;
            closestStrike = strike;
        }
    }
    //console.log("closestStrike=", closestStrike);

    let sigma = referencePrice * historic_volatility * Math.sqrt(remaining_days(expiry) / 252);
    //console.log("sigma=", sigma);



    let option_chain_container = document.createElement('div');
    option_chain_container.classList.add('table-container');
    option_chain_container.id = 'table-container';
    test_container.appendChild(option_chain_container);

    const hoverLabel = document.createElement("div");
    hoverLabel.classList.add("hover-label");
    /*    hoverLabel.style.position = "absolute";
        hoverLabel.style.backgroundColor = "#000";
        hoverLabel.style.color = "#fff";
        hoverLabel.style.padding = "2px 6px";
        hoverLabel.style.borderRadius = "4px";
        hoverLabel.style.fontSize = "12px";
        hoverLabel.style.pointerEvents = "none";
        hoverLabel.style.display = "none";
        hoverLabel.style.zIndex = "1000";*/
    document.body.appendChild(hoverLabel);

    const table = document.createElement("table");
    option_chain_container.appendChild(table);

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const headers = ["IV (mid)", "Call Bid", "Call Ask", "Strike", "Put Bid", "Put Ask", "IV (mid)"];
    headers.forEach(text => {
        const th = document.createElement("th");
        th.style.textAlign = "center";
        th.textContent = text;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create tbody
    const tbody = document.createElement("tbody");
    table.appendChild(tbody);
    let closestIndex = 0;
    let minDiff = Infinity;

    let combined = oc.get_combined_data(expiry);
    //console.log("combined=", combined);
    combined.forEach((row, i) => {
        const tr = document.createElement("tr");

        const values = [
            row.call_mid_iv,
            row.call_bid, row.call_ask,
            row.strike,
            row.put_bid, row.put_ask,
            row.put_mid_iv
        ];
        values.forEach((val, j) => {
            const td = document.createElement("td");
            td.setAttribute("data-expiry", expiry);
            td.setAttribute("data-strike", row.strike);

            td.style.textAlign = "center";
            td.classList.add("oc-dark-bg");

            if (val === null) {
                td.textContent = "N/A";
                td.classList.add("na");
                td.style.cursor = "not-allowed";
                td.style.pointerEvents = "none";
            }
            else {
                td.textContent = (val * 1.0).toFixed(2);
                let call_count = combined[i].call_count;
                let put_count = combined[i].put_count;
                if (j == 0 || j == 6) {
                    td.textContent = (val * 1.0).toFixed(2);
                    td.style.cursor = "pointer";
                }
                else if (j == 1) {
                    td.setAttribute("data-type", "call-bid");
                }
                else if (j == 2) {
                    td.setAttribute("data-type", "call-ask");
                }
                else if (j === 3) {
                    if (closestStrike === row.strike) {
                        td.style.backgroundColor = "#000080";
                    } else if (Math.abs(row.strike - referencePrice) <= sigma) {
                        td.style.backgroundColor = "#333380";
                    } else if (Math.abs(row.strike - referencePrice) <= 2 * sigma) {
                        td.style.backgroundColor = "#555580";
                    } else if (Math.abs(row.strike - referencePrice) <= 3 * sigma) {
                        td.style.backgroundColor = "#777780";
                    } else {
                        td.style.backgroundColor = "#555555";
                    }
                }
                else if (j == 4) {
                    td.setAttribute("data-type", "put-bid");
                }
                else if (j == 5) {
                    td.setAttribute("data-type", "put-ask");
                }
            }

            td.addEventListener("mouseover", () => {

                if (j === 1 || j === 4) {
                    td.classList.add("bid_hover");
                    hoverLabel.textContent = "Sell";
                    hoverLabel.classList.add("sell");
                } else if (j === 2 || j === 5) {
                    td.classList.add("ask_hover");
                    hoverLabel.textContent = "Buy";
                    hoverLabel.classList.add("buy");
                }
            });

            td.addEventListener("mousemove", (event) => {
                hoverLabel.style.left = event.pageX + 10 + "px";
                hoverLabel.style.top = event.pageY + 10 + "px";
            });

            td.addEventListener("mouseout", () => {
                td.classList.remove("bid_hover");
                td.classList.remove("ask_hover");
                hoverLabel.classList.remove("sell");
                hoverLabel.classList.remove("buy");
            });

            td.addEventListener("click", () => {
                if (j === 0 || j === 3 || j === 6) {
                    return;
                }
                const type = (j === 1 || j === 2) ? "call" : "put";
                const leg = {
                    expiry: expiry,
                    strike: row.strike,
                    type,
                    value: val,
                    qty: (j === 1 || j === 4) ? -1 : 1,
                    offset: 0
                }
                oc.add_leg(leg);

                let new_count;
                let value_bid;
                let value_ask;

                const expiryIndex = oc.expiry.findIndex(e => e.expiry === expiry);

                if (leg.type === "call") {
                    oc.expiry[expiryIndex].combined[i].call_count += leg.qty;
                    new_count = oc.expiry[expiryIndex].combined[i].call_count
                    value_bid = oc.expiry[expiryIndex].combined[i].call_bid;
                    value_ask = oc.expiry[expiryIndex].combined[i].call_ask;
                }
                else {
                    oc.expiry[expiryIndex].combined[i].put_count += leg.qty;
                    new_count = oc.expiry[expiryIndex].combined[i].put_count
                    value_bid = oc.expiry[expiryIndex].combined[i].put_bid;
                    value_ask = oc.expiry[expiryIndex].combined[i].put_ask;
                }
                let td_bid;
                let td_ask;
                ({ td_bid, td_ask } = get_td_bid_ask(leg.expiry, leg.strike, leg.type));


                td_bid.textContent = ((new_count <= -1) ? (new_count + " x ") : "") + (value_bid * 1.0).toFixed(2)
                td_ask.textContent = ((new_count >= 1) ? (new_count + " x ") : "") + (value_ask * 1.0).toFixed(2)

                set_td_bid_ask_bgnd(td_bid, td_ask, new_count);

                const btn = document.getElementById("tab-button-" + leg.expiry);
                if (new_count == 0) {
                    btn.classList.remove("used");
                }
                else {
                    btn.classList.add("used");
                }


                update_selected_table(oc);


            });

            tr.appendChild(td);
        });
        tbody.appendChild(tr);
        const diff = Math.abs(row.strike - referencePrice);
        if (diff < minDiff) {
            minDiff = diff;
            closestIndex = i;
        }

    });

    setTimeout(() => {

        update_oc_table(oc);
        const rows = tbody.querySelectorAll("tr");
        if (rows.length === 0) return;

        const targetRow = rows[closestIndex];
        targetRow.scrollIntoView({ behavior: "auto", block: "center" });

        // Optional: highlight it
        targetRow.style.backgroundColor = "#444";

    }, 0);


}

function close_modal_window() {

    d3.select(".non-modal-window").remove();
}

function open_modal_window(oc) {
    close_modal_window()
    if (display_profile === false) {
        return;
    }
    const windowDiv = d3.select("body")
        .append("div")
        .attr("class", "non-modal-window");
    const non_modal_window_height = windowDiv.node().getBoundingClientRect().height;
    const non_modal_window_width = windowDiv.node().getBoundingClientRect().width;

    windowDiv.append("span")
        .attr("class", "close-btn")
        .text("✖")
        .on("click", () => windowDiv.remove());

    windowDiv.append("h3").text("Combo profile for " + oc.ticker);

    // Make draggable (basic)
    let isDragging = false;
    let offset = [0, 0];

    windowDiv.select("h3")
        .on("mousedown", function (event) {
            isDragging = true;
            offset = [
                event.clientX - parseInt(windowDiv.style("left")),
                event.clientY - parseInt(windowDiv.style("top"))
            ];
        });

    d3.select(window)
        .on("mousemove", function (event) {
            if (!isDragging) return;
            windowDiv.style("left", (event.clientX - offset[0]) + "px");
            windowDiv.style("top", (event.clientY - offset[1]) + "px");
        })
        .on("mouseup", () => { isDragging = false; });


    // compute the min strike of legs
    let minStrike = Infinity;
    let maxStrike = -Infinity;
    oc.legs.forEach(option => {
        if (option.strike < minStrike) {
            minStrike = option.strike;
        }
        if (option.strike > maxStrike) {
            maxStrike = option.strike;
        }
    });

    if (oc.legs.length === 0) {
        // NO LEGS TO DISPLAY
        return;
    }

    let oldest_date = oc.legs[0].expiry;
    oc.legs.forEach(option => {
        if (option.expiry < oldest_date) {
            oldest_date = option.expiry;
        }
    });
    oc.legs.forEach(option => {
        option.offset = days_between_dates(option.expiry, oldest_date);
    });

    let p_and_l_data = [];
    let minPrice = minStrike * 0.8;
    let maxPrice = maxStrike * 1.2;
    let stepPrice = 1;
    let underlying_price = oc.get_last_price(oc.legs[0].expiry);

    let interest_rate_of_combo = 0.04;
    let v = .3;
    for (let price = minPrice; price <= maxPrice; price += stepPrice) {

        let p_and_l_profile = 0;
        oc.legs.forEach(option => {
            let option_price = computeOptionPrice(underlying_price, option.strike, interest_rate_of_combo, v, 0 + option.offset, option.type);
            let premium = option_price[0];
            let greeks = computeOptionPrice(price, option.strike, interest_rate_of_combo, v, 0 + option.offset, option.type);
            p_and_l_profile = p_and_l_profile + option.qty * 100 * (greeks[0] - premium);
        });
        p_and_l_data.push({ x: price, y: p_and_l_profile });
    }

    let non_modal_window = d3.select(".non-modal-window");
    const svg = non_modal_window.append("svg")
        .attr("width", non_modal_window_width - 30)
        .attr("height", non_modal_window_height - 30);


    const min_p_and_l = d3.min(p_and_l_data, d => d.y);
    const max_p_and_l = d3.max(p_and_l_data, d => d.y);
    const padding_p_and_l = (max_p_and_l - min_p_and_l) * 0.1;
    const p_and_l_graph_height = non_modal_window_height - 60;
    const p_and_l_graph_width = non_modal_window_width - 30;
    let scale_p_and_l = d3.scaleLinear()
        .domain([min_p_and_l - padding_p_and_l, max_p_and_l + padding_p_and_l])
        .range([p_and_l_graph_height, 0]);
    let x_scale = d3.scaleLinear().domain([minPrice, maxPrice]).range([0, p_and_l_graph_width]);
    let p_and_l_graph = svg
        .append("g")
        .attr("class", "p_and_l_graph")
        .attr("transform", `translate(${3}, ${3})`)
        .attr("width", p_and_l_graph_width)
        .attr("height", p_and_l_graph_height)
    p_and_l_graph.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", p_and_l_graph_width)
        .attr("height", p_and_l_graph_height)
        .attr("fill", "var(--bg-right)");

    p_and_l_graph.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(scale_p_and_l));

    p_and_l_graph.append("g").attr("transform", `translate(0,${scale_p_and_l(0)})`).call(d3.axisBottom(x_scale)).selectAll(".tick text").remove();
    draw_profile(p_and_l_graph, x_scale, scale_p_and_l, p_and_l_data);
}

function draw_profile(graph, x_scale, scale, data) {

    // Create SVG definitions for gradients
    const defs = graph.append("defs");

    // Green gradient for positive areas
    const green_gradient = defs.append("linearGradient")
        .attr("id", "greenGradient")
        .attr("x1", "0%").attr("y1", "100%")  // Start at bottom
        .attr("x2", "0%").attr("y2", "0%");   // End at top

    green_gradient.append("stop")
        .attr("offset", "0%")
        .style("stop-color", "var(--gradient-start)");

    green_gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "green");

    // Red gradient for negative areas
    const red_gradient = defs.append("linearGradient")
        .attr("id", "redGradient")
        .attr("x1", "0%").attr("y1", "0%")   // Start at top
        .attr("x2", "0%").attr("y2", "100%"); // End at bottom

    red_gradient.append("stop")
        .attr("offset", "0%")
        .style("stop-color", "var(--gradient-start)");

    red_gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "red");

    // Define the area generator for positive values (above zero)
    const area_below = d3.area()
        .x(d => x_scale(d.x))
        .y0(scale(0))  // Fill down to y=0
        .y1(d => Math.max(scale(d.y), scale(0))) // Only fill above zero
        .curve(d3.curveBasis); // Optional smoothing

    // Define the area generator for negative values (below zero)
    const area_above = d3.area()
        .x(d => x_scale(d.x))
        .y0(scale(0))  // Fill up to y=0
        .y1(d => Math.min(scale(d.y), scale(0))) // Only fill below zero
        .curve(d3.curveBasis);

    // Append the positive (green) gradient area
    graph.append("path")
        .datum(data)
        .attr("fill", "url(#greenGradient)") // Apply green gradient
        .attr("opacity", 0)
        .attr("d", area_above);

    // Append the negative (red) gradient area
    graph.append("path")
        .datum(data)
        .attr("fill", "url(#redGradient)") // Apply red gradient
        .attr("opacity", 0)
        .attr("d", area_below);

    // Append the line on top
    graph.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "var(--exp-path-color)")
        .attr("stroke-width", 2)
        .attr("d", d3.line()
            .x(d => x_scale(d.x))
            .y(d => scale(d.y))
            .curve(d3.curveBasis) // Optional smoothing
        );

}

function create_json_from_combo (oc) {
    let json = {};
    json.ticker = oc.ticker;
    json.legs = [];
    oc.legs.forEach(leg => {
        let l = {};
        l.expiration_offset = leg.offset;
        l.qty = leg.qty;
        l.iv = 0.2;
        l.strike = leg.strike;
        l.type = leg.type;
        l.price = leg.value;
        json.legs.push(l);
    });
    json.name = "Combo Builder";
    json.simulation = {};
    json.simulation.expiration_offset = 0;
    json.simulation.interest_rate = 0.04;
    json.simulation.max_price = 300;
    json.simulation.mean_volatility = 0.2;
    json.simulation.min_price = 100;
    json.simulation.step = 0.5
    json.simulation.time_for_simulation = 15;
    json.simulation.time_to_expiry = remaining_days(oc.legs[0].expiry) / 365.;
    json.ticker = oc.ticker;

    console.log("json=", json);
    saveJSONInCookie("combo-builder", json);
    return json;
}
