const TurndownService = require("turndown")
const turndown = new TurndownService()
const dotenv = require("dotenv")
dotenv.config()

const access_token_magister = process.env.MAGISTER_ACCESS
const access_token_trello = process.env.TRELLO_ACCESS
const user_token_trello = process.env.USER_TRELLO

const wiskunde = {
    "format": (value) => {
        let name = `${value.data.vak}: ${turndown.turndown(value.data.huiswerk)}`
        let desc = `#  ${value.data.vak} - ${value.data.docent}\n${turndown.turndown(value.data.huiswerk)}`
        return { name, desc }
    }
}

module.exports = {
    access_token_magister,
    access_token_trello,
    user_token_trello,

    cacheLocation: "cache/sample.json",
    agendaTypes: { "homework": 0, "all": 1 },


    trelloBoard: "Shizzle",
    trelloList: "TODO(AUTO)",

    vakken: {
        "scheikunde": {
            "list": (list) => {
                return [list[list.length - 1]]
            },

        },
        "wiskunde B": wiskunde,
        "wiskunde D": wiskunde
    }

}
