const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `
    SELECT 
    *
    FROM 
        user
    WHERE 
        username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    const createUser = `
        INSERT INTO 
           user (username,name,password,gender,location)
        VALUES (
            '${username}',
            '${name}',
           ' ${hashedPassword}',
           ' ${gender}',
           ' ${location}'
        )`;
    await db.run(createUser);
    response.send("User created successfully");
  } else if (password.length <= 5) {
    response.status(400);
    response.send("Password is too short");
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `
    SELECT *
    FROM user
    WHERE username = '${username}';
    `;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatch = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatch === true) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const checkUserQuery = `
    SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(checkUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("User not registered");
  } else {
    const isValidPassword = await bcrypt.compare(oldPassword, dbUser.password);
    if (isValidPassword === true) {
      const lengthOfNewPass = newPassword.length;
      if (lengthOfNewPass < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const encryptedPass = await bcrypt.hash(newPassword, 10);
        const updatePass = `
                UPDATE user 
                SET password = '${encryptedPass}'
                WHERE username = '${username}'
                `;
        await db.run(updatePass);
        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
