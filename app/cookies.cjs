async function parseCookies(cookies) {
    let cookieString = ""
    cookies.forEach(cookie => {
        const entry = cookie.split(';')[0]
        cookieString += `${entry}; `
    });
    return cookieString;
}

async function refreshCookies(baseUrl) {
    return fetch(`${baseUrl}?adults=1&teens=0&children=0&infants=0&dateOut=2024-05-03&dateIn=&isConnectedFlight=false&discount=0&promoCode=&isReturn=false&originIata=KRK&destinationMac=BAR&tpAdults=1&tpTeens=0&tpChildren=0&tpInfants=0&tpStartDate=2024-05-03&tpEndDate=&tpDiscount=0&tpPromoCode=&tpOriginIata=KRK&tpDestinationMac=BAR`)
        .then(response => {
            const cookies = response.headers.getSetCookie()
            return parseCookies(cookies)
        })
}

module.exports = { refreshCookies };