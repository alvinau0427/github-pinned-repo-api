import express from 'express';

const app = express();
const port = 3000;
app.get('/', (req, res) => {
    res.send("The server is working.");
});
app.listen(port, () => {
    if(port === 3000) {
        console.log("Port number: 3000");
    }
    console.log(`Server is listening on port: ${port}`);
});
