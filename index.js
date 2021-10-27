const express = require('express')
const app = express();
const cors = require('cors')
const PORT = process.env.PORT || 3000;;

const axios = require('axios');
const { response } = require('express');


function convertTimeIntoSeconds(string){
    var split = string.split(":")
    var seconds = parseInt(split[2])
    var minutes = parseInt(split[1])
    var hours = parseInt(split[0])
    return seconds + minutes * 60 + hours * 3600
}

function getTotalTimePlayed(urlsRes, res){
    
    var promises = []
    for(url in urlsRes.archives){
        var promise = axios.get(urlsRes.archives[url])
        promises.push(promise)
    }
    return Promise.all(promises)
}

app.get('/chesscom/:userId', (req, res) => {
    var userId = req.params.userId
    axios.get("https://api.chess.com/pub/player/" + userId + "/games/archives")
        .then(async urlsRes => {
            var promisesCompleted = await getTotalTimePlayed(urlsRes.data, res)
            var totalTimePlayed = 0
            for(i in promisesCompleted){
                var gamesRes = promisesCompleted[i]
                for(game in gamesRes.data.games){
                    var gameJson = gamesRes.data.games[game]
                    var pgn = gameJson.pgn
                    if(pgn != undefined){
                        var formattedString = pgn.replace(/\[/g, "").replace(/\]/g, "").replace(/\n/g, "\n").replace(/\\/g, "")
                        var date =  formattedString.match(/^Date (["0-9.]*)$/gm)[0].split(" ")[1].replace("\"", "")
                        var startTime =  formattedString.match(/^StartTime (["0-9:]*)$/gm)[0].split(" ")[1].replace("\"", "")
                        var endTime =  formattedString.match(/^EndTime (["0-9:]*)$/gm)[0].split(" ")[1].replace("\"", "")
        
                        var startSeconds = convertTimeIntoSeconds(startTime)
                        var endSeconds = convertTimeIntoSeconds(endTime)
        
                        var totalTime = endSeconds - startSeconds
        
                        if (totalTime > 0){
                            // console.log(date)
                            // console.log(totalTime)
                            // console.log("\n")
                            totalTimePlayed = totalTimePlayed + totalTime
                        }
                    }else{
                        // console.log(gameJson)
                        continue
                    }
                }
            }
            res.status(200).send(String(totalTimePlayed))
        })
        .catch(error => {
            res.send(error)
        }
        )
});

app.use(cors());

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}!`)
});

