import { db } from '../db.js';

// ADD SETUP TO FAVORITE
export const addToFav = async (req, res) => {
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
};
