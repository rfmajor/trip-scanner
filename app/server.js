import { getTripsData } from './crawler.cjs';
import fs from 'fs'
import { testRateLimit } from './testRateLimit.cjs'
import logger from './log.cjs';
import { createProxies, deleteProxies, deleteApiGatewayV2 } from './gateways.cjs'
import { resolve } from 'path';
import { getLowestPrice } from './scanner.cjs';


const trips = JSON.parse(fs.readFileSync('./trips2.json', 'utf8'))

if (trips.length === 0) {
    try {
        const cities = JSON.parse(fs.readFileSync('./cities.json', 'utf8'))
    
        await createProxies()
    
        const request = {
            "ADT": "2",
            "TEEN": "0",
            "CHD": "0",
            "INF" : "0",
            "Origin": "KRK",
            "DateOut": "2024-05-10",
            "promoCode": "",
            "IncludeConnectingFlights": "false",
            "DateIn": "",
            "FlexDaysBeforeOut": "3",
            "FlexDaysOut": "3",
            "FlexDaysBeforeIn": "3",
            "FlexDaysIn": "3",
            "RoundTrip": "false",
            "ToUs": "AGREED",
            "cities": cities
        }
    
        await getTripsData(request).then(element => {
            try {
                fs.writeFileSync('./trips2.json', JSON.stringify(element, null, 2), {
                encoding: "utf8",
                flag: "a+"
            })} catch (error) {
                console.log(`Could not write element to file: ${JSON.stringify(element)}. Error: ${error}`)
                throw error
            }
        })
        .then(() => deleteProxies())
    } catch (error) {
        logger.error('Error occurred: ' + error)
        await deleteProxies()
    } 
}

const lowestPriceTrips = getLowestPrice(trips, 10)
console.log(lowestPriceTrips)




/* const apis = JSON.parse(fs.readFileSync('./openAPIs.json', 'utf8'))
for (const api of apis.flat()) {
    await deleteApiGatewayV2(api['region'], api['restApiId']).catch(err => {
        if (err) {
            console.log(err)
            console.log(api)
        }
    })
    await new Promise(resolve => setTimeout(resolve, 20000))
}
 */