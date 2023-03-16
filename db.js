// const sqlite3 = require('sqlite3').verbose();
import sqlite3 from 'sqlite3';
export const db = new sqlite3.Database('database.db');

// db.run(
//   'CREATE TABLE user (id INTEGER PRIMARY KEY, username TEXT, password TEXT)'
// );

// const password = 'updated2';
// const user_id = 'Boby';

// db.run('UPDATE users SET hash=? WHERE username=?', [password, user_id]);
// db.run('DROP TABLE user');
