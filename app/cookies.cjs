const puppeteer = require('puppeteer');

async function refreshCookies() {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        await page.goto('https://www.ryanair.com/pl/pl/trip/flights/select?adults=1&teens=0&children=0&infants=0&dateOut=2024-05-03&dateIn=&isConnectedFlight=false&discount=0&promoCode=&isReturn=false&originIata=KRK&destinationMac=BAR&tpAdults=1&tpTeens=0&tpChildren=0&tpInfants=0&tpStartDate=2024-05-03&tpEndDate=&tpDiscount=0&tpPromoCode=&tpOriginIata=KRK&tpDestinationMac=BAR');

        await page.setViewport({ width: 1080, height: 1024 });

        await page.waitForSelector('.cookie-popup-with-overlay__box')

        await page.click('.cookie-popup-with-overlay__button-settings')

        const cookies = await page.cookies();

        await browser.close();

        return cookies
    } catch (error) {
        console.log("Error while saving cookies: " + error)
        return []
    } 
}

function parseCookies(cookies) {
    let cookieString = ""
    cookies.forEach(cookie => {
        cookieString += `${cookie['name']}=${cookie['value']}; `
    });
    return cookieString;
}

async function parseCookiesV2(cookies) {
    let cookieString = ""
    cookies.forEach(cookie => {
        const entry = cookie.split(';')[0]
        cookieString += `${entry}; `
    });
    return cookieString;
}

async function refreshCookiesV2(baseUrl) {
    return fetch(`${baseUrl}?adults=1&teens=0&children=0&infants=0&dateOut=2024-05-03&dateIn=&isConnectedFlight=false&discount=0&promoCode=&isReturn=false&originIata=KRK&destinationMac=BAR&tpAdults=1&tpTeens=0&tpChildren=0&tpInfants=0&tpStartDate=2024-05-03&tpEndDate=&tpDiscount=0&tpPromoCode=&tpOriginIata=KRK&tpDestinationMac=BAR`)
        .then(response => {
            const cookies = response.headers.getSetCookie()
            return parseCookiesV2(cookies)
        })
}

module.exports = { refreshCookies, refreshCookiesV2, parseCookies };


// var task = cron.schedule('*/30 * * * * *', () => {
//     console.log('running a task every 30 seconds');
//     getCookies();
// });
