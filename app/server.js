import { getCitiesData } from './crawler.cjs';
import fs from 'fs'
import { testRateLimit } from './testRateLimit.cjs'

try {
    // const cities = JSON.parse(fs.readFileSync('./cities.json', 'utf8'))

    // const request = {
    //     "ADT": "2",
    //     "TEEN": "0",
    //     "CHD": "0",
    //     "INF" : "0",
    //     "Origin": "KRK",
    //     "DateOut": "2024-05-10",
    //     "promoCode": "",
    //     "IncludeConnectingFlights": "false",
    //     "DateIn": "",
    //     "FlexDaysBeforeOut": "2",
    //     "FlexDaysOut": "2",
    //     "FlexDaysBeforeIn": "2",
    //     "FlexDaysIn": "2",
    //     "RoundTrip": "false",
    //     "ToUs": "AGREED",
    //     "cities": cities
    // }
    // getCitiesData(request).then(element => {
    //     try {
    //         fs.writeFileSync('./trips.json', JSON.stringify(element, null, 2), {
    //         encoding: "utf8",
    //         flag: "a+"
    //     })} catch (error) {
    //         console.log(`Could not write element to file: ${JSON.stringify(element)}. Error: ${error}`)
    //         throw error
    //     }
    // })
    testRateLimit()


} catch (error) {
    console.error("Unknown error occurred: " + error)
}


