const express = require('express')
const app = express();
const cors = require('cors')
const PORT = process.env.PORT || 8000;;

const axios = require('axios');

const queue = require('queue')



// var chessAPI = new ChessWebAPI({
//     queue: true,
// });

// let printResults = function(response, error, sampleParameter1, sampleParameter2){
//     console.log(response.body);
//     console.log(sampleParameter1);
//     console.log(sampleParameter2);
// }
// chessAPI.dispatch(chessAPI.getPlayerMonthlyArchives, printResults, ["francozalamena"])

function convertTimeIntoSeconds(string){
    var split = string.split(":")
    var seconds = parseInt(split[2])
    var minutes = parseInt(split[1])
    var hours = parseInt(split[0])
    return seconds + minutes * 60 + hours * 3600
}

async function getTotalTimeFromArchive(url){
    let gamesResponse = await axios.get(url)
    let games = gamesResponse.data.games
    let totalTimePlayed = 0
    return new Promise(function(resolve, reject){
        for(gameIndex in games){
            let game = games[gameIndex]
            var pgn = game.pgn
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
            }
        }
        
        resolve(totalTimePlayed)
    }).catch(function(err){
        console.log(err)
    })
}

app.use(cors({
    origin: 'http://localhost:3000/'
}));

app.get('/chesscom/:userId',cors(), async (req, res) => {
    var userId = req.params.userId
    console.log('request from ' + req.headers.origin)
    const urlsRes = await axios.get("https://api.chess.com/pub/player/" + userId + "/games/archives").catch(function(error){
        res.status(error.response.status).send(error.response.statusText)
        return
    })
    if(urlsRes == undefined) return
    
    const q = queue({results: [], concurrency : 2})

    var totalTimePlayed =  0
    for(urlIndex in urlsRes.data.archives){ 
        let url = urlsRes.data.archives[urlIndex]
        //instead of actually calling it, we need to add it into the queue
        q.push(() => getTotalTimeFromArchive(url))
    }

    q.start(function(err){
        if(err){
            console.log(err.response.statusText)
            res.status(err.response.status).send(err.response.statusText)
            q.end([err])
        } else{
            for(i in q.results){
                totalTimePlayed += q.results[i][0]
            }
    
            var json = {
                totalTime: String(totalTimePlayed)
            }
            res.status(200).json(json)
            console.log('sending info to client: ' + JSON.stringify(json))
            q.end()
        }   
    })

    q.on('success', function (result, job) {
        console.log('job finished processing:', job.toString().replace(/\n/g, ''))
      })

    


    
});

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}!`)
});
