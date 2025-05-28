export function findZeroCrossings(data) {
    const zeros = [];
    for (let i = 1; i < data.length; i++) {
        const prev = data[i - 1].y;
        const curr = data[i].y;
        if ((prev < 0 && curr >= 0) || (prev > 0 && curr <= 0)) {
            const x0 = data[i - 1].x;
            const x1 = data[i].x;
            const y0 = prev;
            const y1 = curr;
            const xZero = x0 - y0 * (x1 - x0) / (y1 - y0);
            zeros.push(xZero);
        }
    }
    return zeros;
}