var fs = require('fs');
var express = require('express');
var http = require('http');
var https = require('https');
var compression = require('compression');
var path = require('path');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var busboy = require('connect-busboy');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var req = require('request');
var bodyParser = require('body-parser');
var morgan = require('morgan');
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

console.log('"ip","date","method","url","status","time"');

var app = express();
app.use(busboy());
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(morgan('":remote-addr",":date[web]",":method",":url",":status",":response-time ms"'));
app.use(express.static('public'));

app.get('/submit', function(request, response) {
    var applicant = {
        'Business Name': request.query.name, 
        'Business Phone': request.query.phone,
        'Business Fax': request.query.fax,
        'Business Address': request.query.address,
        'Desired Loan Amount': request.query.loan,
        'Federal I.D. Number': request.query.fedid,
        'Date of Incorporation': request.query.dateinc,
        'Type of Incorporation/Ownership': request.query.typeinc,
        'Type of Business': request.query.typebis,
        'First Owner\'s Full Legal Name': request.query.owner1,
        'First Owner\'s Title': request.query.owner1title,
        'First Owner\'s Ownership Percentage': request.query.owner1perc,
        'First Owner\'s Social Security Number': request.query.owner1ssn,
        'First Owner\'s Home Phone': request.query.owner1homephone,
        'First Owner\'s Cell Phone': request.query.owner1cellphone,
        'First Owner\'s Date of Birth': request.query.owner1dob,
        'First Owner\'s Email': request.query.owner1email,
        'First Owner\'s Home Address': request.query.owner1address,
        'Second Owner\'s Full Legal Name': request.query.owner2,
        'Second Owner\'s Title': request.query.owner2title,
        'Second Owner\'s Ownership Percentage': request.query.owner2perc,
        'Second Owner\'s Social Security Number': request.query.owner2ssn,
        'Second Owner\'s Home Phone': request.query.owner2homephone,
        'Second Owner\'s Cell Phone': request.query.owner2cellphone,
        'Second Owner\'s Date of Birth': request.query.owner2dob,
        'Second Owner\'s Email': request.query.owner2email,
        'Second Owner\'s Home Address': request.query.owner2address,
        'Financial Needs': request.query.fineed,
        'Terms of Financing': request.query.term,
        'Purchase Price': request.query.pp,
        'Lender': request.query.lender,
        'Lender\'s Phone': request.query.lphone,
        'Lender Contact': request.query.lcontact,
        'Owner/Officer Bankruptcy in Last 5 Years': request.query.bankruptcy
    }
    var filled = 0;
    var emailText = '';
    for(dp in applicant) {
        if(applicant[dp] !== '') {
            emailText += dp + ':\n' + applicant[dp] + '\n\n';
            filled++;
        }
    }
    if(filled < 2) {
        response.redirect('/apply.html');
        return;
    }

    var mailOptions = {
        from: config.from,
        to: config.to,
        subject: 'New Fundrite Application',
        text: emailText,
    };

    var attachments = [];
    var upPath = './uploads/' + request.ip + '/';

    if(fs.existsSync(upPath)) {
        fs.readdir(upPath, function(err, files) {
            files.forEach(function(file) {
                var attachment = {
                    filename: file,
                    path: upPath + file
                };
                attachments.push(attachment);
            });

            mailOptions.attachments = attachments;
            mailer.sendMail(mailOptions, function(err, res) {
                if(err) {
                    console.log(err);
                }
                mailer.close();
                rimraf(upPath, function() {
                    console.log(upPath + ' deleted');
                });
            });
        });
    } else {
        mailer.sendMail(mailOptions, function(err, res) {
            if(err) {
                console.log(err);
            }
            mailer.close();
        });
    }


    var first;
    var last;
    if(request.query.owner1 !== null) {
        var nameAr = request.query.owner1.split(' ');
        first = nameAr[0];
        last = nameAr[nameAr.length-1];
    }

    var microbiltOptions = {
        method: 'POST',
        url: config.microbilt_url,
        qs: {
            MemberId: config.microbilt_id,
            MemberPwd: config.microbilt_pass,
            CallbackUrl: config.microbilt_callback_url,
            ContactBy: 'BOTH',
            'Customer.CompletionEmail': request.query.owner1email,
            'Customer.LegalCorporateName': request.query.name,
            'Customer.PhysicalAddress': request.query.address,
            'Customer.WorkPhone': request.query.phone,
            'Customer.FederalTaxId': request.query.fedid,
            'Customer.DateBusinessStarted': request.query.dateinc,
            'Customer.TypeOfEntity': request.query.typeinc,
            'Customer.ContactFirstName': first,
            'Customer.ContactLastName': last,
            'Customer.ContactTitle': request.query.owner1title,
            'Customer.ContactOwnershipPercentage': request.query.owner1perc,
            'Customer.ContactWorkEmail': request.query.owner1email,
            'Customer.ContactSSN': request.query.owner1ssn,
            'Customer.ContactDOB': request.query.owner1dob,
            'Customer.ContactHomePhone': request.query.owner1homephone,
            'Customer.ContactCellPhone': request.query.owner1cellphone,
            'Customer.NoPartner': 'true'
        },
        headers: { 
            'content-type': 'application/x-www-form-urlencoded',
            accept: 'application/json' 
        }
    };
    req(microbiltOptions, function (error, response, body) {
        if(error) {
            console.log(error);
        }
    });

    var mcaOptions = {
        url: config.mca_url,
        method: 'POST',
        headers: {
            X_MCASUITE_APP_ID: config.mca_id,
            X_MCASUITE_APP_TOKEN: config.mca_pass
        },
        form: {
            firstName: first,
            lastName: last,
            companyBusinessPhone: request.query.phone,
            companyFaxPhone: request.query.fax, 
            ownerEmail: request.query.owner1email,
            companyName: request.query.name,
            dba: request.query.name,
            title: request.query.owner1title,
            ssn: request.query.owner1ssn,
            dateOfBirth: request.query.owner1dob,
            ownerHomePhone: request.query.owner1homephone,
            ownerMobilePhone: request.query.owner1cellphone,
            ownership: request.query.owner1perc 
        }
    };
    if(mcaOptions.form.firstName === '' || mcaOptions.form.firstName == null) {
        mcaOptions.form.firstName = 'N/A';
    }
    if(mcaOptions.form.lastName === '' || mcaOptions.form.lastName == null) {
        mcaOptions.form.lastName = 'N/A';
    }
    req(mcaOptions, function (error, response, body) {
        if(error) {
            console.log(error);
        }
    });
    response.redirect('/app_sent.html');
});

app.get('/contact', function(request, response) {
    var mailOptions = {
      from: config.from,
      to: config.to,
      subject: 'New Fundrite Lead',
      text: 'Name:\n' + request.query.name +
            '\n\nEmail:\n' + request.query.email +
            '\n\nPhone:\n' + request.query.phone +
            '\n\nMessage:\n' + request.query.message
    };

    mailer.sendMail(mailOptions, function(err, res) {
      if(err) {
        console.log(err);
      }
      mailer.close();
    });
    response.redirect('/message_sent.html');
});

app.post('/up', function(request, response) {
    request.pipe(request.busboy);
    request.busboy.on('file', function(fieldname, file, filename) {
        var upPath = './uploads/' + request.ip + '/';
        mkdirp(upPath, function (err) {
            if (err) {
                console.error(err);
            } else {
                var fstream = fs.createWriteStream(upPath + filename);
                file.pipe(fstream);
                console.log(upPath + filename + ' uploaded');
            }
        });
    });
    response.send('uploaded');
});

app.post('/ibv', function(request, response) {
    var mailOptions = {
        from: config.from,
        to: config.to,
        subject: 'New Fundrite Applicant Bank Statements',
        text: config.microbilt_report_url + request.body.Reference,
    };
    mailer.sendMail(mailOptions, function(err, res) {
      if(err) {
        console.log(err);
      }
      mailer.close();
    });
    response.send(request.body);
});

app.get('*', function(request, response) {
    response.status(404);
    response.sendFile(path.join(__dirname+'/public/404.html'));
});

http.createServer(function (request, response) {
    response.writeHead(301, { 'Location': 'https://' + request.headers['host'] + request.url });
    response.end();
}).listen(8080);

https.createServer(creds, app).listen(8443);
