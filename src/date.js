export class DateManager {

    constructor(date_string) {
        if (date_string) {
            this.year = parseInt(date_string.substring(0, 4), 10);
            this.month = parseInt(date_string.substring(4, 6), 10) - 1; // Months are 0-indexed
            this.day = parseInt(date_string.substring(6, 8), 10);
            this.date = new Date(this.year, this.month, this.day);
            this.utc_5 = new Date(Date.UTC(this.year, this.month, this.day, 21, 30)); // 16:30 UTC-5 = 21:30 UTC
        } else {
            this.date = new Date();
        }
    }

    remaining_days() {

        const now = new Date();    
        const diffMs = this.utc_5 - now;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return Math.round(diffDays * 10) / 10;
    }
    
    days_between_dates(other_date) {
        const other_date_obj = new Date(other_date);
        const diffTime = Math.abs(other_date_obj - this.date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    is_third_friday() {
        if (this.date.getDay() !== 5) return false; // Not a Friday
    
        // Find the first Friday of the month
        const firstDay = new Date(this.year, this.month, 1);
        const firstFridayOffset = (5 - firstDay.getDay() + 7) % 7;
        const thirdFridayDate = 1 + firstFridayOffset + 14;
    
        return this.day === thirdFridayDate;
    }
}