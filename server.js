var express = require('express');
var pg = require('pg');
var js2xmlparser = require('js2xmlparser');
var bodyParser = require('body-parser');
var nodemailer = require('nodemailer');
var app = express();

var port = 8888;



//Config
app.use(bodyParser.urlencoded({ extended: false }));

app.all('/*', function(req, res, next) {
    'use strict';
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    next();
});

/**
 * Variables
 * Connection string: This is maybe going to change.
 */
var dbConn = 'pg://user:user@194.116.110.159:35432/ReportsVDB';
var data = {
    response: 200,
    dataType: 'Application/JSON',
    license: ''
};

function queryDB(query, callback) {
    'use strict';
    var data;
    pg.connect(dbConn, function(err, client, done) {
        if(err) { console.log(err); }

        client.query(query, function(err, result){
            if(err) {
                console.log(err);
                data = err;
            }

            if(result === undefined) {
                data = null;
            } else {
                data = result.rows;
            }
            callback(data);
        });
        done();//call done() to signal you are finished with the client
    });
}

app.get('/api/reports', function(req, res){
    'use strict';
    queryDB('SELECT Reports.reports.*, Reports.types.title AS type, Reports.status.title AS status FROM Reports.reports INNER JOIN Reports.types ON Reports.reports.types_id = Reports.types.id INNER JOIN Reports.status ON Reports.reports.status_id = Reports.status.id ORDER BY Reports.reports.added DESC', function(result){
        data.reports = result;
        res.send(200, data);
    });
});

app.get('/api/reports/:id', function(req, res){
    'use strict';
    var id = req.params.id;
    queryDB('select reports.reports.*, reports.types.title AS type, reports.status.title AS status FROM reports.reports INNER JOIN reports.types ON reports.reports.types_id = reports.types.id INNER JOIN reports.status ON reports.reports.status_id = reports.status.id WHERE reports.reports.id = '+id+' LIMIT 1', function(result){
        res.send(200, result[0]);
    });
});

//Save report
app.post('/api/reports', function(req, res){
    'use strict';
    console.log('Saving data');
    var data = JSON.parse(req.body.model);

    queryDB('SELECT Reports.types.title AS type FROM Reports.types WHERE Reports.types.id = '+data.types_id+'', function(result){
        data.type = result[0].type;
        queryDB("INSERT INTO Reports.reports(description, lat, lng, types_id, status_id, fb_id) VALUES('"+data.description+"', '"+data.lat+"', '"+data.lng+"', "+data.types_id+", 1, "+data.fb_id+")", function(result){
            //Send mail to felanmalan@karlshamn.se
            // create reusable transport method (opens pool of SMTP connections)
            var smtpTransport = nodemailer.createTransport('SMTP',{
                service: 'Gmail',
                auth: {
                    user: 'karlshamnreports@gmail.com',
                    pass: 'djsteffo'
                }
            });

            // setup e-mail data with unicode symbols
            var mailOptions = {
                from: 'Felrapporteringsappen <karlshamnreports@gmail.com>', // sender address
                to: 'alexander.hansson@netport.se', // list of receivers
                subject: 'Felanmälan: '+data.type, // Subject line
                text: 'Felrapport från appen: '+data.description, // plaintext body
                html: '<b>Felrapport från appen: </b>'+data.description, // html body
                attachments: {
                    fileName: 'report.xml',
                    contents: js2xmlparser('report', data)
                }
            };

            // send mail with defined transport object
            smtpTransport.sendMail(mailOptions, function(error, response){
                if(error){
                    console.log(error);
                }else{
                    console.log('Message sent: ' + response.message);
                }

                // if you don't want to use this transport object anymore, uncomment following line
                //smtpTransport.close(); // shut down the connection pool, no more messages
            });
            res.send(200, result);
        });
    });
});

app.get('/api/status', function(req, res){
    'use strict';
    queryDB('SELECT * FROM Reports.status', function(result){
        res.send(200, result);
    });
});


//Update report
app.put('/api/reports/:id', function(req, res){
    'use strict';
    console.log('Saving data');
    var id = req.params.id;
    var report = req.body.reports;
    queryDB("UPDATE Reports.reports SET title = '"+report.title+"', description = '"+report.description+"' WHERE id = "+id+"", function(){

        res.send(200, 'saving'+id);
    });
});

app.get('/api/types', function(req, res){
    'use strict';
    queryDB('SELECT * FROM Reports.types', function(result){
        res.send(200, result);
    });
});

app.listen(port);
console.log('Server running at port '+port);
