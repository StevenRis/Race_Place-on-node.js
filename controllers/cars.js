import { db } from '../db.js';

export const cars = async (req, res) => {
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
};
