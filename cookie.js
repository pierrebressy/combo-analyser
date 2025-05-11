class CookieManager {

    constructor() {
        this.cookies = {};
    }

    set_cookie(name, value, days) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/";
    }

    get_cookie(name) {
        const cookies = document.cookie.split("; ");
        for (let i = 0; i < cookies.length; i++) {
            const [cookieName, cookieValue] = cookies[i].split("=");
            if (cookieName === name) {
                return decodeURIComponent(cookieValue);
            }
        }
        return null;
    }

    delete_cookie(name) {
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }

    save_JSON_in_cookie(cookieName, jsonObject, daysToExpire = 7) {
        const jsonString = JSON.stringify(jsonObject);
        const encoded = encodeURIComponent(jsonString);
        const expiryDate = new Date();
        expiryDate.setTime(expiryDate.getTime() + (daysToExpire * 24 * 60 * 60 * 1000));
        document.cookie = `${cookieName}=${encoded}; expires=${expiryDate.toUTCString()}; path=/`;
    }

    load_JSON_from_cookie(cookieName) {
        const nameEQ = cookieName + "=";
        const cookies = document.cookie.split(';');
        for (let c of cookies) {
            c = c.trim();
            if (c.indexOf(nameEQ) === 0) {
                const encoded = c.substring(nameEQ.length);
                try {
                    return JSON.parse(decodeURIComponent(encoded));
                } catch (e) {
                    console.error("Failed to parse cookie JSON:", e);
                    return null;
                }
            }
        }
        return null;
    }


}

// main global cookie manager instance
export const cookie_manager = new CookieManager();