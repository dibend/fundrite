var fs = require('fs');
var express = require('express');
var http = require('http');
var https = require('https');
var compression = require('compression');
var path = require('path');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var config = require('./config');

var mailer = nodemailer.createTransport(smtpTransport({
  host: config.ses_host,
  secureConnection: true,
  port: 465,
  auth: {
    user: config.ses_user,
    pass: config.ses_pass
  }
}));

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

var app = express();
app.use(compression());
app.use(express.static('public'));

app.get('/submit', function(request, response) {
    var emailText = 'Business Name:\n' + request.query.name + 
    '\n\nBusiness Phone:\n' + request.query.phone +
    '\n\nBusiness Fax:\n' + request.query.fax +
    '\n\nBusiness Address:\n' + request.query.address +
    '\n\nDesired Loan Amount:\n' + request.query.loan +
    '\n\nFederal I.D. Number:\n' + request.query.fedid +
    '\n\nDate of Incorporation:\n' + request.query.dateinc +
    '\n\nType of Incorporation/Ownership:\n' + request.query.typeinc +
    '\n\nType of Business:\n' + request.query.typebis +
    '\n\nFirst Owner\'s Full Legal Name:\n' + request.query.owner1 +
    '\n\nFirst Owner\'s Title:\n' + request.query.owner1title +
    '\n\nFirst Owner\'s Ownership Percentage:\n' + request.query.owner1perc +
    '\n\nFirst Owner\'s Social Security Number:\n' + request.query.owner1ssn +
    '\n\nFirst Owner\'s Home Phone:\n' + request.query.owner1homephone +
    '\n\nFirst Owner\'s Cell Phone:\n' + request.query.owner1cellphone +
    '\n\nFirst Owner\'s Date of Birth:\n' + request.query.owner1dob +
    '\n\nFirst Owner\'s Email:\n' + request.query.owner1email +
    '\n\nFirst Owner\'s Home Address:\n' + request.query.owner1address;
    
    if('owner2' in request.query) {
        emailText += '\n\nSecond Owner\'s Full Legal Name:\n' + request.query.owner2 +
        '\n\nSecond Owner\'s Title:\n' + request.query.owner2title +
        '\n\nSecond Owner\'s Ownership Percentage:\n' + request.query.owner2perc +
        '\n\nSecond Owner\'s Social Security Number:\n' + request.query.owner2ssn +
        '\n\nSecond Owner\'s Home Phone:\n' + request.query.owner2homephone +
        '\n\nSecond Owner\'s Cell Phone:\n' + request.query.owner2cellphone +
        '\n\nSecond Owner\'s Date of Birth:\n' + request.query.owner2dob +
        '\n\nSecond Owner\'s Email:\n' + request.query.owner2email +
        '\n\nSecond Owner\'s Home Address:\n' + request.query.owner2address;
    }

    emailText += '\n\nFinancial Needs:\n' + request.query.fineed;

    if('term' in request.query) {
        emailText += '\n\nTerms of Financing:\n' + request.query.term +
        '\n\nPurchase Price:\n' + request.query.pp +
        '\n\nLender:\n' + request.query.lender +
        '\n\nLender\'s Phone:\n' + request.query.lphone +
        '\n\nLender Contact:\n' + request.query.lcontact;
    }

    emailText += '\n\nOwner/Officer Bankruptcy in Last 5 Years:\n' + request.query.bankruptcy;

    var mailOptions = {
      from: 'Fundrite Applicant <blasts@blastnotifications.com>',
      to: 'dibend8@gmail.com',
      subject: 'New Fundrite Application',
      text: emailText 
    };

    mailer.sendMail(mailOptions, function(err, res) {
      if(err) {
        console.log(err);
      }
      mailer.close();
    });
    console.log('app sent');
    response.send('application sent!');
});

app.get('*', function(request, response) {
  response.status(404);
  response.sendFile(path.join(__dirname+'/public/404.html'));
});

http.createServer(function (req, res) {
  res.writeHead(301, { 'Location': 'https://' + req.headers['host'] + req.url });
  res.end();
}).listen(8080);

https.createServer(creds, app).listen(8443);
