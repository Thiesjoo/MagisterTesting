const config = require("./libs/config")

const axios = require("axios")
const fs = require('fs')
const trello = require("./libs/trello")(config.access_token_trello, config.user_token_trello)
const path = require('path')
const TurndownService = require("turndown")
const turndown = new TurndownService()


const cacheFileLocation = path.join(__dirname, config.cacheLocation);
let cacheFile = JSON.parse(fs.readFileSync(cacheFileLocation, 'utf8'))


const miliToYear = (time) => {
    var dd = String(time.getDate()).padStart(2, '0');
    var mm = String(time.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = time.getFullYear();
    return `${yyyy}-${mm}-${dd}`
}


//Time format: Javascript Date object (function will convert it to: 2020-09-25)
async function getAgenda(start, end, force = false, type = 1) {
    if (!(cacheFile && cacheFile.data) || force) {
        console.log("Requesting data")
        let req = await axios.get(`https://pcc.magister.net/api/personen/25145/afspraken?status=${type}&tot=${miliToYear(end)}&van=${miliToYear(start)}`, {
            headers: {  
                "Authorization": config.access_token_magister
            }
        }
        )
        console.log("TOTAL: ", req.data.TotalCount)
        cacheFile = { data: req.data }
        fs.writeFileSync(cacheFileLocation, JSON.stringify(cacheFile))

        return req.data.Items

    } else {
        console.log("SERVING FROM CACHE")
        return cacheFile.data.Items
    }
}

function parseAgenda(data) {
    return data.map(x => {
        if(!x.Docenten[0])console.log(x)
        return {
            id: x.Id, start: x.Start, end: x.Einde, lesStart: x.LesuurVan, lesEind: x.LesuurTotMet, desc: x.Omschrijving, location: x.Lokatie, done: x.Afgerond, data: {
                docent: x.Docenten[0] ? x.Docenten[0].Naam : "undefenid" ,
                vak: x.Vakken[0] ? x.Vakken[0].Naam : "undefenid",
                huiswerk: x.Inhoud,
            }
        }
    })
}



async function main() {
    try {
        //Where to get homework from
        let start = new Date("10-5-2020")
        let end = new Date("10-11-2020")

        let allData = await getAgenda(start, end)
        let parsed = parseAgenda(allData);

        //Get homework and parse it for trello
        let homeworkNotDone = parsed.filter(x => x.data.huiswerk !== null && !x.done)
        let parsedForTrello = homeworkNotDone.map(x => {
            return { id: x.id, start: new Date(x.start), desc: x.desc, data: x.data }
        })


        //Some subject use a weektaak, so only included handy shizzle
        let parsedVakken = {}
        parsedForTrello.forEach(x => {
            parsedVakken[x.data.vak] ? parsedVakken[x.data.vak].push(x) : (parsedVakken[x.data.vak] = [x])
        })

        let toTrello = []

        Object.keys(parsedVakken).forEach(x => {
            toTrello = toTrello.concat(config.vakken[x] && config.vakken[x].list ? config.vakken[x].list(parsedVakken[x]) : parsedVakken[x])
        })
        toTrello.sort((a, b) => a.start - b.start)

        //Trello
        let allBoards = await trello.getBoards();
        let ShizzleObject = allBoards.find(x => x.name == config.trelloBoard)
        if (!ShizzleObject) throw new Error("Trello board not found")
        let ShizzleID = ShizzleObject.id


        let listsOnShizzle = await trello.getLists(ShizzleID)
        // let ShizzleBoard = await trello.getBoard(ShizzleID)
        console.log("Got lists from trello api")

        let autoList = listsOnShizzle.find(x => x.name == config.trelloList)
        if (!autoList) {
            autoList = await trello.createList(ShizzleID, config.trelloList)
            console.log("Created a new list for AUTO Insert")
        }
        let autoListID = autoList.id
        let cards = await trello.getCardsInList(autoListID)
        console.log("Got cards from list")


        let promises = []
        for (let i = 0; i < toTrello.length; i++) {
            const x = toTrello[i];

            let name, desc = ""
            if (config.vakken[x.data.vak] && config.vakken[x.data.vak].format) {
                ({ name, desc } = config.vakken[x.data.vak].format(x))
            } else {
                let start = `#  ${x.data.vak} - ${x.data.docent}\n`
                let parsedHuiswerk = turndown.turndown(x.data.huiswerk)
                name = x.data.vak
                desc = start + parsedHuiswerk
            }

            promises.push(trello.createCard(autoListID, name, desc, x.start))
        }
        await Promise.all(promises)
        console.log("📚Created cards for every homework item")
    } catch (err) {
        console.error("ERROR FROM API", (err && err.response && err.response.data) ? err.response.data : err)
    }

}

main()



// async function markAsDone(id, allData) {
//     console.log(id)

//     let found = allData.find(x => x.Id == id)
//     console.log(found)

//     return
//     let req = await axios.put(`https://pcc.magister.net/api/personen/25145/afspraken/${id}`, {
//         headers: {
//             "Authorization": access_token_magister
//         }
//     })
// }

