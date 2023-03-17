import { db } from '../db.js';

// SHOW LOCATIONS FOR PARTICULAR CAR
export const carLocations = async (req, res) => {
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
};
