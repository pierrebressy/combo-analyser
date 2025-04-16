import { load_local_option_chain } from './network.js';
import { addLog } from './log.js';
import { TabsManager } from './tabs_manager.js';
import { compute_iv_dichotomy } from './iv.js';

let selectedCells = [];


function remaining_days2(expiry) {

    // Convert to YYYY-MM-DD string
    const expiryStr = expiry.toString();
    const expiryDate = new Date(
        parseInt(expiryStr.substring(0, 4)),        // Year
        parseInt(expiryStr.substring(4, 6)) - 1,    // Month (0-based)
        parseInt(expiryStr.substring(6, 8))         // Day
    );

    // Today's date (without time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Difference in milliseconds and convert to days
    const diffTime = expiryDate - today;
    //const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffDays = (diffTime / (1000. * 60 * 60 * 24));

    return diffDays
}
function remaining_days(expiry) {
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

export async function add_option_chain_container_in_tab_container(tab_container) {

    let option_chain = await load_local_option_chain();
    addLog("option_chain #tickers=", Object.keys(option_chain).length);

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
    // TODO: upate the reference price
    let referencePrice = 202.19;

    for (const ticker of Object.keys(option_chain)) {
        container = oc_tabs_manager.add_tab(ticker, ticker + '-oc-tab-container', ticker + '-oc-container');

        const heading = document.createElement('h2');
        heading.classList.add('std-text');
        heading.textContent = 'Expiry dates for ' + ticker + " last price: " + referencePrice.toFixed(2);

        ////////// ----->>>>>
        const selectedListContainer = document.createElement("div");
        selectedListContainer.id = "selected-list";
        selectedListContainer.style.marginTop = "20px";
        selectedListContainer.style.padding = "10px";
        selectedListContainer.style.backgroundColor = "#111";
        selectedListContainer.style.color = "#fff";
        selectedListContainer.style.border = "1px solid #444";
        selectedListContainer.innerHTML = "<strong>Selected Options:</strong><ul></ul>";

        selectedListContainer.querySelector("ul");


        const selectedContainer = document.createElement("div");
        selectedContainer.id = ticker + "-selected-container";
        //console.log("selectedContainer.id=", selectedContainer.id);
        selectedContainer.style.marginTop = "20px";
        selectedContainer.style.padding = "10px";
        selectedContainer.style.backgroundColor = "#111";
        selectedContainer.style.color = "#fff";
        selectedContainer.style.border = "1px solid #444";

        selectedContainer.innerHTML = `
          <strong>Selected Options for ${ticker}</strong>
          <table id="selected-table" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
              <tr style="background-color: #222;">
                <th>Type</th>
                <th>Strike</th>
                <th>Mid</th>
                <th>Expiration</th>
                <th>Qty</th>
        <th>Remove</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        `;


        ////////// <<<<------
        // Assemble header
        container.appendChild(heading);

        let oc_expiries_tabs_manager = new TabsManager(container, ticker + "oc-expiries-tabs-manager");
        for (const expiry of Object.keys(option_chain[ticker])) {
            if (remaining_days(expiry) > 0) {
                let container3 = oc_expiries_tabs_manager.add_tab(expiry + " - " + remaining_days(expiry) + "d", ticker + '-' + expiry + '-oc-tab-container', ticker + '-' + expiry + '-oc-container');
                addLog(ticker, expiry, "remaining_days=", remaining_days(expiry), referencePrice);
                add_option_chain_table_v3(container3, option_chain[ticker][expiry], ticker, expiry, referencePrice);

            }
        }
        container.appendChild(selectedContainer);

        oc_expiries_tabs_manager.activate_last_tab();

    }
    oc_tabs_manager.activate_last_tab();//activate_tab(current_ticker);

    // Add to tab container
    tab_container.appendChild(oc_container);
}

export async function add_option_chain_table_v3(test_container, option_chain, ticker, current_expiry, referencePrice) {

    const calls = option_chain.calls;
    const puts = option_chain.puts;

    const time_to_expiry = remaining_days(current_expiry) / 365.;
    const riskFreeRate = 0.04; // Example risk-free rate

    console.log("option_chain=", option_chain.strikes);
    console.log("num calls=", calls.length);
    console.log("num puts=", puts.length);
    const maxLen = Math.max(calls.length, puts.length);

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

    let option_chain_container = document.createElement('div');
    option_chain_container.classList.add('table-container');
    option_chain_container.id = 'table-container';
    test_container.appendChild(option_chain_container);

    const hoverLabel = document.createElement("div");
    hoverLabel.style.position = "absolute";
    hoverLabel.style.backgroundColor = "#000";
    hoverLabel.style.color = "#fff";
    hoverLabel.style.padding = "2px 6px";
    hoverLabel.style.borderRadius = "4px";
    hoverLabel.style.fontSize = "12px";
    hoverLabel.style.pointerEvents = "none";
    hoverLabel.style.display = "none";
    hoverLabel.style.zIndex = "1000";
    document.body.appendChild(hoverLabel);

    const table = document.createElement("table");
    option_chain_container.appendChild(table);

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const headers = ["IV (mid)", "Call Bid", "Call Mid", "Call Ask", "Strike", "Put Bid", "Put Mid", "Put Ask", "IV (mid)"];
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

    combined.forEach((row, i) => {
        const tr = document.createElement("tr");

        const values = [
            row.call_mid_iv,
            row.call_bid, row.call_mid, row.call_ask,
            row.strike,
            row.put_bid, row.put_mid, row.put_ask,
            row.put_mid_iv
        ];

        values.forEach((val, j) => {
            const td = document.createElement("td");
            td.style.textAlign = "center";
            if(val===null) {
                td.textContent = "N/A";
                td.style.color = "#888";
                td.style.backgroundColor = "#222";
                td.style.cursor = "not-allowed";
                td.style.pointerEvents = "none";
            }
            else {
                td.textContent = (val * 1.0).toFixed(2);
            }


            td.addEventListener("mouseover", () => {
                td.dataset.originalColor = td.style.backgroundColor;  // Save current bg
                if (j === 1 || j === 5) {
                    td.style.backgroundColor = "#600"; // red background
                    hoverLabel.textContent = "Sell";
                    hoverLabel.style.backgroundColor = "#900";
                    hoverLabel.style.display = "block";
                } else if (j === 3 || j === 7) {
                    td.style.backgroundColor = "#003366"; // blue background
                    hoverLabel.textContent = "Buy";
                    hoverLabel.style.backgroundColor = "#0066cc";
                    hoverLabel.style.display = "block";
                }
            });

            td.addEventListener("mousemove", (event) => {
                hoverLabel.style.left = event.pageX + 10 + "px";
                hoverLabel.style.top = event.pageY + 10 + "px";
            });

            td.addEventListener("mouseout", () => {
                td.style.backgroundColor = td.dataset.originalColor || "";  // Restore saved bg
                hoverLabel.style.display = "none";
            });

            td.addEventListener("click", () => {
                if (j === 0 || j === 2 || j === 4 || j === 6 || j === 8) {
                    return;
                }
                const type = (j === 1 || j === 3) ? "call" : "put";
                const leg = {
                    strike: row.strike,
                    type,
                    value: val,
                    qty: (j === 1 || j === 5) ? -1 : 1
                }
                //if (isDuplicate(leg, selectedCells)) {
                //    console.log("Duplicate leg:", leg);
                //    return;
                //}
                const existingIndex = selectedCells.findIndex(existing =>
                    existing.strike === leg.strike &&
                    existing.type === leg.type &&
                    existing.expiry === leg.expiry
                );
                if (existingIndex !== -1) {
                    console.log("Already selected:", leg);
                    selectedCells[existingIndex].qty += leg.qty;
                    console.log("Updated qty for leg:", selectedCells[existingIndex]);
                    const selectedTableBody = document.querySelector(`#${ticker}-selected-container tbody`);
                    const rows = selectedTableBody.querySelectorAll("tr");


                    const rowToUpdate = rows[existingIndex];
                    if (selectedCells[existingIndex].qty === 0) {
                        // Remove from DOM
                        rowToUpdate.remove();
                        //td.style.backgroundColor = td.dataset.originalColor || "";  // Restore saved bg
                        // Remove from data
                        selectedCells.splice(existingIndex, 1);
                        console.log("Removed leg with 0 qty");
                        return;
                    }

                    if (rowToUpdate) {
                        const qtyInput = rowToUpdate.children[4].querySelector('input');
                        if (qtyInput) {
                            const updatedQty = selectedCells[existingIndex].qty;
                            selectedCells[existingIndex].qty = updatedQty;
                            qtyInput.value = updatedQty;
                        }
                    }

                    return;
                }

                selectedCells.push(leg);
                console.log("Selected:", selectedCells);
                // add the leg to the selected table
                const selectedTableBody = document.querySelector(`#${ticker}-selected-container tbody`);
                //console.log("selectedTableBody=", selectedTableBody);
                const tr = document.createElement("tr");

                ["type", "strike", "value"].forEach(key => {
                    const td = document.createElement("td");
                    td.textContent = key === "type" ? type.toUpperCase() :
                        key === "strike" ? row.strike :
                            val.toFixed(2);
                    td.style.textAlign = "center";
                    tr.appendChild(td);
                });

                const td2 = document.createElement("td");
                td2.textContent = current_expiry
                td2.style.textAlign = "center";
                tr.appendChild(td2);

                // Add editable Qty cell
                const qtyTd = document.createElement("td");
                qtyTd.style.textAlign = "center";  // center cell content
                const qtyInput = document.createElement("input");
                qtyInput.type = "number";
                qtyInput.min = "-5";
                qtyInput.value = leg.qty;
                qtyInput.style.width = "60px";
                qtyInput.style.textAlign = "center";
                qtyTd.appendChild(qtyInput);
                tr.appendChild(qtyTd);

                // Create Remove Button cell
                const removeTd = document.createElement("td");
                removeTd.style.textAlign = "center";

                const removeBtn = document.createElement("button");
                removeBtn.textContent = "✖";
                removeBtn.style.background = "#900";
                removeBtn.style.color = "#fff";
                removeBtn.style.border = "none";
                removeBtn.style.borderRadius = "4px";
                removeBtn.style.cursor = "pointer";
                removeBtn.style.padding = "4px 8px";

                removeBtn.addEventListener("click", () => {
                    // Remove from DOM
                    tr.remove();

                    // Optionally, remove from selectedCells list too
                    const index = selectedCells.findIndex(e =>
                        e.strike === row.strike && e.type === type && e.value === val
                    );
                    if (index !== -1) selectedCells.splice(index, 1);
                });

                removeTd.appendChild(removeBtn);
                tr.appendChild(removeTd);

                //td.style.backgroundColor = leg.qty < 0 ? "#900" : "#0066cc"; // red for sell, blue for buy
                //td.dataset.originalColor = td.style.backgroundColor;  // Save current bg

                selectedTableBody.appendChild(tr);
            });

            // Call Mid is at index 1, Put Mid is at index 5
            if (j === 0 || j === 2 || j === 4 || j === 6) {
                td.style.cursor = "pointer";

            }

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

        const rows = tbody.querySelectorAll("tr");
        if (rows.length === 0) return;

        const targetRow = rows[closestIndex];
        targetRow.scrollIntoView({ behavior: "auto", block: "center" });

        // Optional: highlight it
        targetRow.style.backgroundColor = "#444";
    }, 0);


}

export async function add_option_chain_table_v2(test_container, option_chain, ticker, current_expiry, referencePrice) {

    const calls = option_chain.calls;
    //console.log("calls=", calls);
    const puts = option_chain.puts;

    const time_to_expiry = 15 / 365.;
    const riskFreeRate = 0.04; // Example risk-free rate

    const combined = calls.map((call, i) => ({
        strike: call.strike,
        call_bid: calls[i].bid,
        call_ask: calls[i].ask,
        call_mid: 0.5 * (calls[i].ask + calls[i].bid),
        call_mid_iv: 100 * compute_iv_dichotomy(referencePrice, calls[i].strike, time_to_expiry, riskFreeRate, 0.5 * (calls[i].ask + calls[i].bid), 'call'),
        put_bid: puts[i].bid,
        put_ask: puts[i].ask,
        put_mid: 0.5 * (puts[i].ask + puts[i].bid),
        put_mid_iv: 100 * compute_iv_dichotomy(referencePrice, puts[i].strike, time_to_expiry, riskFreeRate, 0.5 * (puts[i].ask + puts[i].bid), 'put')
    }));

    //console.log("combined=", combined);
    let option_chain_container = document.createElement('div');
    option_chain_container.classList.add('table-container');
    option_chain_container.id = 'table-container';
    test_container.appendChild(option_chain_container);

    const hoverLabel = document.createElement("div");
    hoverLabel.style.position = "absolute";
    hoverLabel.style.backgroundColor = "#000";
    hoverLabel.style.color = "#fff";
    hoverLabel.style.padding = "2px 6px";
    hoverLabel.style.borderRadius = "4px";
    hoverLabel.style.fontSize = "12px";
    hoverLabel.style.pointerEvents = "none";
    hoverLabel.style.display = "none";
    hoverLabel.style.zIndex = "1000";
    document.body.appendChild(hoverLabel);

    const table = document.createElement("table");
    option_chain_container.appendChild(table);

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const headers = ["IV", "Call Bid", "Call Mid", "Call Ask", "Strike", "Put Bid", "Put Mid", "Put Ask", "IV"];
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

    combined.forEach((row, i) => {
        const tr = document.createElement("tr");

        const values = [
            row.call_mid_iv, row.call_bid, row.call_mid, row.call_ask,
            row.strike,
            row.put_bid, row.put_mid, row.put_ask,
            row.put_mid_iv
        ];

        values.forEach((val, j) => {
            const td = document.createElement("td");
            td.style.textAlign = "center";
            td.textContent = val.toFixed(2);


            td.addEventListener("mouseover", () => {
                td.dataset.originalColor = td.style.backgroundColor;  // Save current bg
                if (j === 0 || j === 4) {
                    td.style.backgroundColor = "#600"; // red background
                    hoverLabel.textContent = "Sell";
                    hoverLabel.style.backgroundColor = "#900";
                    hoverLabel.style.display = "block";
                } else if (j === 2 || j === 6) {
                    td.style.backgroundColor = "#003366"; // blue background
                    hoverLabel.textContent = "Buy";
                    hoverLabel.style.backgroundColor = "#0066cc";
                    hoverLabel.style.display = "block";
                }
            });

            td.addEventListener("mousemove", (event) => {
                hoverLabel.style.left = event.pageX + 10 + "px";
                hoverLabel.style.top = event.pageY + 10 + "px";
            });

            td.addEventListener("mouseout", () => {
                td.style.backgroundColor = td.dataset.originalColor || "";  // Restore saved bg
                hoverLabel.style.display = "none";
            });

            td.addEventListener("click", () => {
                if (j % 2 === 1) {
                    return;
                }
                const type = (j === 0 || j === 2) ? "call" : "put";
                const leg = {
                    strike: row.strike,
                    type,
                    value: val,
                    qty: (j === 0 || j === 4) ? -1 : 1
                }
                //if (isDuplicate(leg, selectedCells)) {
                //    console.log("Duplicate leg:", leg);
                //    return;
                //}
                const existingIndex = selectedCells.findIndex(existing =>
                    existing.strike === leg.strike &&
                    existing.type === leg.type &&
                    existing.expiry === leg.expiry
                );
                if (existingIndex !== -1) {
                    console.log("Already selected:", leg);
                    selectedCells[existingIndex].qty += leg.qty;
                    console.log("Updated qty for leg:", selectedCells[existingIndex]);
                    const selectedTableBody = document.querySelector(`#${ticker}-selected-container tbody`);
                    const rows = selectedTableBody.querySelectorAll("tr");


                    const rowToUpdate = rows[existingIndex];
                    if (selectedCells[existingIndex].qty === 0) {
                        // Remove from DOM
                        rowToUpdate.remove();
                        //td.style.backgroundColor = td.dataset.originalColor || "";  // Restore saved bg
                        // Remove from data
                        selectedCells.splice(existingIndex, 1);
                        console.log("Removed leg with 0 qty");
                        return;
                    }

                    if (rowToUpdate) {
                        const qtyInput = rowToUpdate.children[4].querySelector('input');
                        if (qtyInput) {
                            const updatedQty = selectedCells[existingIndex].qty;
                            selectedCells[existingIndex].qty = updatedQty;
                            qtyInput.value = updatedQty;
                        }
                    }

                    return;
                }

                selectedCells.push(leg);
                console.log("Selected:", selectedCells);
                // add the leg to the selected table
                const selectedTableBody = document.querySelector(`#${ticker}-selected-container tbody`);
                //console.log("selectedTableBody=", selectedTableBody);
                const tr = document.createElement("tr");

                ["type", "strike", "value"].forEach(key => {
                    const td = document.createElement("td");
                    td.textContent = key === "type" ? type.toUpperCase() :
                        key === "strike" ? row.strike :
                            val.toFixed(2);
                    td.style.textAlign = "center";
                    tr.appendChild(td);
                });

                const td2 = document.createElement("td");
                td2.textContent = current_expiry
                td2.style.textAlign = "center";
                tr.appendChild(td2);

                // Add editable Qty cell
                const qtyTd = document.createElement("td");
                qtyTd.style.textAlign = "center";  // center cell content
                const qtyInput = document.createElement("input");
                qtyInput.type = "number";
                qtyInput.min = "-5";
                qtyInput.value = leg.qty;
                qtyInput.style.width = "60px";
                qtyInput.style.textAlign = "center";
                qtyTd.appendChild(qtyInput);
                tr.appendChild(qtyTd);

                // Create Remove Button cell
                const removeTd = document.createElement("td");
                removeTd.style.textAlign = "center";

                const removeBtn = document.createElement("button");
                removeBtn.textContent = "✖";
                removeBtn.style.background = "#900";
                removeBtn.style.color = "#fff";
                removeBtn.style.border = "none";
                removeBtn.style.borderRadius = "4px";
                removeBtn.style.cursor = "pointer";
                removeBtn.style.padding = "4px 8px";

                removeBtn.addEventListener("click", () => {
                    // Remove from DOM
                    tr.remove();

                    // Optionally, remove from selectedCells list too
                    const index = selectedCells.findIndex(e =>
                        e.strike === row.strike && e.type === type && e.value === val
                    );
                    if (index !== -1) selectedCells.splice(index, 1);
                });

                removeTd.appendChild(removeBtn);
                tr.appendChild(removeTd);

                //td.style.backgroundColor = leg.qty < 0 ? "#900" : "#0066cc"; // red for sell, blue for buy
                //td.dataset.originalColor = td.style.backgroundColor;  // Save current bg

                selectedTableBody.appendChild(tr);
            });

            // Call Mid is at index 1, Put Mid is at index 5
            if (j === 0 || j === 2 || j === 4 || j === 6) {
                td.style.cursor = "pointer";

            }

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
        const rows = tbody.querySelectorAll("tr");
        if (rows.length === 0) return;

        const targetRow = rows[closestIndex];
        targetRow.scrollIntoView({ behavior: "auto", block: "center" });

        // Optional: highlight it
        targetRow.style.backgroundColor = "#444";
    }, 0);


}

export async function add_option_chain_table(test_container, option_chain, ticker, current_expiry, referencePrice) {

    const calls = option_chain.calls;
    const puts = option_chain.puts;

    const combined = calls.map((call, i) => ({
        strike: call.strike,
        call_bid: calls[i].price,
        call_ask: calls[i].price,
        call_mid: calls[i].price,
        put_bid: puts[i].price,
        put_ask: puts[i].price,
        put_mid: puts[i].price
    }));


    let option_chain_container = document.createElement('div');
    option_chain_container.classList.add('table-container');
    option_chain_container.id = 'table-container';
    test_container.appendChild(option_chain_container);

    const hoverLabel = document.createElement("div");
    hoverLabel.style.position = "absolute";
    hoverLabel.style.backgroundColor = "#000";
    hoverLabel.style.color = "#fff";
    hoverLabel.style.padding = "2px 6px";
    hoverLabel.style.borderRadius = "4px";
    hoverLabel.style.fontSize = "12px";
    hoverLabel.style.pointerEvents = "none";
    hoverLabel.style.display = "none";
    hoverLabel.style.zIndex = "1000";
    document.body.appendChild(hoverLabel);

    const table = document.createElement("table");
    option_chain_container.appendChild(table);

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const headers = ["Call Bid", "Call Mid", "Call Ask", "Strike", "Put Bid", "Put Mid", "Put Ask"];
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

    combined.forEach((row, i) => {
        const tr = document.createElement("tr");

        const values = [
            row.call_bid, row.call_mid, row.call_ask,
            row.strike,
            row.put_bid, row.put_mid, row.put_ask
        ];

        values.forEach((val, j) => {
            const td = document.createElement("td");
            td.style.textAlign = "center";
            td.textContent = val.toFixed(2);


            td.addEventListener("mouseover", () => {
                td.dataset.originalColor = td.style.backgroundColor;  // Save current bg
                if (j === 0 || j === 4) {
                    td.style.backgroundColor = "#600"; // red background
                    hoverLabel.textContent = "Sell";
                    hoverLabel.style.backgroundColor = "#900";
                    hoverLabel.style.display = "block";
                } else if (j === 2 || j === 6) {
                    td.style.backgroundColor = "#003366"; // blue background
                    hoverLabel.textContent = "Buy";
                    hoverLabel.style.backgroundColor = "#0066cc";
                    hoverLabel.style.display = "block";
                }
            });

            td.addEventListener("mousemove", (event) => {
                hoverLabel.style.left = event.pageX + 10 + "px";
                hoverLabel.style.top = event.pageY + 10 + "px";
            });

            td.addEventListener("mouseout", () => {
                td.style.backgroundColor = td.dataset.originalColor || "";  // Restore saved bg
                hoverLabel.style.display = "none";
            });

            td.addEventListener("click", () => {
                if (j % 2 === 1) {
                    return;
                }
                const type = (j === 0 || j === 2) ? "call" : "put";
                const leg = {
                    strike: row.strike,
                    type,
                    value: val,
                    qty: (j === 0 || j === 4) ? -1 : 1
                }
                //if (isDuplicate(leg, selectedCells)) {
                //    console.log("Duplicate leg:", leg);
                //    return;
                //}
                const existingIndex = selectedCells.findIndex(existing =>
                    existing.strike === leg.strike &&
                    existing.type === leg.type &&
                    existing.expiry === leg.expiry
                );
                if (existingIndex !== -1) {
                    console.log("Already selected:", leg);
                    selectedCells[existingIndex].qty += leg.qty;
                    console.log("Updated qty for leg:", selectedCells[existingIndex]);
                    const selectedTableBody = document.querySelector(`#${ticker}-selected-container tbody`);
                    const rows = selectedTableBody.querySelectorAll("tr");


                    const rowToUpdate = rows[existingIndex];
                    if (selectedCells[existingIndex].qty === 0) {
                        // Remove from DOM
                        rowToUpdate.remove();
                        //td.style.backgroundColor = td.dataset.originalColor || "";  // Restore saved bg
                        // Remove from data
                        selectedCells.splice(existingIndex, 1);
                        console.log("Removed leg with 0 qty");
                        return;
                    }

                    if (rowToUpdate) {
                        const qtyInput = rowToUpdate.children[4].querySelector('input');
                        if (qtyInput) {
                            const updatedQty = selectedCells[existingIndex].qty;
                            selectedCells[existingIndex].qty = updatedQty;
                            qtyInput.value = updatedQty;
                        }
                    }

                    return;
                }

                selectedCells.push(leg);
                console.log("Selected:", selectedCells);
                // add the leg to the selected table
                const selectedTableBody = document.querySelector(`#${ticker}-selected-container tbody`);
                //console.log("selectedTableBody=", selectedTableBody);
                const tr = document.createElement("tr");

                ["type", "strike", "value"].forEach(key => {
                    const td = document.createElement("td");
                    td.textContent = key === "type" ? type.toUpperCase() :
                        key === "strike" ? row.strike :
                            val.toFixed(2);
                    td.style.textAlign = "center";
                    tr.appendChild(td);
                });

                const td2 = document.createElement("td");
                td2.textContent = current_expiry
                td2.style.textAlign = "center";
                tr.appendChild(td2);

                // Add editable Qty cell
                const qtyTd = document.createElement("td");
                qtyTd.style.textAlign = "center";  // center cell content
                const qtyInput = document.createElement("input");
                qtyInput.type = "number";
                qtyInput.min = "-5";
                qtyInput.value = leg.qty;
                qtyInput.style.width = "60px";
                qtyInput.style.textAlign = "center";
                qtyTd.appendChild(qtyInput);
                tr.appendChild(qtyTd);

                // Create Remove Button cell
                const removeTd = document.createElement("td");
                removeTd.style.textAlign = "center";

                const removeBtn = document.createElement("button");
                removeBtn.textContent = "✖";
                removeBtn.style.background = "#900";
                removeBtn.style.color = "#fff";
                removeBtn.style.border = "none";
                removeBtn.style.borderRadius = "4px";
                removeBtn.style.cursor = "pointer";
                removeBtn.style.padding = "4px 8px";

                removeBtn.addEventListener("click", () => {
                    // Remove from DOM
                    tr.remove();

                    // Optionally, remove from selectedCells list too
                    const index = selectedCells.findIndex(e =>
                        e.strike === row.strike && e.type === type && e.value === val
                    );
                    if (index !== -1) selectedCells.splice(index, 1);
                });

                removeTd.appendChild(removeBtn);
                tr.appendChild(removeTd);

                //td.style.backgroundColor = leg.qty < 0 ? "#900" : "#0066cc"; // red for sell, blue for buy
                //td.dataset.originalColor = td.style.backgroundColor;  // Save current bg

                selectedTableBody.appendChild(tr);
            });

            // Call Mid is at index 1, Put Mid is at index 5
            if (j === 0 || j === 2 || j === 4 || j === 6) {
                td.style.cursor = "pointer";

            }

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

        const rows = tbody.querySelectorAll("tr");
        if (rows.length === 0) return;

        const targetRow = rows[closestIndex];
        targetRow.scrollIntoView({ behavior: "auto", block: "center" });

        // Optional: highlight it
        targetRow.style.backgroundColor = "#444";
    }, 0);


}








