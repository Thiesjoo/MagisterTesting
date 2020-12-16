
const axiosRequire = require("axios")


module.exports = (access, user) => {
    let access_token = access
    let user_token = user;

    const axios = axiosRequire.create({
        baseURL: "https://api.trello.com/1/",
        params: {
            key: access_token,
            token: user_token
        }
    })


    //get 

    const get = {
        "getBoards": async () => {
            let res = await axios.get(`members/me/boards`)
            return res.data
        },

        "getBoard": async (id) => {
            let res = await axios.get(`boards/${id}`)
            return res.data
        },

        "getLists": async (id) => {
            let res = await axios.get(`boards/${id}/lists`)
            return res.data
        },

        "getCardsInList": async(id) => {
            let res = await axios.get(`lists/${id}/cards`)
            return res.data
        }
    }

    const post = {
        "createList": async (id, name) => {
            let res = await axios.post(`boards/${id}/lists`, { name, pos: "bottom" })
            return res.data
        },
        "createCard": async (listId, name, desc, due, pos,) => {
            let res = await axios.post(`cards`, {
                idList: listId,
                name,
                desc,
                pos,
                due
            })
            return res.data
        }
    }




    return {
        ...get,
        ...post
    }
}