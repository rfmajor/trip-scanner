const { refreshCookies, parseCookies } = require('./cookies.cjs')
const config = require('./config.cjs')

const testUrl = 'https://www.ryanair.com/api/farfnd/v4/oneWayFares/KRK/BCN/cheapestPerDay?outboundMonthOfDate=2024-08-01&currency=PLN'
let lastBackoff = new Date()
let requestCounter = 0
let backoff = false
let backoffTimeMinutes = 95


async function testRateLimit() {
    let cookies = await refreshCookies().then(parseCookies);
    let requestData = {...config.requestData}
    requestData['headers']['cookie'] = cookies

    let requestRatePerSecond = 0.1

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
                console.log(`${new Date().toJSON()}: Request count: ${requestsSinceLastBackoff}`)
            } else {
                await onBackoff()
            }
            await new Promise(resolve => setTimeout(resolve, 1000 / requestRatePerSecond))
        }
    }
}

async function testRateLimit_cheapestFares() {
    const requestData = {...config.cheapestFares.requestData}

    let requestRatePerSecond = 1000

    let requestsSinceLastBackoff = 0

    const onBackoff = async function () {
        console.log(`${new Date().toJSON()}: Backoff[${backoffTimeMinutes}m] activated after ${requestsSinceLastBackoff} successful responses received with request rate ${requestRatePerSecond} rpm`)
        requestsSinceLastBackoff = 0
        waitingForBackoff = true
        backoffTimeMinutes += 10
        
        await new Promise(resolve => setTimeout(resolve, backoffTimeMinutes * 60 * 1000))
    }

   /*  while (true) {
        waitingForBackoff = false
        while (!waitingForBackoff) {
            const response = await fetch(testUrl, requestData)
            if (response.status === 200) {
                requestsSinceLastBackoff += 1
                console.log(`${new Date().toJSON()}: Request count: ${requestsSinceLastBackoff}`)
            } else {
                await onBackoff()
            }
            await new Promise(resolve => setTimeout(resolve, 1000 / requestRatePerSecond))
        }
    } */

    while (true) {
        waitingForBackoff = false
        while (!waitingForBackoff) {
            fetch(testUrl, requestData).then(response => {
                if (response.status === 200) {
                    requestsSinceLastBackoff += 1
                    console.log(`${new Date().toJSON()}: Request count: ${requestsSinceLastBackoff}`)
                } else {
                    console.log(requestCounter)
                }
            })
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



module.exports = { testRateLimit, testRateLimit_cheapestFares }
