// invocar a express
const express = require('express');
const app = express();

// setear los datos para capturar los datos de los formularios
app.use(express.urlencoded({extended:false}));
app.use(express.json());

// invocar a dotenv variables de entorno
const dotenv = require('dotenv');
dotenv.config({path:'./env/.env'});

// directorio public
app.use('/resources', express.static('public'));
app.use('resources', express.static(__dirname + '/public'))
console.log(__dirname);

// motor de plantillas 
app.set('view engine', 'ejs');

// invocamos a bcryptjs
const bcryptjs = require('bcryptjs');
// variables de session
const session = require('express-session');
app.use(session({
    secret:'secret',
    resave:true,
    saveUnitialized:true
}));
app.get('/',(req,res)=>{
    res.render('index/index')
})
app.get('/login',(req,res)=>{
    res.render('login/login')
})

app.listen(3000, (req, res)=>{
    console.log('Servidor ya escuchando en el 3000 https://localhost:3000');

})