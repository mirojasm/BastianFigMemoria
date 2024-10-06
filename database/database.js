const mysql = requiere('mysql');

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_HOST,
    password: process.env.DB_PASS,
    database: process.env.DB_DATABASE

});
// esto quedo pendiente ahora vere la página como evoluciona (login) (minuto 7:22)
connection.connect((error)=>{
    if(error){
        console.log('El error de conecxión es:' + error);
        return;
    }
    console.log('Conectado a la bdd!');

})
module.exports = connection;