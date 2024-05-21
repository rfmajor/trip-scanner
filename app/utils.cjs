const fs = require('fs')

function generateSmallCitiesFile() {
    const airports = JSON.parse(fs.readFileSync('./cities_big.json', 'utf8'))
    const airportsDict = {}
    airports.forEach(airport => {
        const isPartOfMacCity = airport.hasOwnProperty('macCity')
        const code = isPartOfMacCity ? airport['macCity']['macCode'] : airport['code']
        if (!airportsDict.hasOwnProperty(code)) {
            const city = isPartOfMacCity ? airport['macCity'] : airport['city']
            const country = airport['country']
            airportsDict[code] = {
                code: code,
                country: {
                    name: country['name'],
                    code: country['code'],
                    iso3Code: country['iso3code'],
                    currency: country['currency']
                },
                city: {
                    name: city['name'],
                    isMac: isPartOfMacCity
                }
            }
        }
    })
    fs.writeFileSync('./cities_small.json', JSON.stringify(airportsDict, null, 3))
}

function generateCitiesWithoutMacsFile() {
    const airports = JSON.parse(fs.readFileSync('./cities_big.json', 'utf8'))
    const airportsDict = {}
    airports.forEach(airport => {
        const code = airport['code']
        if (!airportsDict.hasOwnProperty(code)) {
            const city = airport['city']
            const country = airport['country']
            airportsDict[code] = {
                code: code,
                country: {
                    name: country['name'],
                    code: country['code'],
                    iso3Code: country['iso3code'],
                    currency: country['currency']
                },
                city: {
                    name: city['name'],
                    isMac: false
                }
            }
        }
    })
    fs.writeFileSync('./cities_noMac.json', JSON.stringify(airportsDict, null, 3))
}

module.exports = { generateCitiesWithoutMacsFile, generateSmallCitiesFile }