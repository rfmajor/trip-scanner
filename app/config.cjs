var config = {} 

config.availability = {}
config.cheapestFares = {}

config.availability.url = "/api/booking/v4/pl-pl/availability"
config.availability.cookieUrl = '/pl/pl/trip/flights/select'
config.availability.maxRequests = 35
config.availability.requestData = {
    "headers": {
        "accept": "application/json, text/plain, */*",
        "accept-language": "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7",
        "authority": "www.ryanair.com"
    },
    "body": null,
    "method": "GET"
}
config.availability.requestPayload = (origin, destination, originIsMac, destinationIsMac, dateOut) => ({
    "ADT": "1",
    "TEEN": "0",
    "CHD": "0",
    "INF" : "0",
    "Origin": origin,
    "OriginIsMac": originIsMac,
    "DateOut": dateOut,
    "promoCode": "",
    "IncludeConnectingFlights": "false",
    "DateIn": "",
    "FlexDaysBeforeOut": "3",
    "FlexDaysOut": "3",
    "FlexDaysBeforeIn": "3",
    "FlexDaysIn": "3",
    "RoundTrip": "false",
    "ToUs": "AGREED",
    "Destination": destination,
    "DestinationIsMac": destinationIsMac
})

config.cheapestFares.url = (origin, destination) => `/api/farfnd/v4/oneWayFares/${origin}/${destination}/cheapestPerDay`
config.cheapestFares.requestData = {
    "body": null,
    "method": "GET"
}
config.cheapestFares.requestPayload = (origin, destination, dateOut, currency) => ({
    "Origin": origin,
    "Destination": destination,
    "outboundMonthOfDate": dateOut,
    "currency": currency
})

config.awsRegions = [
    "eu-north-1",
    "eu-central-1",
    "eu-west-1",
    "eu-west-2",
    "eu-west-3"
]


module.exports = config