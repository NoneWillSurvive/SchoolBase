// Подключение всех модулей к программе
var express = require('express');
var path = require('path');
var bodyParser = require("body-parser");
const { Pool } = require('pg');
var fs = require('fs');
var pdf = require('html-pdf');
var log4js = require("log4js");
//const ejs = require('ejs');
//const pdfRoute = require('./routes/pdfmake.js');

const imgSrc = "images";

var app = express();

log4js.configure({
  appenders: { log: { type: 'file', filename: 'server.log' } },
    categories: { default: { appenders: ['log'], level: 'debug' } }
});
let logger = log4js.getLogger();

var server = require('http').createServer(app);

app.use(bodyParser.urlencoded({ extended: true }));
//app.use('/pdfMake', pdfRoute);

server.listen(3000);
logger.info("Server is listen on http://localhost:3000/");

function isNumber(n) { return /^-?[\d.]+(?:e-?\d+)?$/.test(n); }

// подключение css файлов
app.get("/styles/style.css", (req,res)=>{
  logger.debug("Try read CSS files: " + __dirname + "/styles/style.css ");
  res.setHeader("Content-Type","text/css")
  res.sendFile(__dirname + '/styles/style.css');
})
app.use(express.static('/styles'));

app.use(express.static(path.join(__dirname, 'public')));

// подключение файлов с картинками

fs.readdir(imgSrc, (err,items) => {
  logger.debug("Try includes IMAGES files: " + __dirname + "/images");
  items.forEach((item, index,array) => {
    if(item.includes(".jpg") || item.includes(".png")|| item.includes(".jpeg")){
      app.get("/images/" + item, (req,res) => {
        res.setHeader("Content-Type", "image/jpg");        
        res.sendFile(__dirname + "/images/" + item);
      })
    }
  })
});

// Отслеживание url адреса и отображение нужной HTML страницы
app.get('/', function(request, respons) {
  respons.sendFile(__dirname + '/public/index.html');
});

try
{
  logger.debug("Try read /baseTeacher page: " + __dirname + '/public/baseTeacher.html');
  app.get('/baseTeacher', function(request, respons) {
    respons.sendFile(__dirname + '/public/baseTeacher.html');
  });
}
catch(err) {
  logger.error("Page: "+ __dirname + '/public/baseTeacher.html ' + "is not finded!");
  console.log(err);
}

try{
  logger.debug("Try read /baseStudent page: " + __dirname + '/public/baseStudent.html');
  app.get('/baseStudent', function(request, respons) {
    respons.sendFile(__dirname + '/public/baseStudent.html');
  });
}
catch(err) {
  logger.error("Page: "+ __dirname + '/public/baseStudent.html ' + "is not finded!");
  console.log(err);
}

try{
  logger.debug("Try read /baseStudent page: " + __dirname + '/public/baseStat.html');
  app.get('/baseStat', function(request, respons) {
    respons.sendFile(__dirname + '/public/baseStat.html');
  });
}
catch(err) {
  logger.error("Page: "+ __dirname + '/public/baseStat.html ' + "is not finded!");
  console.log(err);
}

try{

  logger.info("Try generating PDF...");
  app.get('/genPdf', function(request, respons) {
    let data = fs.readFileSync(__dirname + '/public/pagePdf.html');
    data = data.toString();
    pdf.create(data).toFile("./newpdf.pdf", (err, res) =>{
      if (err) return console.log(err);
      console.log(res);
      respons.sendFile(__dirname + '/newpdf.pdf');
    });
  });
  logger.info("OK. PDF is making: " + __dirname + '/newpdf.pdf');
}
catch(err) {
  console.log(err);
  logger.error("FAIL! PDF is not making!");
}

let d = {
  host: "localhost",
  port: 5432,
  database: "mydb",
  user: "postgres",
  pasword: "postgres"
};
const pool = new Pool(d);

console.log(`${d.database}`);



app.post('/take_all_teachers', (request, response) => {
    //const id = request.params.id;
    //var list1_val = request.body.list;
    //console.log("Вы выбрали: " + list1_val);
    let sql = `select * from teachers`;
    pool.query(sql, (error, result) => {
        if (error) throw error;

        var mes = '';
        let juk = 1;
        //var obj = JSON.parse(result.rows[0][0]);
        //fs.writeFileSync('file.json', obj);

        let data = result.rows;
        data = JSON.stringify(data);
        fs.writeFileSync('teachers.json', data);        

        result.rows.forEach((element) => {
          mes+=`________Учитель ${juk}________\n`;
          for(let ik in element){
            mes+=`${ik}: ${element[ik]} \n`;
          }
          mes +=`\n`;
          juk++;
        });
        fs.writeFileSync('write.txt', mes);

        //console.log(result.rows);
        response.send(result.rows);
    });

});


app.post('/take_teacher_bySecName', (request, response) => {
    //const id = request.params.id;
    let val = request.body.val;
    //console.log(isNumber(val));
    let sql;
    if(isNumber(val)){
       sql = `select * from teachers where teach_id = '${val}'`;
    }
    //console.log("Вы выбрали: " + val);
    else{
       sql = `select * from teachers where sec_name = '${val}'`;
    }

    pool.query(sql, (error, result) => {
        if (error) throw error;

        //console.log(result.rows); // вывод строк из таблиц
        response.send(result.rows);
    });

});

app.post('/redact_teacher', (request, response) => {
    //const id = request.params.id;
    let sec_name = request.body.sec_name;
    let name = request.body.name;
    let child_class = request.body.child_class;
    let subject = request.body.subject;
    let teach_id = request.body.teach_id;

    console.log(`${teach_id} , ${sec_name} , ${name} , ${child_class} , ${subject}`);
    let sql;
       sql = `UPDATE teachers SET name = '${name}' WHERE teach_id = '${teach_id}'; 
       UPDATE teachers SET sec_name = '${sec_name}' WHERE teach_id = '${teach_id}'; 
       UPDATE teachers SET child_class= '${child_class}' WHERE teach_id = '${teach_id}';
       UPDATE teachers SET subject= '${subject}' WHERE teach_id = '${teach_id}';`;
    
    //console.log("Вы выбрали: " + val);

    pool.query(sql, (error, result) => {
        if (error) throw error;

        //console.log(result.rows); // вывод строк из таблиц
        response.send('OK');
    });

});


app.post('/take_students_byClass', (request, response) => {
    
    let val = request.body.val;
    //console.log(isNumber(val));
    let sql = `SELECT * from students WHERE graduate = ${val} ORDER BY sec_name;`;
    pool.query(sql, (error, result) => {
        if (error) throw error;
        var mes = '';
        let juk = 1;
        //var obj = JSON.parse(result.rows[0][0]);
        //fs.writeFileSync('file.json', obj);

        let data = result.rows;
        data = JSON.stringify(data);
        fs.writeFileSync('students.json', data);        

        result.rows.forEach((element) => {
          mes+=`________Ученик ${juk}________\n`;
          for(let ik in element){
            mes+=`${ik}: ${element[ik]} \n`;
          }
          mes +=`\n`;
          juk++;
        });
        fs.writeFileSync('write.txt', mes);
        response.send(result.rows);
    });

});


app.post('/take_student_byID', (request, response) => {
    //const id = request.params.id;
    let val = request.body.val;
    //console.log(isNumber(val));
    let sql;
    if(isNumber(val)){
       sql = `select * from students where stud_id = '${val}';`;
    }
    //console.log("Вы выбрали: " + val);


    pool.query(sql, (error, result) => {
        if (error) throw error;

        var mes = '';
        result.rows.forEach((element) => {
          for(let ik in element){
            mes+=`${ik}: ${element[ik]} \n`;
          }
        });
        fs.writeFileSync('write.txt', mes);
        //console.log(result.rows[0]); // вывод строк из таблиц
        response.send(result.rows);
    });

});

app.post('/redact_student', (request, response) => {
    //const id = request.params.id;
    let sec_name = request.body.sec_name;
    let name = request.body.name;
    let graduate = request.body.graduate;
    let stud_id = request.body.stud_id;

    console.log(`${stud_id} , ${sec_name} , ${name} , ${graduate}`);
    let sql;
       sql = `UPDATE students SET name = '${name}' WHERE stud_id = '${stud_id}'; 
       UPDATE teachers SET sec_name = '${sec_name}' WHERE stud_id = '${stud_id}'; 
       UPDATE teachers SET subject= '${subject}' WHERE stud_id = '${stud_id}';`;
    
    //console.log("Вы выбрали: " + val);

    pool.query(sql, (error, result) => {
        if (error) throw error;

        //console.log(result.rows); // вывод строк из таблиц
        response.send('OK');
    });

});

app.post('/take_ocenki', (request, response) => {
    //const id = request.params.id;
    let val = request.body.val;
    //console.log(isNumber(val));
    let sql;
    if(isNumber(val)){

       sql = `SELECT ocenki.id, ocenki.subject, ocenki.ocenka
              FROM students INNER JOIN ocenki ON students.stud_id = ocenki.id
              WHERE (students.stud_id = '${val}');`;
    }

    pool.query(sql, (error, result) => {
        if (error) throw error;

        //console.log(result.rows); // вывод строк из таблиц
        response.send(result.rows);
    });

});


app.post('/count_stud', (request, response) => {

    let sql = `SELECT Count(students.stud_id)
                FROM students;`;

    pool.query(sql, (error, result) => {
        if (error) throw error;

       //console.log(result.rows); // вывод строк из таблиц
        response.send(result.rows);
    });

});


app.post('/count_teach', (request, response) => {

    let sql = `SELECT Count(teachers.teach_id)
                FROM teachers;`;

    pool.query(sql, (error, result) => {
        if (error) throw error;

        //console.log(result.rows); // вывод строк из таблиц
        response.send(result.rows);
    });

});


app.post('/add_ocenka', (request, response) => {
    //const id = request.params.id;
    let id = request.body.id;
    let subject = request.body.subject;
    let ocenka = request.body.ocenka;

  //  console.log(`${stud_id} , ${sec_name} , ${name} , ${graduate}`);

    let sql = `INSERT INTO ocenki (id, subject, ocenka) VALUES 
              (${id}, '${subject}', ${ocenka});`;
    
    //console.log("Вы выбрали: " + val);

    pool.query(sql, (error, result) => {
        if (error) throw error;

        //console.log(result.rows); // вывод строк из таблиц
        response.send('OK');
    });

});

app.post('/add_student', (request, response) => {
    //const id = request.params.id;
    let graduate = request.body.Tclass;
    let sec_name = request.body.sec_name;
    let name = request.body.name;

  //  console.log(`${stud_id} , ${sec_name} , ${name} , ${graduate}`);

    let sql = `INSERT INTO students (name, sec_name, graduate) VALUES 
               ('${name}', '${sec_name}' ,${graduate});`;
    
    //console.log("Вы выбрали: " + val);

    pool.query(sql, (error, result) => {
        if (error) throw error;

        //console.log(result.rows); // вывод строк из таблиц
        response.send('OK');
    });

});

app.post('/delete_student', (request, response) => {

    let val = request.body.val;
    let sql = `DELETE FROM students WHERE stud_id = ${val};`;

    pool.query(sql, (error, result) => {
        if (error) throw error;

        //console.log(result.rows); // вывод строк из таблиц
        response.send("Ученик удален!");
    });

});


app.post('/timetable_byID', (request, response) => {

  let val = request.body.val;
    //console.log(isNumber(val));
    let sql;
    if(isNumber(val)){

     sql = `SELECT timetable.teach_id, timetable.subject, timetable.day, timetable.numb_lesson, timetable.graduate
     FROM teachers INNER JOIN timetable ON teachers.teach_id = timetable.teach_id
     WHERE (teachers.teach_id = '${val}');`;
   }

   pool.query(sql, (error, result) => {
    if (error) throw error;

        //console.log(result.rows); // вывод строк из таблиц
        response.send(result.rows);
      });

});

app.post('/add_timetable', (request, response) => {

    let teach_id = request.body.id;
    let subject = request.body.subject;
    let day = request.body.day;
    let numb_lesson = request.body.numb_lesson;
    let graduate = request.body.graduate;
    //console.log(isNumber(val));
    
    let sql = `INSERT INTO timetable (teach_id, subject, day, numb_lesson, graduate) VALUES
            (${teach_id}, '${subject}', '${day}', ${numb_lesson}, ${graduate});`;
    

   pool.query(sql, (error, result) => {
    if (error) throw error;

        //console.log(result.rows); // вывод строк из таблиц
        response.send("Запись добавлена");
      });

});

app.post('/add_teacher', (request, response) => {

    let subject = request.body.subject;
    let child_class = request.body.child_class;
    let sec_name = request.body.sec_name;
    let name = request.body.name;
    //console.log(isNumber(val));
    
    let sql = `INSERT INTO teachers (name, sec_name, child_class, subject) VALUES 
            ('${name}', '${sec_name}', ${child_class}, '${subject}');`;
    

   pool.query(sql, (error, result) => {

    if (error) throw error;

        //console.log(result.rows); // вывод строк из таблиц
        response.send("Запись добавлена!");
      });

});

app.post('/delete_teacher', (request, response) => {

  let val = request.body.val;
  let sql = `DELETE FROM teachers WHERE teach_id = ${val};`;

  pool.query(sql, (error, result) => {
    let data;
    if (error) {
      console.log(error);

      data = `Учитель не был удален!`;
    }
    else data = `Учитель удален!`;
        //console.log(result.rows); // вывод строк из таблиц
        response.send(data);
      });

});

app.post('/add_graduate', (request, response) => {

  let graduate = request.body.graduate;

  let sql;
  console.log(isNumber(graduate));
  if(isNumber(graduate))
  {
    sql = `INSERT INTO graduate (graduate) VALUES
    (${graduate});`;
  }


  pool.query(sql, (error, result) => {
    let data;
    if (error) {
      console.log(error);
      //response.send("Класс уже существует!");
      data = `Класс уже существует!`;
    }
    else data = `Класс добавлен!`;
        //console.log(result.rows); // вывод строк из таблиц
        response.send(data);
      });

});



/*
//заполняем учителей
const keka = `INSERT INTO teachers (name, sec_name, child_class, subject) VALUES 
('Михаил',    'Куприянов',   1,   'Физика'),
('Алла',      'Андреева',    2,   'Русский язык'),
('Владимир',  'Жандаров',    3,   'Информатика'),
('Ольга',     'Жирнова',     4,   'Литература'),
('Игорь',     'Зуев',        5,   'История'),
('Павел',     'Колинько',    6,   'Математика'),
('Сергей',    'Лебедев',     7,   'Физкультура'),
('Сергей',    'Миронов',     8,   'Обществознание'),
('Сергей',    'Павлов',      9,   'Физкультура'),
('Михаил',    'Павловский',  10,  'Русский язык'),
('Юлия',      'Перязева',    11,  'Математика')`;


pool.query(keka); 
*/
// заполняем оценки
/*const keka = `INSERT INTO ocenki (id, subject, ocenka) VALUES 
(3, 'Литература', 4),
(3, 'Физика', 3),
(3, 'Русский язык', 4),
(3, 'Информатика', 5),
(1, 'История', 5),
(1, 'Информатика', 5),
(1, 'Физика',4),
(2, 'Литература', 3)`;

pool.query(keka);*/

// заполняем студентов
/*const keka = `INSERT INTO students (name, sec_name, graduate) VALUES 
('Никита', 'Евич' ,6),
('Павел', 'Лунев' ,9),
('Даниил', 'Кириллов' ,10),
('Александр', 'Бобриков' ,6),
('Валерия', 'Пегушина' ,4),
('Анна', 'Волкова' ,2),
('Никита', 'Ефимчик' ,11)`;

pool.query(keka); */


// заполняем классы
/*const keka = `INSERT INTO graduate (graduate) VALUES 
(1),(2),(3),(4),(5),(6,(7),(8),(9),(10),(11);`;

pool.query(keka); 
*/

//const sql_add = `INSERT INTO students VALUES(1, 'Kirill', 'Bogdanov', 11);`
//pool.query(sql_add);



const sql_class = `CREATE TABLE graduate
(
  graduate  NUMERIC PRIMARY KEY
)`;

const sql_subject = `CREATE TABLE subject
(
  subj_name VARCHAR(25) PRIMARY KEY
)`;

const sql_stud = `CREATE TABLE students
(
  stud_id   SERIAL PRIMARY KEY,
  name      VARCHAR(20) NOT NULL,
  sec_name  VARCHAR(20) NOT NULL,
  graduate  NUMERIC REFERENCES graduate (graduate) ON UPDATE CASCADE ON DELETE CASCADE
)`;


const sql_ocenki = `CREATE TABLE ocenki
(
  id          int REFERENCES students (stud_id) ON UPDATE CASCADE ON DELETE CASCADE,
  subject     VARCHAR(20) REFERENCES subject (subj_name) ON UPDATE CASCADE ON DELETE CASCADE,
  ocenka      NUMERIC NOT NULL
)`;


const sql_teach = `CREATE TABLE teachers
(
  teach_id      SERIAL PRIMARY KEY,
  name          VARCHAR(20) NOT NULL,
  sec_name      VARCHAR(20) NOT NULL,
  child_class   NUMERIC NOT NULL,
  subject       VARCHAR(20) REFERENCES subject (subj_name) ON UPDATE CASCADE ON DELETE CASCADE
)`;

const sql_timetable = `CREATE TABLE timetable
(
  teach_id    int REFERENCES teachers (teach_id) ON UPDATE CASCADE ON DELETE CASCADE,
  subject     VARCHAR(20) REFERENCES subject (subj_name) ON UPDATE CASCADE ON DELETE CASCADE,
  day         VARCHAR(20) NOT NULL,
  numb_lesson NUMERIC NOT NULL,
  graduate  NUMERIC REFERENCES graduate (graduate) ON UPDATE CASCADE ON DELETE CASCADE

)`;

function mysql_table_seek()
{

    let sql = pool.query("select * from information_schema.tables where table_schema='public';");

    for(let i in sql){
         console.log(sql[i]);
    }
    console.log(sql);
} 
mysql_table_seek();
/*
  pool.query(sql_class);
  pool.query(sql_subject);
  pool.query(sql_stud);
  pool.query(sql_ocenki);
  pool.query(sql_teach);
  pool.query(sql_timetable);




/*
//заполняем расписание
const keka = `INSERT INTO timetable (teach_id, subject, day, numb_lesson, graduate) VALUES 
(1, 'Физика',          'Понедельник',    1,   10),
(1, 'Физика',          'Понедельник',    5,   6),
(2, 'Русский язык',    'Понедельник',    1,   2),
(2, 'Русский язык',    'Понедельник',    4,   4),
(2, 'Русский язык',    'Понедельник',    5,   11),
(3, 'Информатика',     'Понедельник',    1,   2),
(4, 'Литература',      'Понедельник',    1,   1),
(4, 'Литература',      'Понедельник',    3,   2),
(4, 'Литература',      'Вторник',        1,   2)`;


pool.query(keka); 
*/