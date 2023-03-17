import { db } from '../db.js';

// SHOW LOCATIONS
export const locations = (req, res) => {
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
};
