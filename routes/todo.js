let express = require('express');
let router = express.Router();

const fs = require('fs');

/* GET home page. */
//let todo = new Array(); - не ни е необходим

//Показване на Login форма
router.get('/login', function(req, res) {
	res.render('login', {info: 'Вход в Системата'});
});
//Може да тестваме логин формата --> npm start или nodemon --> http://127.0.0.1:3000/todo/login
//Защо при изпращане на данните от формата възникна грешка?

//Създаване на сесия след успешен Login
session = require('express-session'); //Как да инсталираме и намерим информация за този модул?
router.use(session({
    secret: 'random string',
    resave: true,
    saveUninitialized: true,
}));

sqlite3 = require('sqlite3');
db = new sqlite3.Database('todo6.sqlitedb');
db.serialize();
db.run(`CREATE TABLE IF NOT EXISTS todo(
    id INTEGER PRIMARY KEY,
    user TEXT NOT NULL,
    task TEXT,
    status TEXT,
    url TEXT,
    urll TEXT,
    date_created TEXT,
    date_modified TEXT)`
);
db.parallelize();

fileUpload = require('express-fileupload');
router.use(fileUpload());

bcrypt = require('bcryptjs');
users = require('./passwd.json');

router.post('/login', function(req, res){
	bcrypt.compare(req.body.password, users[req.body.username] || "", function(err, is_match) {
		if(err) throw err;
		if(is_match === true) {
			req.session.username = req.body.username;
			req.session.count = 0;
			res.redirect("/todo/");
		} else {
			res.render('login', {warn: 'Грешно потребителско име или парола!'});
		}
	});
});
//Може да тестваме логин формата --> http://127.0.0.1:3000/todo/login

//Logout - унищожаване на сесия
router.get('/logout', (req, res) => {
	req.session.destroy();
	res.redirect("/todo/");
});

//Всеки потребител със собствен файл
//let filename = "";

router.all('*', function(req, res, next) {
	if(!req.session.username) {
		res.redirect("/todo/login");
		return;
	}
	next();
});

router.get('/', function(req, res, next) {
	req.session.count++;
	s = "Потребител: " + req.session.username;

	//res.render('todo', { info: s, todo: todo });
	db.all('SELECT * FROM todo ORDER BY date_modified DESC;', function(err, rows) {
		if(err) throw err;
		res.render('todo', { info: s, rows: rows });
});
});

//CREATErud + Picture upload
router.post('/upload',(req, res) => {
    url = "";
    urll = "";
    if(req.files && req.files.file) {
        req.files.file.mv('./public/images/' + req.files.file.name, (err) => {
            if (err) throw err;
        });
        url = '/images/' + req.files.file.name;
        urll = '/images/' + req.files.file.name;
    }

    db.run(`
        INSERT INTO todo(
            user,
            task,
            url,
            date_created,
            date_modified
        ) VALUES (
            ?,
            ?,
            ?,
            DATETIME('now','localtime'),
            DATETIME('now','localtime'));
        `,
        [req.session.username, req.body.task || "", url],
        (err) => {
            if(err) throw err;
            res.redirect('/todo/');
        });
});


//cruDELETE
router.post('/delete', (req, res) => {
	db.all('SELECT * FROM todo WHERE id = ? AND user = ?;', req.body.id, req.session.username, function(err, rows) {
		if(err) throw err;
		if(rows.length > 0) {
			db.run('DELETE FROM todo WHERE id = ?', req.body.id, (err) => {
				if(err) throw err;
				res.redirect('/todo/');
			});
		} else {
			db.all('SELECT * FROM todo ORDER BY date_modified DESC;', function(err, rows) {
				if(err) throw err;
				res.render('todo', {user: req.session.username, info: 'Отказан Достъп!!!', rows: rows})
			});
		};
	});	
});

//crUPDATEd
router.post('/update', (req, res) => {
	db.all('SELECT * FROM todo WHERE id = ? AND user = ?;', req.body.id, req.session.username, function(err, rows) {
		//if(err) throw err;
		if(rows.length > 0) {
            db.run(`UPDATE todo
            SET user = ?,
                task = ?,
                status = ?,
                url = ?,
                urll = ?,
                date_modified = DATETIME('now','localtime')
            WHERE id = ?;`,
        req.session.username,
        req.body.task,
        req.body.status,
        req.body.url,
        req.body.urll,
        req.body.id,
        (err) => {
            if(err) throw err;
            res.redirect('/todo/');
            //res.render('todo', {rows: rows})
    });
		} else {
			db.all('SELECT * FROM todo ORDER BY date_modified DESC;', function(err, rows) {
				if(err) throw err;
				res.render('todo', {user: req.session.username, info: 'Отказан Достъп!!!', rows: rows})
			});
		};
	});
});



router.all('*', function(req, res) {
    res.send("No such page or action! Go to: <a href='/todo/'>main page</a>");
});
module.exports = router;
