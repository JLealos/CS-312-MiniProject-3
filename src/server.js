const app = require('./app');

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Local Blog is running at http://localhost:${port}`);
});