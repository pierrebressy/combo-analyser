export function create_greeks_chart_dataset(dataManager, greek_index) {
    if (!dataManager) return null;

    const chartGreek = {

        datasets: [
            {
                label: 'y vs x',
                data: dataManager.get_greeks_data()[greek_index],
                borderColor: 'green',
                fill: false,
                tension: 0.1,
                pointRadius: 0,
            },

        ]
    };

    return chartGreek;
}
