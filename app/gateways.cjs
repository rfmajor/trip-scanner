const logger = require('./log.cjs')
const { APIGatewayClient, CreateRestApiCommand, CreateResourceCommand, PutMethodCommand, PutIntegrationCommand, CreateDeploymentCommand, DeleteRestApiCommand} = require('@aws-sdk/client-api-gateway')
const { readFile } = require('fs')
const config = require('./config.cjs')

const API_NAME = 'TripScannerAPI'
const STAGE_NAME = 'test'
const PROXY_URL = (restApiId, region, stageName) => `https://${restApiId}.execute-api.${region}.amazonaws.com/${stageName}`

const proxies = {}

async function createProxies() {
    return Promise.all(config.awsRegions.map(createApiGatewayClient))
        .catch(err => logger.error(`Unknown error during API creation:\n`, err))
}

async function deleteProxies() {
    return Promise.all(Object.keys(proxies).map(deleteApiGateway))
        .catch(err => logger.error(`Failure during API deletion:\n`, err))
}

async function createApiGatewayClient(region) {
    return new Promise(async (resolve, reject) => {
        const apig = new APIGatewayClient({ region: region });

        try {
            logger.info(`Creating API in ${region}`)
            const createApiResponse = await apig.send(
                new CreateRestApiCommand({
                    name: API_NAME,
                    endpointConfiguration: { 'types': ['REGIONAL'] },
                })
            )

            const restApiId = createApiResponse['id']
            const rootResourceId = createApiResponse['rootResourceId']

            const createResourceResponse = await apig.send(
                new CreateResourceCommand({
                    restApiId: restApiId,
                    parentId: rootResourceId,
                    pathPart: '{proxy+}'
                })
            )

            const resourceId = createResourceResponse['id']

            await apig.send(
                new PutMethodCommand({
                    restApiId: restApiId,
                    resourceId: rootResourceId,
                    httpMethod: 'ANY',
                    authorizationType: 'NONE',
                    requestParameters: {
                        'method.request.path.proxy': true,
                        'method.request.header.Authority': true,
                        'method.request.header.Accept': true,
                        'method.request.header.Accept-Language': true,
                        'method.request.header.Cookie': true
                    }
                })
            )

            await apig.send(
                new PutIntegrationCommand({
                    restApiId: restApiId,
                    resourceId: rootResourceId,
                    type: 'HTTP_PROXY',
                    httpMethod: 'ANY',
                    integrationHttpMethod: 'ANY',
                    uri: 'https://www.ryanair.com/',
                    connectionType: 'INTERNET',
                    requestParameters: {
                        'integration.request.path.proxy': 'method.request.path.proxy',
                        'integration.request.header.Authority': 'method.request.header.Authority',
                        'integration.request.header.Accept': 'method.request.header.Accept',
                        'integration.request.header.Accept-Language': 'method.request.header.Accept-Language',
                        'integration.request.header.Cookie': 'method.request.header.Cookie'
                    }
                })
            )

            await apig.send(
                new PutMethodCommand({
                    restApiId: restApiId,
                    resourceId: resourceId,
                    httpMethod: 'ANY',
                    authorizationType: 'NONE',
                    requestParameters: {
                        'method.request.path.proxy': true,
                        'method.request.header.Authority': true,
                        'method.request.header.Accept': true,
                        'method.request.header.Accept-Language': true,
                        'method.request.header.Cookie': true
                    }
                })
            )

            await apig.send(
                new PutIntegrationCommand({
                    restApiId: restApiId,
                    resourceId: resourceId,
                    type: 'HTTP_PROXY',
                    httpMethod: 'ANY',
                    integrationHttpMethod: 'ANY',
                    uri: 'https://www.ryanair.com/{proxy}',
                    connectionType: 'INTERNET',
                    requestParameters: {
                        'integration.request.path.proxy': 'method.request.path.proxy',
                        'integration.request.header.Authority': 'method.request.header.Authority',
                        'integration.request.header.Accept': 'method.request.header.Accept',
                        'integration.request.header.Accept-Language': 'method.request.header.Accept-Language',
                        'integration.request.header.Cookie': 'method.request.header.Cookie'
                    }
                })
            )

            await apig.send(
                new CreateDeploymentCommand({
                    restApiId: restApiId,
                    stageName: STAGE_NAME
                })
            )

            proxies[region] = { "restApiId": restApiId, "url": PROXY_URL(restApiId, region, STAGE_NAME) }
            /* readFile('./openAPIs.json', 'utf8', (err, data) => {
                if (err) {
                    logger.error('Unable to read proxies info.\n')
                    throw err
                }
                const savedProxies = JSON.parse(data)
                savedProxies.push({"region": region, "restApiId": restApiId})
                writeFile('./openAPIs.json', JSON.stringify(savedProxies, null, 2), err => {
                    if (err) {
                        logger.error('Unable to write to proxies file.\n')
                        throw err
                    }
                })
            }) */
            

            logger.info(`Created API in region ${region}`)
            resolve({"region": region, "restApiId": restApiId})
        } catch (err) {
            logger.error(`Failure during API creation in ${region}:\n`, err)
            reject()
        }
    })
}

async function deleteApiGateway(region) {
    logger.info(`Deleting API in ${region}`)
    const apig = new APIGatewayClient({ region: region })
    return apig.send(new DeleteRestApiCommand({restApiId: proxies[region]['restApiId']}))
        .then(response => {
            return new Promise((resolve, reject) => {
                if (response.$metadata.httpStatusCode === 202) {
                    delete proxies[region]
                    resolve()
                } else {
                    reject("Invalid http status: " + response.$metadata.httpStatusCode)
                }
            })
        })
        .then(() => logger.info(`Deleted API in ${region}`))
        .catch(err => logger.error(`Failed to delete proxy in region ${region}:\n`, err))
}

async function deleteApiGatewayV2(region, id) {
    const apig = new APIGatewayClient({ region: region });
    
    return apig.send(new DeleteRestApiCommand({restApiId: id}))
}

module.exports = { createProxies, deleteProxies, proxies, deleteApiGatewayV2 }