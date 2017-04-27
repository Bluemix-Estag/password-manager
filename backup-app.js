// Modulos
var express = require('express'),
    routes = require('./routes'),
    http = require('http'),
    path = require('path'),
    fs = require('fs');

var crypto = require('crypto'),
    algorithm = 'aes-256-ctr',
    password = 'd6F3Efeq';

var app = express();
var DOCUMENT_ID, AUTHENTICATED_USER;
var db;

var cloudant;

var fileToUpload;

var dbCredentials = {
    dbName: 'accounts'
};

var bodyParser = require('body-parser');


// Set Cloudant
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/style', express.static(path.join(__dirname, '/views/style')));

// Set root
app.get('/', (req, res) => {
    res.render('home');
})

// Set embedded presentation
app.get('/presentation', (req, res) => {
    res.render('presentation');
})

// Login infos
var logInfo = [];

// Set profile page - with profile info
app.post('/profile', function (req, res) {
    // req.body object has your form values
    logInfo = {
        login: encrypt(req.body.login),
        password: encrypt(req.body.password)
    }


    db = cloudant.use(dbCredentials.dbName);

    db.get(DOCUMENT_ID, {
        revs_info: true
    }, function (err, doc) {
        if (err) {
            console.log(err);
        } else {
            //            console.log("id: " + DOCUMENT_ID);
            for (var user in doc['users']) {
                if ((doc['users'][user]['username']) == logInfo.login && doc['users'][user]['password'] == logInfo.password) {
                    AUTHENTICATED_USER = user;
                    //                    console.log('LOGIN SUCESSFULL');
                    var accounts = [];
                    var len = Object.keys(doc['users'][user]['accounts']).length;
                    if (len == 0) {
                        accounts: {};
                    }
                    for (var i = 1; i <= len; i++) {
                        accounts.push(doc['users'][user]['accounts'][i]);
                    }
                    //                    console.log(accounts.length);
                    res.render('profile', {
                        contas: accounts
                    });
                }
            }
        }

    });
});

app.get('/register', function (req, res) {
    res.render('register');
})
// Set register
app.post('/register', function (req, res) {
    // req body with input values.
    var newUserAccount = {
        newUsername: req.body.username,
        newUserpwd: req.body.master,
        newAccountName: req.body.newacc,
        newAccountPwd: req.body.newpwd
    }

    // Set db to user
    db = cloudant.use(dbCredentials.dbName);

    // Get db info

    db.get(DOCUMENT_ID, {
        revs_info: true
    }, function (err, doc) {
        if (err) {
            console.log(err)
        } else {
            console.log('Doc id: ' + DOCUMENT_ID);
            for (var user in doc['users']) {
                if (newUserAccount == doc['users']['username']) {
                    app.get('/userExists', (req, res) => {
                        res.send('Account name already exists.');
                    })

                } else {
                    var newUsers = [];
                    var len = Object.keys(doc['users']).length;
                    var newUserid = len + 1;
                    newUsers.push(doc['users']);
                    doc['users'][[newUserid]] = {
                        username: encrypt(newUserAccount.newUsername),
                        password: encrypt(newUserAccount.newUserpwd),
                        accounts: {
                            '1': {
                                accountName: (newUserAccount.newAccountName),
                                accountPassword: (newUserAccount.newAccountPwd)
                            }
                        }
                    }
                    newUsers.push(doc['users'][[newUserid]]);

                    db.insert(doc, DOCUMENT_ID, function (err, doc) {
                        if (err) {
                            console.log(err);
                        } else {
                            //If it was successful, redirects to profile page with all account info updated.
                            res.render('home');
                            //                            console.log('Inseriu');
                        }
                    })
                }
            }
        }
    })
})




app.post('/delete', (req, res) => {
    //Get the correct document( in this case, there is only one document)
    
    var deleted = req.query.id;
console.log("Entrou no delete " + deleted);
    db.get(DOCUMENT_ID, {
        revs_info: true
    }, function (err, doc) {
        if (err) {
            console.log(err);
        } else {
            //If document exists
            
            var accounts = []; // To save accounts and redirect to profile page if added with success.
            //AUTHENTICATED_USER is the current user id saved when the user did the login.
            //Iterate over authenticated user accounts
            for (var account in doc['users'][AUTHENTICATED_USER]['accounts']) {
                if(doc['users'][AUTHENTICATED_USER]['accounts'][account]['accountName'] == deleted){
                    var ID = account;
                    delete doc['users'][AUTHENTICATED_USER]['accounts'][account]
                }else{
                    accounts.push(doc['users'][AUTHENTICATED_USER]['accounts'][account]);
                }
                 // add every account that exists on Cloudant on local accounts variable
            }
             // Adds one to the last id 
        }; // adds new account on Cloudant's document ( json with everything)
//         Add on accounts local object the account that was just added, on the loop this account would not exist.

// Insert account with deleted id.
        console.log(accounts);
        doc['users'][AUTHENTICATED_USER]['accounts'] = accounts;
//        db.insert(doc, DOCUMENT_ID, function (err, doc) {
//            if (err) {
//                console.log(err);
//            } else {
//                //If it was successful, redirects to profile page with all account info updated.
//                res.render('profile', {
//                    contas: accounts
//                });
//            }
//        })
    })
})






// Set newacc to add new login
app.get('/newacc', function (req, res) {
    res.render('newacc');
})

// Set addAcc to add new Account (eg. Facebook, Gmail)
app.post('/addAcc', function (req, res) {
    //Get attributes
    var accountName = req.body.accountName;
    var accountPassword = req.body.accountPassword;
    //Verify if they exist
    if (accountName && accountPassword) {
        //Get the correct document( in this case, there is only one document)
        db.get(DOCUMENT_ID, {
            revs_info: true
        }, function (err, doc) {
            if (err) {
                console.log(err);
            } else {
                //If document exists
                var id = 0;
                var accounts = []; // To save accounts and redirect to profile page if added with success.

                //AUTHENTICATED_USER is the current user id saved when the user did the login.
                //Iterate over authenticated user accounts
                for (var account in doc['users'][AUTHENTICATED_USER]['accounts']) {
                    id = account; //Saves user id on account, it saves the last one.
                    accounts.push(doc['users'][AUTHENTICATED_USER]['accounts'][account]); // add every account that exists on Cloudant on local accounts variable
                }
                id++; // Adds one to the last id 
                doc['users'][AUTHENTICATED_USER]['accounts'][id] = {
                    'accountName': (accountName),
                    'accountPassword': (accountPassword)
                }
            }; // adds new account on Cloudant's document ( json with everything)
            // Add on accounts local object the account that was just added, on the loop this account would not exist.
            accounts.push(doc['users'][AUTHENTICATED_USER]['accounts'][id]);
            //Insert new account with recently added account.
            db.insert(doc, DOCUMENT_ID, function (err, doc) {
                if (err) {
                    console.log(err);
                } else {
                    //If it was successful, redirects to profile page with all account info updated.
                    res.render('profile', {
                        contas: accounts
                    });
                }
            })
        })
    }
})

var newUser = [];
// Register new user

// Default Cloudant function
function getDBCredentialsUrl(jsonData) {
    var vcapServices = JSON.parse(jsonData);
    // Pattern match to find the first instance of a Cloudant service in
    // VCAP_SERVICES. If you know your service key, you can access the
    // service credentials directly by using the vcapServices object.
    for (var vcapService in vcapServices) {
        if (vcapService.match(/cloudant/i)) {
            return vcapServices[vcapService][0].credentials.url;
        }
    }
}

function initDBConnection() {
    if (process.env.VCAP_SERVICES) {
        dbCredentials.url = getDBCredentialsUrl(process.env.VCAP_SERVICES);
    } else {

        dbCredentials.url = getDBCredentialsUrl(fs.readFileSync("vcap-local.json", "utf-8"));
    }

    cloudant = require('cloudant')(dbCredentials.url);

    // check if DB exists if not create
    cloudant.db.create(dbCredentials.dbName, function (err, res) {
        if (err) {
            console.log('No need to create new db: ' + dbCredentials.dbName + ', it already exists.');
        }
    });

    db = cloudant.use(dbCredentials.dbName);
}

initDBConnection();

// End of cloudant default actions


//Starts when the app starts

db = cloudant.use(dbCredentials.dbName);
db.list(function (err, body) {
    if (!err) {
        var len = body.rows.length;
        console.log('total # of docs -> ' + len);
        if (len == 0) {
            //             push sample data
            db.insert({
                name: 'Users',
                users: {
                    1: {
                        username: 'teste',
                        password: 'sample',
                        accounts: {
                            accountName: 'ignore',
                            accountPassword: 'ignore'
                        }
                    }
                }

            }, '', function (err, doc) {
                if (err) {
                    console.log(err);
                } else {
                    console.log('Document : ' + JSON.stringify(doc));
                }
            });
        } else {
            var doc = body.rows[0];
            db.get(doc.id, {
                revs_info: true
            }, function (err, doc) {
                DOCUMENT_ID = doc['_id'];
                console.log(DOCUMENT_ID);
            })
        }

    } else {
        console.log(err);
    }
});


// Crypto functions 

function encrypt(text) {
    var cipher = crypto.createCipher(algorithm, password)
    var crypted = cipher.update(text, 'utf8', 'hex')
    crypted += cipher.final('hex');
    return crypted;
}

function decrypt(text) {
    var decipher = crypto.createDecipher(algorithm, password)
    var dec = decipher.update(text, 'hex', 'utf8')
    dec += decipher.final('utf8');
    return dec;
}


http.createServer(app).listen(app.get('port'), '0.0.0.0', function () {
    console.log('Express server listening on port ' + app.get('port'));
});
