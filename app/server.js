import { getAvailabilityData } from './crawler.cjs';
import fs from 'fs'
import logger from './log.cjs';
import { createProxies, deleteProxies } from './gateways.cjs'
import { createAvailabilityRequests, getLowestPrice } from './requestMapper.cjs';


if (true) {
    try {
        const codesToAirports = JSON.parse(fs.readFileSync('./cities_small.json', 'utf8'))

        const krk = codesToAirports['KRK']
        const destinations = [codesToAirports['MIL'], codesToAirports['BAR'], codesToAirports['BER'], codesToAirports['PAR'], codesToAirports['ROM']]
    
        await createProxies()
    
        const requests = createAvailabilityRequests([krk], destinations, "2024-05-20", 28)
    
        await getAvailabilityData(requests).then(element => {
            console.log(JSON.stringify(element, null, 2))
        })

        await deleteProxies()
    } catch (error) {
        console.log(`Error occurred:\n${error}\nStacktrace:${error.stack}`)
        await deleteProxies()
    } 
}
