const express = require('express');
const bodyParser = require('body-parser');
const flash = require('express-flash');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('database.db');
const app = express();
const port = process.env.PORT || 8080;

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

//
// ROUTES
//
// HOME
app.get('/', (req, res) => {
  const pageTitle = 'Home page';
  const user = req.session.user;
  res.render('home', { pageTitle: pageTitle, user: req.session.user });
});

// CARS
app.get('/cars', async (req, res) => {
  const pageTitle = 'Vehicles';
  try {
    const cars = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM cars', (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
    res.render('cars', {
      pageTitle: pageTitle,
      user: req.session.user,
      cars: cars,
    });
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

// SHOW LOCATIONS FOR PARTICULAR CAR
app.get('/cars/:model', async (req, res) => {
  const carModel = req.params.model;
  let pageTitle = '';

  try {
    const car = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM cars WHERE model=?', [carModel], (err, row) => {
        if (err) reject(err);
        resolve(row[0]);
      });
    });

    const carId = car.id;

    const carLocations = await new Promise((resolve, reject) => {
      db.all(
        'SELECT DISTINCT locations.id AS location_id, location_name, location_image FROM locations INNER JOIN setups ON locations.id=setups.locations_id INNER JOIN cars ON cars.id=setups.cars_id WHERE cars_id IN (SELECT id FROM cars WHERE id=?)',
        [carId],
        (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        }
      );
    });

    pageTitle = `${car.brand} ${car.model}`;

    res.render('carLocations', {
      pageTitle: pageTitle,
      user: req.session.user,
      car: car,
      carLocations: carLocations,
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'An error occurred.');
    res.redirect('/cars');
  }
});

// SHOW SETUPS FOR PARTICULAR CAR
app.get('/cars/:model/:location', async (req, res) => {
  const carModel = req.params.model;
  const carLocation = req.params.location;
  const user = req.session.user;

  try {
    const car = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM cars WHERE model=?', [carModel], (err, row) => {
        if (err) reject(err);
        resolve(row[0]);
      });
    });

    const location = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM locations WHERE location_name=?',
        [carLocation],
        (err, row) => {
          if (err) reject(err);
          resolve(row[0]);
        }
      );
    });

    const carId = car.id;
    const locationId = location.id;

    const carLocations = await new Promise((resolve, reject) => {
      db.all(
        'SELECT location_name FROM locations INNER JOIN setups ON locations.id=setups.locations_id WHERE setups.locations_id IN (SELECT id FROM locations WHERE id=?)',
        [locationId],
        (err, rows) => {
          if (err) reject(err);
          resolve(rows[0]);
        }
      );
    });

    const carSetups = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM setups WHERE cars_id=? and locations_id=?',
        [carId, locationId],
        (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        }
      );
    });

    const pageTitle = `${car.brand} ${car.model} ${carLocations.location_name}`;

    res.render('carSetup', {
      pageTitle: pageTitle,
      user: user,
      car: car,
      setups: carSetups,
      locations: carLocations,
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'An error occurred.');
    res.redirect('/cars');
  }
});

// ADD SETUP TO FAVORITE
app.post('/add-to-favorites', async (req, res) => {
  const setupId = req.body.setupId;

  try {
    const userId = req.session.user.id;
    const setupExists = await new Promise((resolve, reject) => {
      db.get(
        'SELECT EXISTS (SELECT 1 FROM favorite_setups WHERE user_id=? and setup_id=?)',
        [userId, setupId],
        (err, row) => {
          if (err) reject(err);
          resolve(Object.values(row)[0]); // Extract the first value of the first row
        }
      );
    });

    if (setupExists === 0) {
      db.run(
        'INSERT INTO favorite_setups (user_id, setup_id) VALUES (?, ?)',
        [userId, setupId],
        (err) => {
          if (err) {
            req.flash('error', 'Error occured.');
            res.redirect('/cars');
          } else {
            req.flash('success', 'Setup was added to favorites.');
            res.redirect('back');
          }
        }
      );
    } else {
      req.flash('error', 'You already have this setup.');
      res.redirect('back');
    }
  } catch (err) {
    console.error(err);
    req.flash('error', 'An error occurred.');
    res.redirect('/cars');
  }
});

// SHOW LOCATIONS
app.get('/locations', (req, res) => {
  const pageTitle = 'Locations';
  const user = req.session.user;

  db.all('SELECT * FROM locations', (err, locations) => {
    if (err) return console.err(err);
    res.render('locations', {
      pageTitle: pageTitle,
      locations: locations,
      user: user,
    });
  });
});

// REGISTER
app.get('/register', (req, res) => {
  const pageTitle = 'Register';
  const user = req.session.user;
  res.render('register', {
    pageTitle: pageTitle,
    user: user,
  });
});

app.post('/register', async (req, res) => {
  const { username, password, confirmPassword } = req.body;

  // Hash password using bcrypt
  const hashedPassword = await bcrypt.hash(password, 10);

  // Check if username already exists in database
  try {
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE username=?', [username], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    // If user already exists, display flash message and redirect to register page
    if (existingUser) {
      req.flash('error', 'Username already exists');
      res.redirect('register');
      return;
    }
    // Check the password and confirmation password are the same
    // if not - display error message
    if (password != confirmPassword) {
      req.flash('error', 'Passwords are not the same');
      res.redirect('register');
      return;
    }
    // Add new user to the database
    db.run(
      'INSERT INTO users (username, hash) VALUES (?, ?)',
      [username, hashedPassword],
      (err) => {
        if (err) {
          req.flash('error', 'Error creating user');
          res.redirect('register');
        } else {
          req.flash('success', 'Registration successful.');
          res.redirect('/login');
        }
      }
    );
  } catch (err) {
    console.error(err);
    req.flash('error', 'An error occurred.');
    res.redirect('register');
  }
});

// SIGN IN
app.get('/login', (req, res) => {
  const pageTitle = 'Sign in';
  const user = req.session.user;

  res.render('login', {
    pageTitle: pageTitle,
    user: user,
  });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE username = ?',
        [username],
        (err, row) => {
          if (err) reject(err);
          resolve(row);
        }
      );
    });

    if (!user) {
      req.flash('error', 'Invalid username.');
      return res.redirect('login');
    }

    const comparePasswords = await bcrypt.compare(password, user.hash);
    if (!comparePasswords) {
      req.flash('error', 'Invalid password.');
      return res.redirect('login');
    }
    req.session.user = user;
    req.flash('success', 'Log in successful.');
    res.redirect('/');
  } catch (err) {
    console.error(err);
    req.flash('error', 'An error occurred.');
    res.redirect('login');
  }
});

// RESET PASSWORD
app.get('/password_reset', (req, res) => {
  const pageTitle = 'Password reset';
  const user = req.session.user;
  res.render('passwordReset', {
    pageTitle: pageTitle,
    user: user,
  });
});

app.post('/password_reset', async (req, res) => {
  const { username, password, confirmPassword } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE username=?', [username], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    // If user already exists, display flash message and redirect to register page
    if (!existingUser) {
      req.flash('error', 'There is no such user or username is incorrect');
      res.redirect('password_reset');
      return;
    }

    const userId = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id FROM users WHERE username=?',
        [username],
        (err, row) => {
          if (err) reject(err);
          resolve(row.id);
        }
      );
    });

    if (password != confirmPassword) {
      req.flash('error', 'Passwords are not the same');
      res.redirect('password_reset');
      return;
    }

    db.run(
      'UPDATE users SET hash=? WHERE id=?',
      [hashedPassword, userId],
      (err) => {
        if (err) {
          req.flash('error', 'Error reseting password');
          res.redirect('reset_password');
        } else {
          req.flash('success', 'Password reset was successful.');
          res.redirect('/login');
        }
      }
    );
  } catch (err) {
    console.error(err);
    req.flash('error', 'An error occurred.');
    res.redirect('reset_password');
  }
});

// LOGOUT
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// USER ACCOUNT
app.get('/account', async (req, res) => {
  const pageTitle = 'My Account';
  const user = req.session.user;
  try {
    const userId = req.session.user.id;
    const showFavoriteSetups = await new Promise((resolve, reject) => {
      db.all(
        'SELECT user_id, setup_id, surface, tyres, conditions, brand, model, car_image, location_name, location_image FROM setups INNER JOIN favorite_setups ON setups.id=favorite_setups.setup_id INNER JOIN cars ON cars.id=setups.cars_id INNER JOIN locations ON locations.id=setups.locations_id INNER JOIN users ON users.id=favorite_setups.user_id WHERE user_id IN (SELECT id FROM users WHERE id=?)',
        [userId],
        (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        }
      );
    });
    res.render('account', {
      pageTitle: pageTitle,
      user: user,
      setups: showFavoriteSetups,
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'An error occurred.');
    res.redirect('login');
  }
});

app.post('/account', (req, res) => {
  const { user_id, setup_id } = req.body;
  db.run(
    'DELETE FROM favorite_setups WHERE user_id=? AND setup_id=?',
    [user_id, setup_id],
    (err) => {
      if (err) return console.error(err);
      req.flash('success', 'Setup was deleted.');
      res.redirect('account');
    }
  );
});

// SHOW FAVOURITE SETUP
app.get(
  '/account/favorite_setup/:setup_id/:model/:location',
  async (req, res) => {
    const { model, location, setup_id } = req.params;

    try {
      const car_id = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM cars WHERE model=?', [model], (err, row) => {
          if (err) reject(err);
          resolve(row.id);
        });
      });

      const location_id = await new Promise((resolve, reject) => {
        db.get(
          'SELECT id FROM locations WHERE location_name=?',
          [location],
          (err, row) => {
            if (err) reject(err);
            resolve(row.id);
          }
        );
      });

      const car = await new Promise((resolve, reject) => {
        db.get(
          'SELECT brand, model, class FROM cars INNER JOIN setups ON cars.id=setups.cars_id WHERE setups.cars_id IN (SELECT id FROM cars WHERE id=?)',
          [car_id],
          (err, rows) => {
            if (err) reject(err);
            resolve(rows);
          }
        );
      });

      const locations = await new Promise((resolve, reject) => {
        db.get(
          'SELECT location_name FROM locations INNER JOIN setups ON locations.id=setups.locations_id WHERE setups.locations_id IN (SELECT id FROM locations WHERE id=?)',
          [location_id],
          (err, rows) => {
            if (err) reject(err);
            resolve(rows);
          }
        );
      });

      const car_setups = await new Promise((resolve, reject) => {
        db.all('SELECT * FROM setups WHERE id=?', [setup_id], (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        });
      });

      res.render('carSetup', {
        pageTitle: 'setup',
        user: req.session.user,
        car: car,
        locations: locations,
        model: model,
        setups: car_setups,
      });
    } catch (err) {
      console.error(err);
      req.flash('error', 'An error occurred.');
      res.redirect('/account');
    }
  }
);

app.listen(port, () => {
  console.log(`server is running on ${port}`);
});
