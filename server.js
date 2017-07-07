var fs = require('fs');
var express = require('express');
var http = require('http');
var https = require('https');
var compression = require('compression');
var path = require('path');
/*
var sslKey = fs.readFileSync('letsencrypt/privkey.pem', 'utf8');
var sslCert = fs.readFileSync('letsencrypt/cert.pem', 'utf8');
var ca = [
  fs.readFileSync('letsencrypt/chain.pem', 'utf8'), 
  fs.readFileSync('letsencrypt/fullchain.pem', 'utf8')
]; 

var creds = {
  key: sslKey,
  cert: sslCert,
  ca: ca
};
*/
var app = express();
app.use(compression());
app.use(express.static('public'));

app.get('*', function(request, response) {
  response.status(404);
  response.sendFile(path.join(__dirname+'/public/404.html'));
});
/*
http.createServer(function (req, res) {
  res.writeHead(301, { 'Location': 'https://' + req.headers['host'] + req.url });
  res.end();
}).listen(8080);

https.createServer(creds, app).listen(8443);
*/

app.listen(8080, function () {
  console.log('Fundrite app listening on port 8080')
});
