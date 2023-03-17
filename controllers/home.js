export const home = (req, res) => {
  const pageTitle = 'Home page';
  const user = req.session.user;
  res.render('home', { pageTitle: pageTitle, user: req.session.user });
};
