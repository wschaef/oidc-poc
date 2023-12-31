const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/static/index.html');
});

app.listen(port, () => {
    console.log(`Express app listening at http://localhost:${port}`);
});

app.get('/session', (req, res) => {
    res.send(req.session);
});
