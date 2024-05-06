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

function getAllDatesFromRange(startDate, targetDateInclusive) {
    const start = new Date(new Date(startDate).setUTCHours(0, 0, 0, 0))
    const end = new Date(new Date(targetDateInclusive).setUTCHours(0, 0, 0, 0))

    const date = new Date(start.getTime())

    const dates = []

    while (date <= end) {
        dates.push(new Date(date))
        date.setDate(date.getDate() + 1)
    }

    return dates
}

module.exports = { getLowestPrice }