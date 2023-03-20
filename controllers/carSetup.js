import { db } from '../db.js';

// SHOW SETUPS FOR PARTICULAR CAR
export const carSetup = async (req, res) => {
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
};
