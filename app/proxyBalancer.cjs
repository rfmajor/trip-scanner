const logger = require('./log.cjs')
const { proxies } = require('./gateways.cjs')
const config = require('./config.cjs')

async function fetchUsingProxies(requests, supplyUrl, supplyRequestCommonData, responseMapper) {
    const regions = Object.keys(proxies)

    const maxRequests = regions.length * config.maxRequestsPerProxy
    if (requests.length > maxRequests) {
        const skipped = requests.length - maxRequests
        logger.warn(`Too many requests submitted, skipping ${skipped} requests`)
        requests = requests.slice(0, maxRequests)
    }

    const requestBatches = distributeRequests(requests, regions.length)

    const batchesPromises = []
    for (let i = 0; i < requestBatches.length; i++) {
        const batch = requestBatches[i]
        const proxy = proxies[regions[i]]
        const proxyBaseUrl = proxy['url']
        const batchPromise = supplyRequestCommonData(proxy)
            .then(requestCommonData => {
                const requestPromises = []
                for (let request of batch) {
                    const requestPromise = supplyUrl(proxyBaseUrl, request)
                        .then(url => {
                            console.log(`Performing fetch to ${url} with requestData: ${JSON.stringify(requestCommonData)}, request: ${JSON.stringify(request)}`)
                            return fetch(url, requestCommonData)
                        })
                        .then(async response => await responseMapper(response))
                    requestPromises.push(requestPromise)
                }
                return Promise.all(requestPromises)
            })
        batchesPromises.push(batchPromise)
    }

    return Promise.all(batchesPromises).then(batches => batches.flat().filter(batch => batch.length > 0))
}

function distributeRequests(requests, numberOfBuckets) {
    const requestsDistribution = divideNumberEvenly(requests.length, numberOfBuckets)
    return splitIntoBatches(requests, requestsDistribution)
}

function splitIntoBatches(requests, distribution) {
    let sum = 0
    const splitArray = []
    for (let i = 0; i < distribution.length; i++) {
        const result = requests.slice(sum, sum + distribution[i])
        splitArray.push(result)
        sum += distribution[i]
    }
    return splitArray
}

function divideNumberEvenly(number, buckets) {
    const minNumberPerBucket = Math.floor(number / buckets)
    const leftoverBuckets = number % buckets
    const minNumberBuckets = buckets - leftoverBuckets

    return Array(minNumberBuckets).fill(minNumberPerBucket).concat(Array(leftoverBuckets).fill(minNumberPerBucket + 1)) 
}

module.exports = { fetchUsingProxies }