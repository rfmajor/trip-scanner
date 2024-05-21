import { getAvailabilityData, getOneWayCheapestFaresData } from './scraper.cjs';
import fs from 'fs'
import logger from './log.cjs';
import { createProxies, deleteProxies } from './gateways.cjs'
import { createAvailabilityRequests, createOneWayCheapestFaresRequests, getLowestPrice } from './requestMapper.cjs';


if (true) {
    try {
        const codesToAirports = JSON.parse(fs.readFileSync('./cities_noMac.json', 'utf8'))

        const krk = codesToAirports['KRK']
        const destinations = [codesToAirports['BER'], codesToAirports['VIE'], codesToAirports['BCN']]
    
        await createProxies()
    
        // const requests = createAvailabilityRequests([krk], destinations, "2024-06-20", 84)
        const requests = createOneWayCheapestFaresRequests([krk], destinations, "2024-06-20", "2024-12-02", "PLN")

        logger.info(`Going to send ${requests.length} requests`)
    
        const responses = await getOneWayCheapestFaresData(requests)
        responses.forEach(element => {
            console.log(JSON.stringify(element, null, 2))
        })
        fs.writeFileSync('./output.json', JSON.stringify(responses, null, 3))

        await deleteProxies()
    } catch (error) {
        console.log(`Error occurred:\n${error}\nStacktrace:${error.stack}`)
        await deleteProxies()
    } 
}
