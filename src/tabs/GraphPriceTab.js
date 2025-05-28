
import { useRef, useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { cookie_manager } from '../utils/cookie';
import * as constants from "../utils/consts.js";

import {
    Chart as ChartJS,
    LineElement,
    CategoryScale,
    LinearScale,
    PointElement,
    Tooltip,
    Legend,
} from 'chart.js';
import { load_local_history } from '../utils/network.js';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

const customCrosshairPlugin = {
    id: 'customCrosshair',
    afterEvent(chart, args) {
        const { event } = args;
        chart._mouseX = event?.x;
        chart._mouseY = event?.y;
    },
    afterDraw(chart) {
        const { ctx, chartArea: { top, bottom, left, right } } = chart;
        const x = chart._mouseX;
        const y = chart._mouseY;

        if (!x || !y || x < left || x > right || y < top || y > bottom) return;

        ctx.save();
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(255, 46, 46, 0.6)';

        // Vertical
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
        ctx.stroke();

        // Horizontal
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
        ctx.stroke();

        ctx.restore();
    }
};
ChartJS.register(customCrosshairPlugin);


const drawSigmaZone = (lastPrice, sigma) => ({
    id: constants.SIGMA_ZONE_PLUGIN_ID,
    beforeDatasetsDraw(chart) {
        const { ctx, scales, data } = chart;
        const { x, y } = scales;
        const labels = data.labels;

        if (!lastPrice || !sigma || labels.length < constants.RIGHT_VOID_NUM_POINTS) return;

        const startX = x.getPixelForValue(labels[labels.length - constants.RIGHT_VOID_NUM_POINTS]);
        const endX = x.getPixelForValue(labels[labels.length - 1]);

        const y1 = y.getPixelForValue(lastPrice + sigma);
        const y2 = y.getPixelForValue(lastPrice - sigma);
        const yTop = Math.min(y1, y2);
        const yBottom = Math.max(y1, y2);

        ctx.save();
        ctx.fillStyle = 'rgba(0, 205, 251, 0.3)';
        ctx.fillRect(startX, yTop, endX - startX, yBottom - yTop);
        ctx.restore();
    }
});
export default function GraphPriceTab() {
    const [tickers, setTickers] = useState([]);
    const [selectedTicker, setSelectedTicker] = useState('');
    const [priceData, setPriceData] = useState(null);
    const [sigma_yearly, setSigmaYearly] = useState(2);
    const [lastClose, setLastClose] = useState(2);
    const chartPrice = useRef(null);

    useEffect(() => {
        const fetchTickers = async () => {
            try {
                const res = await fetch(constants.TICKERS_LIST);
                const json = await res.json();
                if (json.tickers) {
                    setTickers(json.tickers);

                    // Check for saved ticker in cookie
                    const savedTicker = cookie_manager.get_cookie(constants.LAST_TICKER);

                    if (savedTicker && json.tickers.includes(savedTicker)) {
                        setSelectedTicker(savedTicker);
                        fetchAndDraw(savedTicker);
                    } else if (json.tickers.length > 0) {
                        // Fallback to first ticker
                        const defaultTicker = json.tickers[0];
                        setSelectedTicker(defaultTicker);
                        fetchAndDraw(defaultTicker);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch tickers list", err);
                const defaultTicker = constants.DEFAULT_TICKER;
                setSelectedTicker(defaultTicker);
                fetchAndDraw(defaultTicker);
            }
        };

        fetchTickers();
    }, []);

    useEffect(() => {
        if (!chartPrice.current) return;
        console.log("Sigma yearly updated:", sigma_yearly);
        const chart = chartPrice.current;

        const plugin = drawSigmaZone(lastClose, sigma_yearly);

        const existingIndex = chart.config.plugins.findIndex(p => p.id === constants.SIGMA_ZONE_PLUGIN_ID);
        if (existingIndex !== -1) {
            chart.config.plugins.splice(existingIndex, 1);
        }

        chart.config.plugins.push(plugin);
        chart.update();
    }, [sigma_yearly, chartPrice]);

    const handleSelectChange = async (e) => {
        const ticker = e.target.value;
        setSelectedTicker(ticker);
        await fetchAndDraw(ticker);
    };

    const handleInputChange = (e) => {
        setSelectedTicker(e.target.value.toUpperCase());
    };

    const handleAddTicker = async () => {
        if (selectedTicker && !tickers.includes(selectedTicker)) {
            setTickers([...tickers, selectedTicker]);
        }
        await fetchAndDraw(selectedTicker);
    };

    const fetchAndDraw = async (ticker) => {
        let history = [];
        try {
            const res = await fetch(`${constants.HISTORIC_TICKER_CMD}${ticker}`);
            const json = await res.json();
            history = json.history;

        } catch (err) {
            console.error("Failed to fetch price history from backend", err);

            try {
                console.log("1-Loading local history for", ticker);
                const res = await load_local_history(ticker);
                console.log("2-Loaded local history for", ticker, res);
                history = res.history;
                console.log("3-Price history loaded from local file:", history);
            } catch (err) {
                console.error("Failed to fetch price history from file", err);
            }
        }

        if (history && history.length) {
            const dates = history.map(item => item.date);
            const prices = history.map(item => item.close_price);

            setLastClose(prices[prices.length - 1]);
            //const sigma = 20; // Replace with actual sigma_yearly if available
            const logReturns = [];
            for (let i = 1; i < prices.length; i++) {
                const r = Math.log(prices[i] / prices[i - 1]);
                if (!isNaN(r) && isFinite(r)) {
                    logReturns.push(r);
                }
            }

            const sma20 = Array(prices.length).fill(null); // initialise avec null pour aligner les index
            for (let i = 19; i < prices.length; i++) {
                const sum = prices.slice(i - 19, i + 1).reduce((a, b) => a + b, 0);
                sma20[i] = sum / 20;
            }


            const closingPrices = prices.slice(-252);
            const mean = closingPrices.reduce((a, b) => a + b, 0) / closingPrices.length;
            const variance = closingPrices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / (closingPrices.length - 1);
            const stddev = Math.sqrt(variance);
            console.log(`Computed stddev for ${ticker}:`, stddev);
            const sigma = stddev * Math.sqrt(252); // Annualize the standard deviation
            setSigmaYearly(stddev);

            const lastDate = new Date(dates[dates.length - 1]);
            for (let i = 1; i <= constants.RIGHT_VOID_NUM_POINTS; i++) {
                const nextDate = new Date(lastDate);
                nextDate.setDate(lastDate.getDate() + i);
                const formatted = nextDate.toISOString().split('T')[0];
                dates.push(formatted);
                prices.push(null);
            }

            setPriceData({
                labels: dates,
                datasets: [{
                    label: `${ticker} Price`,
                    data: prices,
                    fill: false,
                    borderColor: 'lightblue',
                    tension: 0,
                    animation: false,

                },
                {
                    label: 'SMA 20',
                    data: sma20,
                    fill: false,
                    borderColor: 'orange',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0,
                    animation: false,
                },


                ],
                options: {
                    responsive: true,
                    //maintainAspectRatio: false,
                    //animation: false,
                    interaction: {
                        mode: 'nearest',
                        intersect: false
                    },
                    plugins: {
                        tooltip: {
                            enabled: true
                        }
                    }
                }


            });

            cookie_manager.set_cookie(constants.LAST_TICKER, ticker, 365);
        }
    };
    return (
        <div className="p-4 space-y-4">
            <div className="space-x-2">
                <label className="font-medium">Select ticker:</label>
                <select
                    className="border p-2 rounded"
                    onChange={handleSelectChange}
                    value=""
                >
                    <option value="" disabled>Select from list</option>
                    {tickers.map((ticker) => (
                        <option key={ticker} value={ticker}>
                            {ticker}
                        </option>
                    ))}
                </select>
            </div>

            <div className="space-x-2">
                <input
                    type="text"
                    placeholder="Enter new ticker"
                    value={selectedTicker}
                    onChange={handleInputChange}
                    className="border p-2 rounded"
                />
                <button
                    onClick={handleAddTicker}
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                    Add & Draw
                </button>
            </div>

            <div className="mt-8">
                {priceData ? (
                    <Line
                        ref={chartPrice}
                        data={priceData}
                        options={priceData.options}
                    />
                ) : (
                    <p className="text-gray-500">No data yet. Select a ticker.</p>
                )}
            </div>
        </div>
    );
}
