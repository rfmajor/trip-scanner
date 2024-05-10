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