export default (err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    msg: err.message || 'Server Error'
  });
};
