const pool = require("./db/config");
const bcrypt = require("bcrypt");
const express = require("express");
const jwt = require("jsonwebtoken")
require("dotenv").config();
const auth = require("./middleware/auth");
const app = express();
app.use(express.json()); // middleware to parse all json requests to req.body

// testing purpose
app.use(express.static('public'));
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: './public' });
});


// user login
// verify info on server, then send access token
app.post('/api/user/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM user_info WHERE username = $1',
            [username]
        );
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'User does not exist' })
        }
        if (await bcrypt.compare(password, result.rows[0].password)) {
            const user = result.rows[0]
            // create jwt access token
            const accessToken = jwt.sign(
                { user_id: user.user_id },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '5h' }
            )
            // create jwt refresh token
            const refreshToken = jwt.sign(
                { user_id: user.user_id },
                process.env.REFRESH_TOKEN_SECRET,
                { expiresIn: '7d' }
            )
            // store refresh token in database
            await pool.query(
                /* TODO: create a table like this for refresh tokens. Generated by AI


                CREATE TABLE refresh_tokens (
                    token_id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES user_info(user_id),
                    refresh_token TEXT NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );


                */
                // And check if this is correct
                'INSERT INTO refresh_tokens (user_id, refresh_token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
                [user.user_id, refreshToken]
            )
            res.json({ 
                message: 'Login successful',
                accessToken,
                refreshToken
            })
        } else {
            res.status(401).json({ message: 'Invalid username or password' })
        }
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// refresh access token
app.post('/api/token/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    try {
        if (refreshToken === null) return res.status(401).json({ message: 'Refresh token is required' })
        // verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

        // check if refresh token is valid in database
        const result = await pool.query(
            'SELECT * FROM refresh_tokens WHERE refresh_token = $1 AND user_id = $2 AND expires_at > NOW()',
            [refreshToken, decoded.user_id]
        );
        if (result.rows.length === 0) {
            return res.status(403).json({ message: 'Invalid refresh token' });
        }
        // refresh access token
        const nxtAccessToken = jwt.sign(
            { user_id: decoded.user_id },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '5h'}
        )
        res.json(nxtAccessToken)
    } catch (error) {
        console.error("Can't refresh access token:", error);
        res.status(403).json({ message: "Refreshing access token failed"})
    }
})

// logout, delete refresh token from db
app.post('/api/user/logout', auth, async (req, res) => {
    try {
        const refreshToken = req.body.refreshToken
        await pool.query(
            'DELETE FROM refresh_tokens WHERE refresh_token = $1',
            [refreshToken]
        )
        res.json({ message: 'Logged out successfully' })
    } catch (error) {
        console.error('Logout error:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

// user registration
app.post('/api/user/register', async (req, res) => {
    const { username, password } = req.body
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' })
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10)
        // not sure this is correct 
        const user = await pool.query(
            'INSERT INTO user_info (username, password) VALUES ($1, $2) RETURNING *',
            [username, hashedPassword]
        )
        res.status(201).json({ message: 'User created successfully' })
    } catch (error) {
        console.error('Database error:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

// get user's library
app.get('/api/books/library', auth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT lg.*, lp.book_status 
             FROM library_general lg
             JOIN library_personal lp ON lg.book_id = lp.book_id
             WHERE lp.user_id = $1`,
            [req.user.user_id]
        );
        res.json(result.rows)
    } catch (error) {
        console.error('Database error:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

// TODO: get current reading by adding a 'last-read' field to books

// TODO: implement info section

// TODO: implement recommendation


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));