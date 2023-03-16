import { db } from '../db.js';
import bcrypt from 'bcrypt';

// SIGN IN
export const loginGet = (req, res) => {
  const pageTitle = 'Sign in';
  const user = req.session.user;

  res.render('login', {
    pageTitle: pageTitle,
    user: user,
  });
};

export const loginPost = async (req, res) => {
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
};
