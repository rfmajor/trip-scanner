const { refreshCookies, parseCookies } = require('./cookies.cjs')
const { readFileSync } = require('fs')

const testUrl = 'https://www.ryanair.com/api/booking/v4/pl-pl/availability?ADT=2&TEEN=0&CHD=0&INF=0&Origin=KRK&DateOut=2024-05-10&promoCode=&IncludeConnectingFlights=false&DateIn=&FlexDaysBeforeOut=2&FlexDaysOut=2&FlexDaysBeforeIn=2&FlexDaysIn=2&RoundTrip=false&ToUs=AGREED&Destination=AGA&DestinationIsMac=false&'
let lastBackoff = new Date()
let requestCounter = 0
let backoff = false
let backoffTimeMinutes = 95


async function testRateLimit() {
    let cookies = await refreshCookies().then(parseCookies);
    let requestData = JSON.parse(readFileSync('./config.json', 'utf8'))['getRequestData']
    requestData['headers']['cookie'] = cookies

    let requestRatePerSecond = 1

    let requestsSinceLastBackoff = 0

    const onBackoff = async function () {
        console.log(`${new Date().toJSON()}: Backoff[${backoffTimeMinutes}m] activated after ${requestsSinceLastBackoff} successful responses received with request rate ${requestRatePerSecond} rpm`)
        requestsSinceLastBackoff = 0
        waitingForBackoff = true
        backoffTimeMinutes += 10
        
        await new Promise(resolve => setTimeout(resolve, backoffTimeMinutes * 60 * 1000))
    }

    while (true) {
        requestData['headers']['cookie'] = await refreshCookies().then(parseCookies)
        waitingForBackoff = false
        while (!waitingForBackoff) {
            const response = await fetch(testUrl, requestData)
            if (response.status === 200) {
                requestsSinceLastBackoff += 1
            } else {
                await onBackoff()
            }
            await new Promise(resolve => setTimeout(resolve, 1000 / requestRatePerSecond))
        }
    }
}


async function testFunction() {
    return new Promise(resolve => {
        const timeSinceLastBackoff = new Date() - lastBackoff
        if (backoff) {
            if (timeSinceLastBackoff > 35 * 1000) {
                backoff = false
                lastBackoff = new Date()
                requestCounter = 0
                resolve({"status": 200})
            } else {
                resolve({"status": 409})
            }
        } else {
            if (requestCounter > 50) {
                backoff = true
                resolve({"status": 409})
            } else {
                requestCounter++
                resolve({"status": 200})
            }
        }  
    })
}



module.exports = { testRateLimit }
