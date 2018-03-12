var express = require('express');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var path = require('path');
var exphbs = require('express-handlebars');
var expressValidator = require('express-validator');
var flash = require('connect-flash');
var session = require('express-session');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var WebSocket = require('ws');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var helmet = require('helmet');

// Init MongoDB Connect
mongoose.connect('mongodb://admin:admin@ds245228.mlab.com:45228/testnodejsheroku');
var db = mongoose.connection;

// Set Routes
var routes = require('./routes/index');
var users = require('./routes/users');

// Vars
var currenciesData;
var averageData = [];
var initStatus = 0;
var generateAvarage = 0;
var intervalvar;
var ws;
var socketClient;

// Init App
var app = express();

// Vars - must be after var app = express()
var server = require('http').createServer(app);
var io = require('socket.io')(server);

// Content Security Policy Middleware
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    connectSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    frameSrc: ["'none'"],
    imgSrc: ['data:'],
  },
  setAllHeaders: false
}))

// View Engine Handlebars
app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', exphbs({defaultLayout:'layout'}));
app.set('view engine', 'handlebars');

// BodyParser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Set Static Folder
app.use(express.static(path.join(__dirname, 'public')));

// Express Session
app.use(session({
    secret: 'secret',
    saveUninitialized: true,
    resave: true
}));

// Passport init
app.use(passport.initialize());
app.use(passport.session());

// Express Validator
app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
      var namespace = param.split('.')
      , root    = namespace.shift()
      , formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    } return {
      param : formParam,
      msg   : msg,
      value : value
    };
  },
  customValidators:{
      isLoginAvailable(login){
        return new Promise((resolve, reject) => {
          User.findOne({ login: login }, (err, user) => {
            if (err) throw err;
            if(user == null) {
              resolve();
            } else {
              reject();
            }
          });
        });
      }
    }
}));

// Connect Flash
app.use(flash());

// Global Vars
app.use(function (req, res, next){
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  res.locals.curr_data = currenciesData;
  next();
});

// Check var for start functions
if (initStatus === 0){
  wsGetCurrencies();
  intervalvar = setInterval(wsGetCurrencies, 20000);
  initStatus = 1;
}

// Socket.io detect client connection
io.on('connection', function(client){
  client.on('GetAverage', function (){
    doAverageData(currenciesData, client);
    generateAvarage = 1;
    socketClient = client;
  });
  
  client.on('disconnect', function(){

  });
});

// Functions
function wsGetCurrencies(){
  ws = new WebSocket('ws:currencies'); // !IMPORTANT - need link to currencies data (socket)

  ws.on("error", function (err) {
    io.local.emit('WsError');
  });

  ws.on('message', function incoming(data){
    currenciesData = JSON.parse(data);
    currenciesData.PublicationDate = dateFormat(currenciesData.PublicationDate);
    currenciesData = getparsedigit(currenciesData);
    if (generateAvarage != 0){
      doAverageData(currenciesData, socketClient);
    }
    

    io.local.emit('LoadCurrency', JSON.stringify(currenciesData));
  });

  ws.on('open', function open(){
    ws.close();
  });
}

function getparsedigit(data){
  for(var i = 0; i < data.Items.length;i++){
    data.Items[i].SellPrice = data.Items[i].SellPrice.toFixed(2);
    data.Items[i].PurchasePrice = data.Items[i].PurchasePrice.toFixed(2);
    data.Items[i].AveragePrice = data.Items[i].AveragePrice.toFixed(2);
  }
  return data;
};

function dateFormat(date){
  date = new Date(date).toISOString().slice(0, 19).replace('T', ' ');
  return date;
};

function doAverageData(data, socket){
  var values = [];
  var values2 = [];
  var dataLenght = averageData.length;

  for(var i = 0; i < data.Items.length;i++){
    values2[i] = { Code: data.Items[i].Code, AveragePrice: data.Items[i].AveragePrice};
  }

  values = {PublicationDate: data.PublicationDate, Currency: values2};

  if(dataLenght != 0){
    if(averageData[dataLenght-1].PublicationDate != data.PublicationDate){
      if(dataLenght < 20){
        averageData.push(values);
        socket.emit('LoadAverage', JSON.stringify(averageData));
      }
      else{
        averageData.shift();
        averageData.push(values);
        socket.emit('LoadAverage', JSON.stringify(averageData));
      }
    }
  }
  else{
    averageData.push(values);
    socket.emit('LoadAverage', JSON.stringify(averageData));
  }
};

// Init Routes
app.use('/', routes);
app.use('/users', users);

// Set Port
app.set('port', (process.env.PORT || 3000));

// Init Server
server.listen(app.get('port'), function(){
	console.log('Server started on port '+app.get('port'));
});