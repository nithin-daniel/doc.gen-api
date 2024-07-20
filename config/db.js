
const mongoose = require('mongoose');

module.exports = {

    connect: () => {
        mongoose.connect(process.env.MONGO_URL)
        .then(() => {
            console.log("--- Connected to MongoDB Atlas\n");
        }).catch((error) => {
            console.log(error);
        });
    },

    collection: (name) => {
        return mongoose.connection.db.collection(name);
    }

};