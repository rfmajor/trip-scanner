const { refreshCookies } = require('./cookies.cjs')
const logger = require('./log.cjs')
const { proxies } = require('./gateways.cjs')
const config = require('./config.cjs')
const { fetchUsingProxies } = require('./proxyBalancer.cjs')

async function getOneWayCheapestFaresData(requests) {
    return fetchUsingProxies(
        requests,
        (proxyUrl, request) => addRequestParameters(proxyUrl + config.oneWayCheapestFaresUrl(request['Origin'], request['Destination']), getDictWithKeys(request, ["outboundMonthOfDate, currency"])),
        async proxy => ({ ...config.oneWayCheapestFaresRequestData }),
        async response => {
            const body = await response.json()
            return getTripsFromResponse(body)
        }
    )
}

async function getAvailabilityData(availabilityRequests) {
    return fetchUsingProxies(
        availabilityRequests,
        async (proxyUrl, request) => addRequestParameters(proxyUrl + config.availabilityUrl, request),
        async proxy => {
            const cookieUrl = proxy['url'] + config.cookieUrl
            const requestData = { ...config.availabilityRequestData }
            requestData['headers']['cookie'] = await refreshCookies(cookieUrl)
            return requestData
        },
        async response => {
            const body = await response.json()
            return getTripsFromResponse(body)
        }
    )
    /* const requestData = {...config.availabilityRequestData}

    const partialRequests = Array.from(availabilityRequest['cities']).map(city => {
        const partialRequest = {}
        for (const [key, value] of Object.entries(availabilityRequest)) {
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

    return fetchAvailabilitiesUsingProxies(partialRequests, requestData).then(responses => responses.flat().map(getTripsFromResponse).flat()) */
}

async function fetchAvailabilitiesUsingProxies(availabilityRequests, requestCommonData) {
    const regions = Object.keys(proxies)
    const maxRequests = regions.length * config.maxRequestsPerProxy
    if (availabilityRequests.length > maxRequests) {
        const skipped = availabilityRequests.length - maxRequests
        logger.warn(`Too many requests submitted, skipping ${skipped} requests`)
        availabilityRequests = availabilityRequests.slice(0, maxRequests)
    }

    const splitAvailabilityRequests = distributeItemsEvenly(availabilityRequests, regions.length)

    const fetchAvailabilitiesForProxy = async (availabilityRequests, proxy) => {
        const cookieUrl = proxy['url'] + config.cookieUrl
        const requestData = {...requestCommonData}
        requestData['headers']['cookie'] = await refreshCookies(cookieUrl)

        const endpointUrl = proxy['url'] + config.availabilityUrl

        return Promise.all(
            availabilityRequests.map(request => {
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
        splitAvailabilityRequests.map((requests, index) =>
            fetchAvailabilitiesForProxy(requests, proxies[regions[index]])
        ).flat()
    )
}

async function fetchOneWayCheapestFaresUsingProxies(oneWayCheapestFaresRequests, requestCommonData) {
    const regions = Object.keys(proxies)
    const maxRequests = regions.length * config.maxRequestsPerProxy
    if (oneWayCheapestFaresRequests.length > maxRequests) {
        const skipped = oneWayCheapestFaresRequests.length - maxRequests
        logger.warn(`Too many requests submitted, skipping ${skipped} requests`)
        oneWayCheapestFaresRequests = oneWayCheapestFaresRequests.slice(0, maxRequests)
    }

    const splitRequests = distributeItemsEvenly(oneWayCheapestFaresRequests, regions.length)

    const fetchOneWayFaresForProxy = async (requests, proxy) => {
        const requestData = {...requestCommonData}

        const endpointUrl = (origin, destination) => proxy['url'] + config.oneWayCheapestFaresUrl(origin, destination)

        return Promise.all(
            requests.map(request => {
                const url = addRequestParameters(endpointUrl(request["Origin"], request["Destination"]), {"outboundMonthOfDate": request["Date"]})
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
}

function getDictWithKeys(originalDict, keys) {
    const newDict = {}

    for (const key of keys) {
        if (originalDict.hasOwnProperty(key)) {
            newDict[key] = originalDict[key]
        }
    }
    
    return newDict
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

function getTripsFromResponse(response) {
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
                                    return []
                                }
                                if (!flight.hasOwnProperty("segments") || flight["segments"].length === 0) {
                                    return []
                                } 
                                if (!flight.hasOwnProperty("timeUTC") || flight["timeUTC"].length < 2) {
                                    return []
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

module.exports = { getAvailabilityData }