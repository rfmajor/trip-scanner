import { getAvailabilityData, getOneWayCheapestFaresData } from './scraper.cjs';
import fs from 'fs'
import logger from './log.cjs';
import { createProxies, deleteProxies } from './gateways.cjs'
import { createAvailabilityRequests, createOneWayCheapestFaresRequests, getLowestPrice } from './requestMapper.cjs';


if (true) {
    try {
        const codesToAirports = JSON.parse(fs.readFileSync('./cities_small.json', 'utf8'))

        const krk = codesToAirports['KRK']
        const destinations = [codesToAirports['BER'], codesToAirports['VIE']]
    
        await createProxies()
    
        const requests = createOneWayCheapestFaresRequests([krk], destinations, "2024-06-20", "2024-12-01", "PLN")
    
        const responses = await getOneWayCheapestFaresData(requests)
        responses.forEach(element => {
            console.log(JSON.stringify(element, null, 2))
        })

        await deleteProxies()
    } catch (error) {
        console.log(`Error occurred:\n${error}\nStacktrace:${error.stack}`)
        await deleteProxies()
    } 
}
