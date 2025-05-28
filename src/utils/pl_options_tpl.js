export const createPLOptions = (groupId) => ({
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        layout: {
            padding: {
                left: 0,
                right: 0,
                top: 0,
                bottom: 0
            }
        },
        scales: {
            x: {
                type: 'linear',
                min: 150,
                max: 230,
                title: {
                    display: false,
                    text: 'x'
                },
                grid: {
                    color: '#0000ff'

                },
                ticks: {
                    color: '#00ff00'
                }

            },
            y: {
                title: {
                    display: true,
                    text: 'P/L',
                    color: '#ff0000'
                },
                grid: {
                    color: '#808080'
                },
                ticks: {
                    callback: (value) => {
                        let s1 = (Math.abs(value)).toFixed(0).toString()
                        let z=s1.length;
                        const sign = value < 0 ? '-' : ' ';
                        let s=sign + s1;
                        for (let i = s1.length; i <= 6; i++) {
                            s = ' ' + s;
                        }
                        return s;
                    },
                    color: '#808080',
                    font: {
                        family: 'Menlo',
                        size: 12,
                        weight: 'normal'
                    }
                }
            }
        },
        plugins: {
            legend: {
                display: false // hide "y vs x" box
            },
            tooltip: {
                enabled: false, // disables the tooltip box
                mode: 'index',
                intersect: false
            },

        }
    });
