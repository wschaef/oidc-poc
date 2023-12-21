const express = require('express');
const session = require('express-session');
const { Issuer, generators } = require('openid-client');

const app = express();
const port = 3001;
const idpBaseUrl = 'http://localhost:8080/auth/realms/internal/'; // Replace with your IdP URL
const client_id = 'app-oidc';
const client_secret = 'ZF4pTtaCxvPi65wyZ5IbfVeVMVkojCdF';

// Configure session middleware
app.use(session({
    secret: 'Your-Secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

let client;

// Discover OIDC provider and create a client
Issuer.discover(`${idpBaseUrl}.well-known/openid-configuration`) // Replace with your IdP URL
    .then(issuer => {
        client = new issuer.Client({
            client_id: client_id,
            client_secret: client_secret,
            redirect_uris: ['http://localhost:3001/callback'],
            response_types: ['code']
        });

        // Routes
        app.get('/authenticated', (req, res) => {
            if (req.session.token) {
                res.send('Authenticated');
            } else {
                res.send('Not Authenticated');
            }
        });

        app.get('/', (req, res) => {
            if (req.session.token) {
                res.sendFile(__dirname + '/static/index.html');
            } else {
                res.sendFile(__dirname + '/static/anonymous.html');
            }
        });

        app.get('/login', (req, res) => {
            // Generate a random state
            const state = generators.state();
            req.session.state = state;
            const authUrl = client.authorizationUrl({
                scope: 'openid email profile',
                state: state
            });
            res.redirect(authUrl);
        });

        app.get('/callback', (req, res) => {
            const params = client.callbackParams(req);
            client.callback('http://localhost:3001/callback', params, { state: req.session.state })
                .then(tokenSet => {
                    req.session.token = tokenSet;
                    res.redirect('/');
                }).catch(err => {
                    res.status(500).send(err.message);
                });
        });

        app.get('/userinfo', (req, res) => {
            client.userinfo(req.session.token.access_token)
                .then(userinfo => {
                    res.send(userinfo);
                }).catch(err => {
                    res.status(500).send(err.message);
                });
        });

        app.get('/session', (req, res) => {
            res.json(req.session);
        });

        app.get('/tokens', (req, res) => {
            var access_token = req.session.token.access_token;
            var result = {}
            var header, payload;
            // Split the JWT into its header, payload, and signature
            var parts = access_token.split('.');
            if (parts.length === 3) {
                // Base64 decode and parse the header and payload
                header = JSON.parse(Buffer.from(parts[0], 'base64').toString('utf8'));
                payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));

                // Send the decoded header and payload
                result['access_token'] = { header, payload };
            } else {
                res.status(400).send('Invalid token');
            }
            // Split the JWT into its header, payload, and signature
            var id_token = req.session.token.id_token;
            parts = id_token.split('.');
            if (parts.length === 3) {
                // Base64 decode and parse the header and payload
                header = JSON.parse(Buffer.from(parts[0], 'base64').toString('utf8'));
                payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));

                result['id_token'] = { header, payload };
            } else {
                res.status(400).send('Invalid token');
            }
            res.json(result);
        });

        app.get('/logout', (req, res) => {
            req.session.destroy();
            res.redirect('/');
        });

        app.listen(port, () => {
            console.log(`Express app listening at http://localhost:${port}`);
        });
    });
