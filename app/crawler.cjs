const { refreshCookiesV2 } = require('./cookies.cjs')
const { readFileSync } = require('fs')
const logger = require('./log.cjs')
const { MAX_REQUESTS_PER_PROXY, proxies } = require('./gateways.cjs')

const baseUrl = "https://www.ryanair.com/api/booking/v4/pl-pl/availability"
const AVAILABILITY_URL = "/api/booking/v4/pl-pl/availability"
// const COOKIE_DEFAULT_URL = 'https://www.ryanair.com/pl/pl/trip/flights/select'
const COOKIE_URL = '/pl/pl/trip/flights/select'

async function getTripsData(tripsRequest) {
    // const cookies = await refreshCookiesV2(COOKIE_DEFAULT_URL)
    const requestData = JSON.parse(readFileSync('./config.json', 'utf8'))['getRequestData']
    //requestData['headers']['cookie'] = cookies

    const partialRequests = Array.from(tripsRequest['cities']).map(city => {
        const partialRequest = {}
        for (const [key, value] of Object.entries(tripsRequest)) {
            if (key === 'cities') {
                continue
            }
            partialRequest[key] = value
        }
        const isMacCity = city.hasOwnProperty('macCityCode')
        const cityCode = isMacCity ? city["macCityCode"] : city['airportCode']

        partialRequest['Destination'] = cityCode
        partialRequest['DestinationIsMac'] = isMacCity

        return partialRequest
    })

    return fetchCitiesUsingProxies(partialRequests, requestData).then(responses => responses.flat().map(getTripsFromResponse).flat())
    /* return Promise.all(
        partialRequests.map(partialRequest => fetchOneCity(partialRequest, requestData))
    ).then(responses => responses.map(getTripsFromResponse).flat()) */
}

async function fetchOneCity(cityRequest, requestData) {
    const url = addRequestParameters(baseUrl, cityRequest);
    return fetch(url, requestData).then(function (response) {
        return response.json();
    })
}

async function fetchCitiesUsingProxies(cityRequests, requestCommonData) {
    const regions = Object.keys(proxies)
    const maxRequests = regions.length * MAX_REQUESTS_PER_PROXY
    if (cityRequests.length > maxRequests) {
        const skipped = cityRequests.length - maxRequests
        logger.warn(`Too many requests submitted, skipping ${skipped} requests`)
        cityRequests = cityRequests.slice(0, maxRequests)
    }

    const requestsPerProxy = Math.floor(cityRequests.length / regions.length)
    const leftoverRequests = cityRequests.length - requestsPerProxy * regions.length
    const requestDistribution = Array(leftoverRequests).fill(requestsPerProxy + 1).concat(Array(regions.length - leftoverRequests).fill(requestsPerProxy)) 
    const splitCityRequests = []

    let startIndex = 0
    let endIndex = 0
    for (let i = 0; i < regions.length; i++) {
        endIndex += requestDistribution[i]
        splitCityRequests.push(cityRequests.slice(startIndex, endIndex))
        startIndex += requestDistribution[i]
    }

    const fetchCitiesForProxy = async (cityRequests, proxy) => {
        const cookieUrl = proxy['url'] + COOKIE_URL
        const requestData = {...requestCommonData}
        requestData['headers']['cookie'] = await refreshCookiesV2(cookieUrl)

        const endpointUrl = proxy['url'] + AVAILABILITY_URL

        return Promise.all(
            cityRequests.map(request => {
                const url = addRequestParameters(endpointUrl, request)
                return new Promise(async (resolve, reject) => {
                    await fetch(url, requestData).then(async response => {
                        if (response.status !== 200) {
                            reject()
                        } else {
                            const json = await response.json()
                            resolve(json)
                        }
                    })
                })
            })
        )
    }

    return Promise.all(
        splitCityRequests.map((cityRequests, index) =>
            fetchCitiesForProxy(cityRequests, proxies[regions[index]])
        ).flat()
    )
}

function addRequestParameters(baseUrl, requestData) {
    let url = baseUrl + "?"
    for (const [key, value] of Object.entries(requestData)) {
        url += `${key}=${value}&`
    }
    
    return url;
}

function getTripsFromResponse(response) {
    try {
        return Array.from(response["trips"])
            .flatMap(trip =>
                Array.from(trip["dates"])
                    .flatMap(date =>
                        Array.from(date["flights"])
                            .map(flight => ({
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
                            }))
                    )
            )
    } catch (error) {
        logger.error(`Cannot parse response: ${JSON.stringify(response)}, error: ${error}`)
        return []
    }
}

module.exports = { getTripsData }