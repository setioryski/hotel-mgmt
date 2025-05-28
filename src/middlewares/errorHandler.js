export default (err, req, res, next) => {
  console.error(err);
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(err.statusCode || 500).json({ msg: err.message || 'Server Error' });
  }
  res.status(500).render('error', { user: req.user || null, msg: err.message });
};