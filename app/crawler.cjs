const { refreshCookies, parseCookies } = require('./cookies.cjs')
const { readFileSync } = require('fs')

const baseUrl = "https://www.ryanair.com/api/booking/v4/pl-pl/availability"

async function getCitiesData(citiesRequest) {
    const cookies = await refreshCookies().then(parseCookies)
    const requestData = JSON.parse(readFileSync('./config.json', 'utf8'))['getRequestData']
    requestData['headers']['cookie'] = cookies

    return Promise.all(
        [citiesRequest].flatMap(request => 
            Array.from(request['cities'])
                .map(city => {
                    const partialRequest = {}
                    for (const [key, value] of Object.entries(request)) {
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
        ).map(partialRequest => fetchOneCity(partialRequest, requestData))
    ).then(responses => responses.map(getTripsFromResponse).flat())
}

async function fetchOneCity(cityRequest, requestData) {
    const url = buildUrl(baseUrl, cityRequest);
    return fetch(url, requestData).then(function (response) {
        return response.json();
    })

}

function buildUrl(baseUrl, requestData) {
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
        console.log(`Cannot parse response: ${JSON.stringify(response)}, error: ${error}`)
        return []
    }
}

module.exports = { getCitiesData }