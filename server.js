import express from 'express';
import bodyParser from 'body-parser';
import flash from 'express-flash';
import session from 'express-session';

// Import Routes
import homeRoute from './routes/home.js';
import carsRoute from './routes/cars.js';
import authRoutes from './routes/auth.js';
import regRoutes from './routes/register.js';
import resetRoutes from './routes/passwordReset.js';
import favSetupsRoute from './routes/favSetups.js';
import locationsRoute from './routes/locations.js';
import addToFavRoute from './routes/addToFav.js';
import accountRoutes from './routes/account.js';
import carLocationsRoute from './routes/carLocations.js';
import carSetupRoute from './routes/carSetup.js';

const app = express();
const port = process.env.PORT || 80;

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(flash());

// Session
app.use(
  session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }, // 1 week
  })
);

// Routes
app.use('/', homeRoute);
app.use('/cars', carsRoute);
app.use('/', carLocationsRoute); // route = '/cars/:model'
app.use('/', carSetupRoute); // route = '/cars/:model/:location'
app.use('/add-to-favorites', addToFavRoute);
app.use('/locations', locationsRoute);
app.use('/register', regRoutes);
app.use('/login', authRoutes);
app.use('/logout', authRoutes);
app.use('/password_reset', resetRoutes);
app.use('/', favSetupsRoute); // route = '/account/favorite_setup/:setup_id/:model/:location'
app.use('/account', accountRoutes);

app.listen(port, () => {
  console.log(`server is running: localhost:${port}`);
});
