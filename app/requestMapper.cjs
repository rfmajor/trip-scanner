const config = require('./config.cjs')

function getLowestPrice(trips, limit) {
    return trips.sort((a, b) => {
        if (a['price'] < b['price']) {
            return -1
        } 
        if (a['price'] > b['price']) {
            return 1
        } 
        return 0
    })
    .filter(trip => trip['faresLeft'] > 0)
    .slice(0, limit)
}

function getAllDaysFromRange(startDate, plusDays, step, parse) {
    const start = new Date(new Date(startDate).setUTCHours(0, 0, 0, 0))
    const end = new Date(new Date(startDate).setUTCHours(0, 0, 0, 0))
    end.setDate(end.getDate() + plusDays)

    const date = new Date(start.getTime())

    const dates = []

    while (date <= end) {
        dates.push(parse(new Date(date)))
        date.setDate(date.getDate() + step)
    }

    return dates
}

function getAllMonthsFromRange(startDate, endDate, parse) {
    const start = new Date(new Date(startDate).setDate(2))
    const end = new Date(new Date(endDate).setDate(27))
    
    let date = new Date(start.getTime())
    const dates = []

    while (date <= end) {
        dates.push(parse(new Date(date)))
        date.setMonth(date.getMonth() + 1)
    }

    return dates
}

// should create ${origins * destinations * (plusDays / 7 + 1) * 2} requests
function createAvailabilityRequests(origins, destinations, startDate, plusDays) {
    const requests = []

    const dates = getAllDaysFromRange(startDate, plusDays, 7, date => date.toISOString().split('T')[0])
    for (const [origin, destination, date] of cartesian(origins, destinations, dates)) {
        const generatePayload = (origin, destination) => {
            const isOriginCityMac = origin['city']['isMac']
            const originCode = origin['code']

            const isDestinationCityMac = destination['city']['isMac']
            const destinationCode = destination['code']

            return config.availability.requestPayload(originCode, destinationCode, isOriginCityMac, isDestinationCityMac, date)
        }

        requests.push(generatePayload(origin, destination))
        requests.push(generatePayload(destination, origin))
    }
    return requests
}

function createOneWayCheapestFaresRequests(origins, destinations, startDate, endDate, currency) {
    const requests = []

    const dates = getAllMonthsFromRange(startDate, endDate, parseStartOfMonth)
    for (const [origin, destination, date] of cartesian(origins, destinations, dates)) {
        const generatePayload = (origin, destination) => {
            const originCode = origin['code']
            const destinationCode = destination['code']

            return config.cheapestFares.requestPayload(originCode, destinationCode, date, currency)
        }
        requests.push(generatePayload(origin, destination))
        requests.push(generatePayload(destination, origin))
    }
    return requests
}

function parseStartOfMonth(date) {
    const dateStr = date.toISOString().split('T')[0]
    return dateStr.substring(0, dateStr.length - 1) + "1"
}

function cartesian(...a) {
    return a.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())));
}

module.exports = { getLowestPrice, createAvailabilityRequests, createOneWayCheapestFaresRequests }