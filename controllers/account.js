import { db } from '../db.js';

// USER ACCOUNT
export const accountGet = async (req, res) => {
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
};

export const accountPost = (req, res) => {
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
};
