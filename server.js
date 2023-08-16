const express = require("express");

const app = express();
const PORT = 3000;

app.use(express.static("public"));

app.use(express.json);

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
