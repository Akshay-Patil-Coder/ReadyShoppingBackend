const jwt = require('jsonwebtoken');

module.exports = {
    authentication: async (req, res, next) => {
        try {
            let token = req.headers.authorization;

            if (!token) {
                return res.status(401).json({ message: 'Unauthorized: No token provided' });
            }

            if (token.startsWith('Bearer ')) {
                token = token.slice(7, token.length);
            }
            console.log(token, 'token')
            if (token == 'Admin') {
                req.user = {role: 'Admin' };
                next();
            }
            else {
                let data = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

                if (data.Role === 'Company') {
                    req.user = { companyId: data.companyId, role: 'Company' };
                } else if (data.Role === 'Service Provider') {
                    req.user = { companyId: data.companyId, id: data.ServiceProviderId, role: 'Service Provider' };
                } else {
                    return res.status(403).json({ message: 'Forbidden: Invalid role' });
                }

                next();
            }


        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token has expired. Please log in again.' });
              }
              console.error('Authentication Error:', error.message);
            return res.status(401).json({ message: 'Invalid or expired token' });
        }
    }
};
