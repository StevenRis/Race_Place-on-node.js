import { db } from '../db.js';
import bcrypt from 'bcrypt';

// REGISTER
export const registerGet = (req, res) => {
  const pageTitle = 'Register';
  const user = req.session.user;
  res.render('register', {
    pageTitle: pageTitle,
    user: user,
  });
};

export const registerPost = async (req, res) => {
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
      res.redirect('/register');
      return;
    }
    // Check the password and confirmation password are the same
    // if not - display error message
    if (password != confirmPassword) {
      req.flash('error', 'Passwords are not the same');
      res.redirect('/register');
      return;
    }
    // Add new user to the database
    db.run(
      'INSERT INTO users (username, hash) VALUES (?, ?)',
      [username, hashedPassword],
      (err) => {
        if (err) {
          req.flash('error', 'Error creating user');
          res.redirect('/register');
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
};
