import { load_local_option_chain } from './network.js';
import { setCookie, getCookie } from "./network.js"

let current_expiry = "";
let selectedCells = []; // Outside loop, store globally or export as needed

export async function add_option_chain_table(test_container, ticker, referencePrice) {


    let option_chain = await load_local_option_chain();
    console.log("ticker:", ticker);
    console.log("current_expiry loaded:", current_expiry);
    console.log("local_option_chain #expiration date:", Object.keys(option_chain[ticker]).length);
    console.log("local_option_chain loaded:", Object.keys(option_chain[ticker])[0]);

    let expiry_index = getCookie("expiry_index")
    console.log("expiry_index=", expiry_index);
    if (expiry_index === undefined) {
        expiry_index = 0;
        setCookie("expiry_index", expiry_index, 7);
    }
    console.log("cockie(expiry_index)=", expiry_index);

    current_expiry = Object.keys(option_chain[ticker])[expiry_index];

    const calls = option_chain[ticker][current_expiry].calls;
    const puts = option_chain[ticker][current_expiry].puts;

    const combined = calls.map((call, i) => ({
        strike: call.strike,
        call_bid: call.bid,
        call_ask: call.ask,
        call_mid: 0.5 * (call.ask + call.bid),
        put_bid: puts[i].bid,
        put_ask: puts[i].ask,
        put_mid: 0.5 * (puts[i].ask + puts[i].bid)
    }));

    const ocHeading = document.createElement('text');
    ocHeading.textContent = ticker + " ";
    ocHeading.classList.add('std-text');
    ocHeading.style.textAlign = 'center';
    test_container.appendChild(ocHeading);
    const leftButtonHeading = document.createElement('button');
    leftButtonHeading.textContent = '<';
    leftButtonHeading.classList.add('left-btn');
    leftButtonHeading.onclick = () => {
        console.log("expiry_index=", expiry_index);
        expiry_index = parseInt(expiry_index) - 1;
        if (expiry_index < 0) {
            expiry_index = Object.keys(option_chain[ticker]).length - 1;
        }
        setCookie("expiry_index", expiry_index, 7);
        console.log("cockie(expiry_index)=", expiry_index);
        current_expiry = Object.keys(option_chain[ticker])[expiry_index];
        console.log("current_expiry=", current_expiry);
        test_container.innerHTML = "";
        add_option_chain_table(test_container, ticker, referencePrice);
    };
    test_container.appendChild(leftButtonHeading);
    const ocExpiry = document.createElement('text');
    ocExpiry.textContent = " "+current_expiry+" ";
    ocExpiry.classList.add('std-text');
    ocExpiry.style.textAlign = 'center';
    test_container.appendChild(ocExpiry);
    const rightButtonHeading = document.createElement('button');
    rightButtonHeading.textContent = '>';
    rightButtonHeading.classList.add('right-btn');
    rightButtonHeading.onclick = () => {
        console.log("expiry_index=", expiry_index);
        expiry_index = parseInt(expiry_index) + 1;
        if (expiry_index >= Object.keys(option_chain[ticker]).length) {
            expiry_index = 0;
        }
        setCookie("expiry_index", expiry_index, 7);
        console.log("cockie(expiry_index)=", expiry_index);
        current_expiry = Object.keys(option_chain[ticker])[expiry_index];
        console.log("current_expiry=", current_expiry);
        test_container.innerHTML = "";
        add_option_chain_table(test_container, ticker, referencePrice);
    };
    test_container.appendChild(rightButtonHeading);







    let option_chain_container = document.createElement('div');
    option_chain_container.classList.add('table-container');
    option_chain_container.id = 'table-container';
    test_container.appendChild(option_chain_container);

    const table = document.createElement("table");
    option_chain_container.appendChild(table);




    // const selectedListContainer = document.createElement("div");
    // selectedListContainer.id = "selected-list";
    // selectedListContainer.style.marginTop = "20px";
    // selectedListContainer.style.padding = "10px";
    // selectedListContainer.style.backgroundColor = "#111";
    // selectedListContainer.style.color = "#fff";
    // selectedListContainer.style.border = "1px solid #444";
    // selectedListContainer.innerHTML = "<strong>Selected Options:</strong><ul></ul>";

    // test_container.appendChild(selectedListContainer);
    // const selectedList = selectedListContainer.querySelector("ul");


    const selectedContainer = document.createElement("div");
    selectedContainer.id = "selected-container";
    selectedContainer.style.marginTop = "20px";
    selectedContainer.style.padding = "10px";
    selectedContainer.style.backgroundColor = "#111";
    selectedContainer.style.color = "#fff";
    selectedContainer.style.border = "1px solid #444";

    selectedContainer.innerHTML = `
      <strong>Selected Options:</strong>
      <table id="selected-table" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <thead>
          <tr style="background-color: #222;">
            <th>Type</th>
            <th>Strike</th>
            <th>Mid</th>
            <th>Qty</th>
    <th>Remove</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    `;

    test_container.appendChild(selectedContainer);
    const selectedTableBody = selectedContainer.querySelector("tbody");



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



    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const headers = ["Call Bid", "Call Mid", "Call Ask", "Strike", "Put Bid", "Put Mid", "Put Ask"];
    headers.forEach(text => {
        const th = document.createElement("th");
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
        /*
                values.forEach(val => {
                    const td = document.createElement("td");
                    td.textContent = val.toFixed(2);
                    tr.appendChild(td);
                });
        */

        values.forEach((val, j) => {
            const td = document.createElement("td");
            td.textContent = val.toFixed(2);


            td.addEventListener("mouseover", () => {
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
                td.style.backgroundColor = "";
                hoverLabel.style.display = "none";
            });


            // Call Mid is at index 1, Put Mid is at index 5
            if (j === 0 || j === 2 || j === 4 || j === 6) {
                td.style.cursor = "pointer";

                td.addEventListener("click", () => {
                    const type = (j === 0 || j === 2) ? "call" : "put";
                    const leg = {
                        strike: row.strike,
                        type,
                        value: val,
                        qty: (j === 0 || j === 4) ? -1 : 1
                    }
                    selectedCells.push(leg);

                    // Optional highlight
                    td.style.backgroundColor = "#555";

                    // Add row to selected table
                    const tr = document.createElement("tr");

                    ["type", "strike", "value"].forEach(key => {
                        const td = document.createElement("td");
                        td.textContent = key === "type" ? type.toUpperCase() :
                            key === "strike" ? row.strike :
                                val.toFixed(2);
                        td.style.textAlign = "center";
                        tr.appendChild(td);
                    });

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



                    selectedTableBody.appendChild(tr);


                    td.style.backgroundColor = "#555"; // Optional visual feedback
                    console.log("Selected:", selectedCells);

                    const li = document.createElement("li");
                    li.textContent = `${type.toUpperCase()} @ ${row.strike} → ${val.toFixed(2)}`;
                    selectedList.appendChild(li);


                });
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