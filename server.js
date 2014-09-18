var express = require('express');
//var pg = require('pg');
var mysql = require('mysql');
var js2xmlparser = require('js2xmlparser');
var fs = require('fs');
var multer = require('multer');
var nodemailer = require('nodemailer');
var app = express();

var port = 8888;

//Image upload
app.use(multer({
    dest: 'images_temp/'
}));

app.all('/*', function(req, res, next) {
    'use strict';
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');
    next();
});

var data = {
    response: 200,
    dataType: 'Application/JSON',
    license: ''
};

/**
 * Variables
 * Connection string: 
 */
//var dbConn = 'pg://user:user@194.116.110.159:35432/ReportsVDB';

var connection = mysql.createConnection({
    host     : '195.84.86.39',
    port     : '3306',
    user     : 'root',
    password : 'Open-Dai2012'
});

/* FUNCTION FOR POSTGRESS
function queryDB(query, callback) {
    'use strict';
    var data;
    pg.connect(dbConn, function(err, client, done) {
        if(err) { console.log(err); }

        client.query(query, function(err, result){
            if(err) {
                console.log('Query Error: ');
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
*/

connection.connect();

function queryDB(query, callback) {
    'use strict';
    
    connection.query(query, function(err, rows) {
        if (err) {
            throw err;
        }
        callback(rows);
    });
}

//Save report
app.post('/api/reports', function(req, res){
    'use strict';
    console.log('Saving data');

    var data = req.body;

    var img = null;

    if(req.files.file) {
        img = req.files.file.name;
    }
    

    queryDB('SELECT Reports.types.title AS type FROM Reports.types WHERE Reports.types.id = '+data.type_id+'', function(result){
        data.type = result[0].type;

        queryDB("INSERT INTO Reports.reports(description, lat, lng, types_id, status_id, fb_id, img) VALUES('"+data.description+"', '"+data.lat+"', '"+data.lng+"', "+data.type_id+", 1, '"+data.fb_id+"', '"+img+"')", function(result){
            //Send mail to felanmalan@karlshamn.se
            // create reusable transport method (opens pool of SMTP connections)
            var transporter = nodemailer.createTransport({
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
                    filename: 'report.xml',
                    contents: js2xmlparser('report', data)
                }
            };

            // send mail with defined transport object
            /*transporter.sendMail(mailOptions, function(error, info){
                if(error){
                    console.log(error);
                }else{
                    console.log('Message sent: ' + info.response);
                }
            });*/
            res.status(200).send(result);
        });

    });
});

app.get('/img/:filename', function(req, res){
    'use strict';
    res.sendFile(__dirname+'/images_temp/'+req.params.filename);
});

app.get('/api/reports', function(req, res){
    'use strict';
    
    queryDB('SELECT Reports.reports.*, Reports.types.title AS type, Reports.status.title AS status FROM Reports.reports INNER JOIN Reports.types ON Reports.reports.types_id = Reports.types.id INNER JOIN Reports.status ON Reports.reports.status_id = Reports.status.id ORDER BY Reports.reports.added DESC', function(result){
        data.reports = result;
        res.status(200).send(data);
    });
});

app.get('/api/reports/:id', function(req, res){
    'use strict';
    var id = req.params.id;
    queryDB('select reports.reports.*, reports.types.title AS type, reports.status.title AS status FROM reports.reports INNER JOIN reports.types ON reports.reports.types_id = reports.types.id INNER JOIN reports.status ON reports.reports.status_id = reports.status.id WHERE reports.reports.id = '+id+' LIMIT 1', function(result){
        console.log(result[0]);
        res.status(200).send(result[0]);
    });
});

app.get('/api/status', function(req, res){
    'use strict';
    queryDB('SELECT * FROM Reports.status', function(result){
        res.status(200).send(result);
    });
});


//Update report
app.put('/api/reports/:id', function(req, res){
    'use strict';
    console.log('Saving data');
    var id = req.params.id;
    var report = req.body.reports;
    queryDB("UPDATE Reports.reports SET title = '"+report.title+"', description = '"+report.description+"' WHERE id = "+id+"", function(){
        res.status(200).send('saving'+id);
    });
});

app.get('/api/types', function(req, res){
    'use strict';
    connection.query('SELECT * FROM Reports.types', function(err, result){
        res.status(200).send(result);
    });
    /*
    queryDB('SELECT * FROM Reports.types', function(result){
        res.status(200).send(result);
    });*/
});

app.listen(port);
console.log('Server running at port '+port);
