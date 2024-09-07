// server.js

// Express kutubxonasini chaqirish
const express = require('express');
//Cors kutubxonasini chaqirish
const cors = require('cors');
// Mongoose kutubxonasini chaqirish
const mongoose = require('mongoose');
// Body-parser kutubxonasini chaqirish
const bodyParser = require('body-parser');
//Jwt kutubhonasini yuklash
const jwt = require("jsonwebtoken")
// Express ilovasini yaratish
const app = express();

// CORS қўшиш
app.use(cors());

// JSON formatdagi so'rovlarni parsing qilish
app.use(bodyParser.json());

// MongoDB ga ulanish
mongoose.connect('mongodb+srv://alikhanov13:8ejWWGGweheMXHC8@cluster0.zltuj21.mongodb.net/', {
     useNewUrlParser: true,
     useUnifiedTopology: true,
});
//MongoDb serverga ulangan xolatini bilish
const db = mongoose.connection;
db.on('error', (error) => {
     console.error('MongoDB ulanishida xatolik:', error);
});
db.once('open', () => {
     console.log('MongoDB ga muvaffaqiyatli ulandi');
});
// Mahsulot sxemasini yaratish
const productSchema = new mongoose.Schema({
     name: String,      // Mahsulot nomi
     price: Number,     // Mahsulot narxi
     quantity: Number,  // Mahsulot miqdori
});

// Mahsulot modelini yaratish
const Product = mongoose.model('Product', productSchema);

// Barcha mahsulotlarni olish
app.get('/products', async (req, res) => {
     try {
          const products = await Product.find();  // Mahsulotlarni bazadan olish
          res.json(products);  // Mahsulotlarni JSON formatda javob qaytarish
     } catch (error) {
          res.status(500).send(error);  // Xatolik yuz bersa, 500 status kodi bilan xato yuborish
     }
});

// Yangi mahsulot qo'shish
app.post('/products', async (req, res) => {
     const { name, price, quantity } = req.body;  // So'rovdan mahsulot ma'lumotlarini olish
     const newProduct = new Product({ name, price, quantity });  // Yangi mahsulot yaratish
     try {
          await newProduct.save();  // Mahsulotni bazaga saqlash
          res.status(201).json(newProduct);  // Mahsulot yaratildi, 201 status kodi bilan javob qaytarish
     } catch (error) {
          res.status(400).send(error);  // Xatolik yuz bersa, 400 status kodi bilan xato yuborish
     }
});

// Mahsulotni tahrirlash
app.put('/products/:id', async (req, res) => {
     const { id } = req.params;  // URL parametridan mahsulot ID sini olish
     const { name, price, quantity } = req.body;  // So'rovdan tahrirlanadigan mahsulot ma'lumotlarini olish
     try {
          const updatedProduct = await Product.findByIdAndUpdate(
               id,  // Mahsulot ID si
               { name, price, quantity },  // Yangilanishlar
               { new: true }  // Yangilangan mahsulotni qaytarish
          );
          res.json(updatedProduct);  // Yangilangan mahsulotni JSON formatda javob qaytarish
     } catch (error) {
          res.status(400).send(error);  // Xatolik yuz bersa, 400 status kodi bilan xato yuborish
     }
});

// Mahsulotni o'chirish
app.delete('/products/:id', async (req, res) => {
     const { id } = req.params;  // URL parametridan mahsulot ID sini olish
     try {
          await Product.findByIdAndDelete(id);  // Mahsulotni ID si bo'yicha o'chirish
          res.status(204).send();  // O'chirilgan mahsulot uchun 204 status kodi bilan javob qaytarish
     } catch (error) {
          res.status(500).send(error);  // Xatolik yuz bersa, 500 status kodi bilan xato yuborish
     }
});


// Login va Register uchun funksiyani yaratish
const loginAdmin = async (req, res) => {
     // So'rovdan login va parolni olamiz
     const { login, password } = req.body;

     let role;
     // Agar login va parol 'admin' bo'lsa, rolni 'admin' qilib belgilaymiz
     if (login === 'admin' && password === 'admin') {
          role = 'admin';
          // Agar login va parol 'user' bo'lsa, rolni 'user' qilib belgilaymiz
     } else if (login === 'user' && password === 'user') {
          role = 'user';
          // Agar login va parol mos kelmasa, 401 status kodi bilan xato xabarini yuboramiz
     } else {
          return res.status(401).json({ message: 'Login yoki parol noto\'g\'ri' });
     }

     // Token yaratish uchun sirli kalitni belgilaymiz
     const secretKey = 'maxfun';
     // JWT token yaratamiz va unga foydalanuvchi rolini joylaymiz, bu token 7 kun davomida yaroqli bo'ladi
     const token = jwt.sign({ role }, secretKey, { expiresIn: '7d' });

     // Yaratilgan tokenni javob sifatida qaytaramiz
     return res.status(200).json({ token });
};

// Tokenni tekshirish funksiyasi
const checkToken = (req, res) => {
     // So'rovning sarlavhasidan tokenni olamiz (Authorization bo'limidan)
     const token = req.headers.authorization?.split(' ')[1];
     const secretKey = 'maxfun';

     // Agar token topilmasa, 401 status kodi bilan xato xabarini yuboramiz
     if (!token) {
          return res.status(401).json({ message: 'Token topilmadi' });
     }

     try {
          // Tokenni sirli kalit yordamida dekodlaymiz va foydalanuvchi rolini qaytaramiz
          const decoded = jwt.verify(token, secretKey);
          return res.status(200).json({ role: decoded.role });
     } catch (err) {
          // Agar token yaroqsiz bo'lsa, 401 status kodi bilan xato xabarini yuboramiz
          return res.status(401).json({ message: 'Token yaroqsiz' });
     }
};

//Marshurutlar yaratish
app.post('/login', loginAdmin);


// Serverni ishga tushirish
const PORT = 5007;  // Server porti
app.listen(PORT, () => {
     console.log(`Server is running on port ${PORT}`);  // Server ishga tushdi
});