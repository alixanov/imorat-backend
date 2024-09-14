const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// JWT (Json Web Token) китобхонасини юклаш
const jwt = require("jsonwebtoken");
const { type } = require('os');
const bcrypt = require('bcrypt');
// Экспресс иловасини ишга туширамиз
const app = express();


// CORS'ни улаш, турли доменлардан сўровларга рухсат беради
app.use(cors());
app.use(bodyParser.json()); // JSON форматдаги маълумотларни қабул қилишга тайёрлаш
// "uploads" папкасини статик қилиб қўйиш, яъни файлларни интернетдан кўриш мумкин бўлади
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// MongoDB билан боғланиш
mongoose.connect('mongodb+srv://alikhanov13:8ejWWGGweheMXHC8@cluster0.zltuj21.mongodb.net/', { useNewUrlParser: true, useUnifiedTopology: true })
     .then(() => console.log('Connected to MongoDB'))
     .catch(err => console.error('Could not connect to MongoDB', err));

// MongoDB билан боғланишни кузатиб бориш
const db = mongoose.connection;
db.on('error', (error) => console.error('MongoDB билан боғланишда хатолик:', error));
db.once('open', () => {
     console.log('MongoDB муваффақиятли уланди');
});

// MongoDB учун схема тайёрлаймиз, у маълумотларни қандай сақлашни аниқлайди
const homeAddingSchema = new mongoose.Schema({
     category: { type: String, required: true },  // Категория майдони
     contacts: { type: String, required: true },  // Контактлар майдони
     details: { type: String, required: true },  // Тафсилотлар майдони
     images: { type: [String], required: true },  // Расмлар учун массив (бир неча расм сақланади)
     mobilecontact:{ type: Number, required: true },//Телефон ракам киритиш
     location: { type: String, required: true },  // Жойлашув майдони
     price: { type: String, required: true },  // Нархи майдони
});
//MongoDb дан регистрация малумотларини саклаш учун
const userSchema = new mongoose.Schema({
     login: { type: String, required: true, unique: true },
     password: { type: String, required: true },
});
//
const HomeAdding = mongoose.model('HomeAdding', homeAddingSchema); // Создание модели на основе схемы

//
const User = mongoose.model('User', userSchema);
//
const authMiddleware = (req, res, next) => {
     const token = req.headers.authorization?.split(' ')[1];
     if (!token) {
          return res.status(401).json({ message: 'Нет доступа' });
     }

     try {
          const decoded = jwt.verify(token, 'секретный_ключ'); // Используем тот же ключ
          req.userId = decoded.userId;
          next();
     } catch (error) {
          return res.status(401).json({ message: 'Неверный токен' });
     }
};
//

app.post('/register', async (req, res) => {
     try {
          const { login, password } = req.body;
          if (!login || !password) {
               return res.status(400).json({ message: 'Не все поля заполнены' });
          }
          const existingUser = await User.findOne({ login });

          if (existingUser) {
               return res.status(400).json({ message: 'Логин уже используется' });
          }

          const hashedPassword = await bcrypt.hash(password, 10);
          const newUser = new User({
               login,
               password: hashedPassword,
          });

          await newUser.save();
          res.status(201).json({ message: 'Пользователь успешно зарегистрирован' });
     } catch (error) {
          res.status(500).json({ error: 'Ошибка сервера' });
     }
});
;
// Пример защищённого маршрута
app.get('/protected', authMiddleware, (req, res) => {
     res.json({ message: 'Это защищённый маршрут', userId: req.userId });
});


// Multer файлларни юклашни бошқариш учун ишлатилади
const storage = multer.diskStorage({
     destination: (req, file, cb) => {
          cb(null, 'uploads');  // Файлларни "uploads" папкасига юклаймиз
     },
     filename: (req, file, cb) => {
          cb(null, Date.now() + path.extname(file.originalname));  // Файлларга уникал ном бериш
     },
});

// Файлларни қабул қилиш учун Multer конфигурацияси
const upload = multer({
     storage: storage,
     limits: { fileSize: 1000000 },  // Файл ҳажми 1MB билан чегараланган
     fileFilter: (req, file, cb) => {
          const fileTypes = /jpeg|jpg|png|jfif/;  // Қабул қилинган файл турлари
          const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
          const mimetype = fileTypes.test(file.mimetype);

          if (extname && mimetype) {
               cb(null, true);
          } else {
               cb('Хатолик: Фақат JPEG, JPG, PNG файлларини юклаш мумкин');
          }
     },
});


app.post('/login', async (req, res) => {
     try {
          const { login, password } = req.body;

          // Ищем пользователя по логину
          const user = await User.findOne({ login });
          if (!user) {
               return res.status(401).json({ message: 'Неправильный логин или пароль' });
          }

          // Проверяем пароль
          const isPasswordValid = await bcrypt.compare(password, user.password);
          if (!isPasswordValid) {
               return res.status(401).json({ message: 'Неправильный логин или пароль' });
          }

          // Создаем JWT-токен
          const token = jwt.sign({ userId: user._id }, 'секретный_ключ', { expiresIn: '7d' });

          res.status(200).json({ token });
     } catch (error) {
          res.status(500).json({ error: 'Ошибка сервера' });
     }
});
// Эълонларни юклаш йўли
app.post('/add-home', upload.array('images', 8), async (req, res) => {
     try {
          const { category, contacts, details, mobilecontact, location, price } = req.body;  // Клиентдан олинган маълумотлар
          const images = req.files.map((file) => `/uploads/${file.filename}`);  // Расмларнинг йўлларини сақлаш

          // Янгидан уй эълонини яратиш
          const newHome = new HomeAdding({
               category,
               contacts,
               details,
               images,
               mobilecontact,
               location,
               price,
          });

          await newHome.save();  // Яратилган эълонни MongoDB'га сақлаш
          res.status(201).json({ message: 'Эълон муваффақиятли қўшилди', home: newHome });  // Муваффақият хабарини юбориш
     } catch (error) {
          console.error('Эълон қўшишда хатолик:', error);
          res.status(500).json({ error: 'Сервер хатоси' });
     }
});
// Барча эълонларни олиш йўли
app.get('/get-all-ad', async (req, res) => {
     try {
          const getAllAds = await HomeAdding.find();  // Барча эълонларни олиш
          res.status(200).json(getAllAds);  // JSON форматда эълонларни юбориш
     } catch (error) {
          console.error('Эълонларни олишда хатолик:', error);
          res.status(500).json({ error: 'Сервер хатоси' });
     }
});
// Аниқ бир эълонни ID орқали олиш
app.get('/get-ad/:id', async (req, res) => {
     try {
          const ad = await HomeAdding.findById(req.params.id);  // ID бўйича эълонни олиш
          if (!ad) {
               return res.status(404).json({ message: 'Эълон топилмади' });  // Агар эълон топилмаса, хабар бериш
          }
          res.status(200).json(ad);  // Эълонни юбориш
     } catch (error) {
          console.error('Эълонни олишда хатолик:', error);
          res.status(500).json({ error: 'Сервер хатоси' });
     }
});

// Токенни текшириш функцияси
const checkToken = (req, res) => {
     const token = req.headers.authorization?.split(' ')[1];  // Токенни HTTP бошлиқдан олиш
     const secretKey = 'maxfun';  // Токен текшириш учун махфий калит

     if (!token) {
          return res.status(401).json({ message: 'Токен топилмади' });  // Агар токен топилмаса
     }

     try {
          const decoded = jwt.verify(token, secretKey);  // Токенни декод қилиш
          return res.status(200).json({ role: decoded.role });  // Фойдаланувчи ролини юбориш
     } catch (err) {
          return res.status(401).json({ message: 'Токен яроқсиз' });  // Токен яроқсиз бўлса
     }
};
// Логин учун йўл

// Серверни эшитишни бошлаш
const  PORT = 5007;
app.listen(PORT, () => {
     console.log(`Сервер ${PORT}-портда ишламоқда`);
});
