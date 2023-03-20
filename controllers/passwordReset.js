import { db } from '../db.js';
import bcrypt from 'bcrypt';

// RESET PASSWORD
export const resetGet = (req, res) => {
  const pageTitle = 'Password reset';
  const user = req.session.user;
  res.render('passwordReset', {
    pageTitle: pageTitle,
    user: user,
  });
};

export const resetPost = async (req, res) => {
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
};
