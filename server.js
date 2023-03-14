const express = require('express');
const bodyParser = require('body-parser');
const flash = require('express-flash');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

const app = express();
const port = 8080;

// Connect session module
const login_required = require(__dirname + '/session.js');

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

// ROUTES
// HOME
app.get('/', (req, res) => {
  if (login_required) {
    res.render('home', { pageTitle: 'Home', user: req.session.user });
  }
});

// CARS
app.get('/cars', async (req, res) => {
  try {
    const cars = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM cars', (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
    if (login_required) {
      res.render('cars', {
        pageTitle: 'Vehicles',
        user: req.session.user,
        cars: cars,
      });
    }
  } catch (err) {
    console.error(err);
    // req.flash('error', 'An error occurred.');
    res.redirect('/');
  }
});

// SHOW LOCATIONS FOR PARTICULAR CAR
app.get('/cars/:model', async (req, res) => {
  const car_model = req.params.model;

  try {
    const car = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM cars WHERE model=?', [car_model], (err, row) => {
        if (err) reject(err);
        resolve(row[0]);
      });
    });

    const car_id = car.id;

    const car_locations = await new Promise((resolve, reject) => {
      db.all(
        'SELECT DISTINCT locations.id AS location_id, location_name, location_image FROM locations INNER JOIN setups ON locations.id=setups.locations_id INNER JOIN cars ON cars.id=setups.cars_id WHERE cars_id IN (SELECT id FROM cars WHERE id=?)',
        [car_id],
        (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        }
      );
    });

    const pageTitle = `${car.brand} ${car.model}`;

    res.render('car-locations', {
      pageTitle: pageTitle,
      user: req.session.user,
      car: car,
      car_locations: car_locations,
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'An error occurred.');
    res.redirect('/cars');
  }
});

// SHOW SETUPS FOR PARTICULAR CAR
app.get('/cars/:model/:location', async (req, res) => {
  const car_model = req.params.model;
  const car_location = req.params.location;

  console.log(car_model);

  try {
    const car = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM cars WHERE model=?', [car_model], (err, row) => {
        if (err) reject(err);
        resolve(row[0]);
      });
    });

    const location = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM locations WHERE location_name=?',
        [car_location],
        (err, row) => {
          if (err) reject(err);
          resolve(row[0]);
        }
      );
    });

    const car_id = car.id;
    const location_id = location.id;

    const car_locations = await new Promise((resolve, reject) => {
      db.all(
        'SELECT location_name FROM locations INNER JOIN setups ON locations.id=setups.locations_id WHERE setups.locations_id IN (SELECT id FROM locations WHERE id=?)',
        [location_id],
        (err, rows) => {
          if (err) reject(err);
          resolve(rows[0]);
        }
      );
    });

    const car_setups = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM setups WHERE cars_id=? and locations_id=?',
        [car_id, location_id],
        (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        }
      );
    });

    const pageTitle = `${car.brand} ${car.model} ${car_locations.location_name}`;

    res.render('car-setup', {
      pageTitle: pageTitle,
      user: req.session.user,
      car: car,
      setups: car_setups,
      locations: car_locations,
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'An error occurred.');
    res.redirect('/cars');
  }
});

// SHOW LOCATIONS
app.get('/locations', (req, res) => {
  const pageTitle = 'Locations';

  db.all('SELECT * FROM locations', (err, rows) => {
    if (err) return console.log(err);
    if (login_required) {
      res.render('locations', {
        pageTitle: pageTitle,
        locations: rows,
        user: req.session.user,
      });
    } else {
      res.redirect('/');
    }
  });
});

// REGISTER
app.get('/register', (req, res) => {
  res.render('register', {
    pageTitle: 'Register',
    message: req.flash('message'),
    user: req.session.user,
  });
});

app.post('/register', async (req, res) => {
  const { username, password, confirmPassword } = req.body;

  // Check if username or email already exists in database
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

    if (password != confirmPassword) {
      req.flash('error', 'Passwords are not the same');
      res.redirect('register');
      return;
    }

    // Hash password using bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user into database
    db.run(
      'INSERT INTO users (username, hash) VALUES (?, ?)',
      [username, hashedPassword],
      (err) => {
        if (err) {
          req.flash('error', 'Error creating user');
          res.redirect('register');
        } else {
          req.flash('success', 'Registration successful');
          res.redirect('/');
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

  res.render('login', {
    pageTitle: pageTitle,
    user: req.session.user,
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
      req.flash('error', 'Invalid username or password');
      return res.redirect('login');
    }

    const result = await bcrypt.compare(password, user.hash);
    if (!result) {
      req.flash('error', 'Invalid username or password.');
      return res.redirect('login');
    }
    req.session.user = user;
    req.flash('success', 'Log in successful!');
    res.redirect('/');
  } catch (err) {
    console.error(err);
    req.flash('error', 'An error occurred.');
    res.redirect('login');
  }
});

// RESET PASSWORD
app.get('/password_reset', (req, res) => {
  res.render('password_reset', {
    pageTitle: 'Password reset',
    user: req.session.user,
  });
});

app.post('/password_reset', async (req, res) => {
  const { username, password, confirmPassword } = req.body;

  try {
    const user_id = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id FROM users WHERE username=?',
        [username],
        (err, row) => {
          if (err) reject(err);
          resolve(row.id);
        }
      );
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      'UPDATE users SET hash=? WHERE id=?',
      [hashedPassword, user_id],
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
  // req.flash('success', 'You were logged out.');
  res.redirect('/');
});

// USER ACCOUNT
app.get('/account', async (req, res) => {
  const pageTitle = 'My Account';
  try {
    const user_id = req.session.user.id;
    const show_favorite_setups = await new Promise((resolve, reject) => {
      db.all(
        'SELECT user_id, setup_id, surface, tyres, conditions, brand, model, car_image, location_name, location_image FROM setups INNER JOIN favorite_setups ON setups.id=favorite_setups.setup_id INNER JOIN cars ON cars.id=setups.cars_id INNER JOIN locations ON locations.id=setups.locations_id INNER JOIN users ON users.id=favorite_setups.user_id WHERE user_id IN (SELECT id FROM users WHERE id=?)',
        [user_id],
        (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        }
      );
    });
    res.render('account', {
      pageTitle: pageTitle,
      user: req.session.user,
      setups: show_favorite_setups,
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

      res.render('car-setup', {
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
