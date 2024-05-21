const { refreshCookies } = require('./cookies.cjs')
const logger = require('./log.cjs')
const config = require('./config.cjs')
const { fetchUsingProxies } = require('./proxyBalancer.cjs')

async function getOneWayCheapestFaresData(requests) {
    return fetchUsingProxies(
        requests,
        async (proxyUrl, request) => addRequestParameters(proxyUrl + config.cheapestFares.url(request['Origin'], request['Destination']), getDictWithKeys(request, ["outboundMonthOfDate", "currency"])),
        async proxy => ({ ...config.cheapestFares.requestData }),
        async response => {
            if (response) {
                const body = await response.json()
                return getTripsFromOneWayFaresResponse(body)
            } else {
                return {}
            }
        }
    )
}

async function getAvailabilityData(availabilityRequests) {
    return fetchUsingProxies(
        availabilityRequests,
        async (proxyUrl, request) => addRequestParameters(proxyUrl + config.availability.url, request),
        async proxy => {
            const cookieUrl = proxy['url'] + config.availability.cookieUrl
            const requestData = { ...config.availability.requestData }
            requestData['headers']['cookie'] = await refreshCookies(cookieUrl)
            return requestData
        },
        async response => {
            const body = await response.json()
            return getTripsFromAvailabilityResponse(body)
        }
    )
}

function getDictWithKeys(originalDict, keys) {
    const newDict = {}

    for (let key of keys) {
        if (originalDict.hasOwnProperty(key)) {
            newDict[key] = originalDict[key]
        }
    }
    
    return newDict
}

function addRequestParameters(baseUrl, requestBody, keyFilter) {
    let url = baseUrl + "?"
    for (const [key, value] of Object.entries(requestBody)) {
        if (keyFilter) {
            if (keyFilter(key)) {
                url += `${key}=${value}&`
            }
        } else {
            url += `${key}=${value}&`
        }
    }
    
    return url;
}

function getTripsFromAvailabilityResponse(response) {
    try {
        if (!response.hasOwnProperty("trips")) {
            return []
        }
        return Array.from(response["trips"])
            .flatMap(trip => {
                if (!trip.hasOwnProperty("dates")) {
                    return []
                }
                return Array.from(trip["dates"])
                    .flatMap(date => {
                        if (!date.hasOwnProperty("flights")) {
                            return []
                        }
                        return Array.from(date["flights"])
                            .map(flight => {
                                if (!flight.hasOwnProperty("regularFare") || !flight["regularFare"].hasOwnProperty("fares") || flight["regularFare"]["fares"].length === 0) {
                                    return {}
                                }
                                if (!flight.hasOwnProperty("segments") || flight["segments"].length === 0) {
                                    return {}
                                } 
                                if (!flight.hasOwnProperty("timeUTC") || flight["timeUTC"].length < 2) {
                                    return {}
                                }
                                return {
                                    "originName": trip["originName"],
                                    "destinationName": trip["destinationName"],
                                    "currency": response["currency"],
                                    "faresLeft": flight["faresLeft"],
                                    "type": flight["regularFare"]["fares"][0]["type"],
                                    "price": flight["regularFare"]["fares"][0]["amount"],
                                    "hasDiscount": flight["regularFare"]["fares"][0]["hasDiscount"],
                                    "originalPrice": flight["regularFare"]["fares"][0]["publishedFare"],
                                    "flightNumber": flight["flightNumber"],
                                    "origin": flight["segments"][0]["origin"],
                                    "destination": flight["segments"][0]["destination"],
                                    "departureTimeUTC": flight["timeUTC"][0],
                                    "arrivalTimeUTC": flight["timeUTC"][1],
                                    "duration": flight["duration"]
                                }
                            })
                    })
            })
    } catch (error) {
        console.log(`Cannot parse response: ${JSON.stringify(response, null, 2)}, error: ${error}`)
        return []
    }
}

function getTripsFromOneWayFaresResponse(response) {
    try {
        if (!response.hasOwnProperty("outbound") || !response["outbound"].hasOwnProperty("fares")) {
            return []
        }
        return Array.from(response["outbound"]["fares"])
            .map(fare => {
                if (!fare.hasOwnProperty("price")) {
                    return {}
                }
                return {
                    "departureDate": fare["departureDate"],
                    "arrivalDate": fare["arrivalDate"],
                    "price": fare["price"]["value"],
                    "currency": fare["price"]["currencyCode"],
                    "soldOut": fare["soldOut"],
                    "unavailable": fare["unavailable"]
                }
            })
    } catch (error) {
        console.log(`Cannot parse response: ${JSON.stringify(response, null, 2)}, error: ${error}`)
        return []
    }
}

module.exports = { getAvailabilityData, getOneWayCheapestFaresData }