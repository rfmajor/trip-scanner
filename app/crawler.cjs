const { refreshCookies } = require('./cookies.cjs')
const { readFileSync } = require('fs')
const logger = require('./log.cjs')
const { MAX_REQUESTS_PER_PROXY, proxies } = require('./gateways.cjs')

const AVAILABILITY_URL = "/api/booking/v4/pl-pl/availability"
const COOKIE_URL = '/pl/pl/trip/flights/select'

async function getTripsData(tripsRequest) {
    const requestData = JSON.parse(readFileSync('./config.json', 'utf8'))['getRequestData']

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
}

async function fetchCitiesUsingProxies(cityRequests, requestCommonData) {
    const regions = Object.keys(proxies)
    const maxRequests = regions.length * MAX_REQUESTS_PER_PROXY
    if (cityRequests.length > maxRequests) {
        const skipped = cityRequests.length - maxRequests
        logger.warn(`Too many requests submitted, skipping ${skipped} requests`)
        cityRequests = cityRequests.slice(0, maxRequests)
    }

    const splitCityRequests = distributeItemsEvenly(cityRequests, regions.length)

    const fetchCitiesForProxy = async (cityRequests, proxy) => {
        const cookieUrl = proxy['url'] + COOKIE_URL
        const requestData = {...requestCommonData}
        requestData['headers']['cookie'] = await refreshCookies(cookieUrl)

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

function distributeEvenly(number, buckets) {
    const minNumberPerBucket = Math.floor(number / buckets)
    const leftoverBuckets = number % buckets
    const minNumberBuckets = buckets - leftoverBuckets

    return Array(minNumberBuckets).fill(minNumberPerBucket).concat(Array(leftoverBuckets).fill(minNumberPerBucket + 1)) 
}

function splitArrayIntoChunks(array, chunksArray) {
    let sum = 0
    const splitArray = []
    for (let i = 0; i < chunksArray.length; i++) {
        const result = array.slice(sum, sum + chunksArray[i])
        splitArray.push(result)
        sum += chunksArray[i]
    }
    return splitArray
}

function distributeItemsEvenly(items, numberOfBuckets) {
    const itemDistribution = distributeEvenly(items.length, numberOfBuckets)
    return splitArrayIntoChunks(items, itemDistribution)
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