var http = require('http')
var https = require('https')
var request = require('request')

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0
const NM_API_KEY = 'b5bf5f1f19da9f2fc0105d2f0444866f'
const NM_ORIGIN = 'https://yinsure.finance'
const CACHE_TIMEOUT_SECONDS = 5 * 60
let cachedResponseLastUpdate = 0
let cachedResponse = null

function getNow() {
  return Math.floor(+new Date() / 1000)
}

function getCapacities() {
}

http.createServer(function (req, res) {
  let responseData = ''

  // TODO: Only permit certain origins

  if (req.url == "/v1/capacities") {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked',
      'access-control-allow-headers': 'x-api-key',
      'access-control-allow-origin': '*'
    });

    if (getNow() - cachedResponseLastUpdate > CACHE_TIMEOUT_SECONDS) {
      const proxiedReq = https.request({
        hostname: 'api.nexusmutual.io',
        port: 443,
        path: '/v1/capacities',
        method: 'GET',
        headers: {
          'x-api-key': NM_API_KEY,
          Origin: NM_ORIGIN
        }
      }, proxiedRes => {
        console.log(`statusCode: ${proxiedRes.statusCode}`)

        proxiedRes.on('data', d => {
          responseData = responseData.concat(d)
          res.write(d)
        })

        proxiedRes.on('end', d => {
          cachedResponse = responseData
          cachedResponseLastUpdate = getNow()
          res.end()
        })
      })

      proxiedReq.on('error', error => {
        console.error(error)
        res.writeHead(500, {'Content-Type': 'text/plain'});
        res.end("ERROR");
      })

      proxiedReq.end()
    } else {
      res.end(cachedResponse)
    }
  } else if (req.url.startsWith("/v1/quote?")) {
    request({
      url: `https://api.nexusmutual.io${req.url}`,
      headers: {
        'x-api-key': NM_API_KEY,
        Origin: NM_ORIGIN
      },
    }, function(error, response, body) {
      if (error) {
        console.error(error)
        res.writeHead(500, {'Content-Type': 'text/plain'});
        res.end("ERROR");
      } else {
        console.log(response)
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Transfer-Encoding': 'chunked',
          'access-control-allow-headers': 'x-api-key',
          'access-control-allow-origin': '*'
        });
        res.end(body)
      }
    })
  } else {
    res.writeHead(404);
    res.end()
  }
}).listen(9000);
