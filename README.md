# Hangbank v2
The redesign and final form of the Hangbank project!

Generate a JWT secret (e.g. via <a href="https://jwtsecretkeygenerator.com/">https://jwtsecretkeygenerator.com/</a>) and create two identical .env file into `auth/` and `hangbank_backend/` folders with this content: \
`JWT_SECRET=<paste secret here>`

Start the program with the following command: \
`docker compose up -d --build`