require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const cors = require('cors');
const { Pool } = require('pg');
const OpenAI = require('openai');
const nodemailer = require('nodemailer');

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

app.use(express.json());
app.use(cors());
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'chaska_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// OpenAI Chat Endpoint con control de tokens según plan
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const user = req.session.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Debe iniciar sesión para usar Chaska Bot.' });
    }

    // Limites de tokens/mensajes por plan diarios o mensuales
    const limits = { 'Gratuito': 10, 'Básico+': 50, 'Plus': 200, 'Pro': 1000 };
    const maxTokens = limits[user.plan] || 10;

    if (user.ai_tokens_used >= maxTokens) {
      return res.json({ reply: 'Has alcanzado el límite de consultas con Chaska Bot para tu plan actual. Actualiza a un plan superior para obtener más tokens de IA.' });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Eres Chaska Bot, un asistente universitario amigable para Chaska Empleo UC en Cusco, ayudando a estudiantes con turnos, requisitos y orientación laboral compatible con sus estudios.' },
        { role: 'user', content: message }
      ],
      max_tokens: 300
    });

    const reply = completion.choices[0].message.content;
    
    // Incrementar contador en sesión y base de datos
    user.ai_tokens_used = (user.ai_tokens_used || 0) + 1;
    await pool.query('UPDATE users SET ai_tokens_used = $1 WHERE id = $2', [user.ai_tokens_used, user.id]);

    res.json({ reply, tokensUsed: user.ai_tokens_used, maxTokens });
  } catch (error) {
    console.error('Error en OpenAI:', error);
    res.status(500).json({ error: 'Error al procesar la consulta con Chaska Bot.' });
  }
});

// Registro de usuarios
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, tipo, first_name, last_name, age, phone, cycle, career } = req.body;
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const verificationToken = Math.random().toString(36.substring(2));

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, tipo, first_name, last_name, age, phone, cycle, career, verification_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id, username, email, tipo, first_name, last_name, plan`,
      [username, email, passwordHash, tipo, first_name, last_name, age, phone, cycle, career, verificationToken]
    );

    const newUser = result.rows[0];
    
    // Enviar correo de verificación (simulado o SMTP real)
    if (process.env.SMTP_USER) {
      await transporter.sendMail({
        from: '"Chaska Empleo UC" <no-reply@chaska.uc.edu.pe>',
        to: email,
        subject: 'Verifica tu cuenta en Chaska Empleo UC',
        text: `Hola ${first_name}, tu código de verificación es: ${verificationToken}`
      }).catch(err => console.log('Error enviando correo SMTP:', err));
    }

    req.session.user = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      tipo: newUser.tipo,
      nombre: `${newUser.first_name} ${newUser.last_name}`,
      plan: newUser.plan || 'Gratuito',
      ai_tokens_used: 0
    };

    res.json({ success: true, user: req.session.user, message: 'Cuenta creada. Se ha enviado un correo de verificación.' });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(400).json({ error: 'El nombre de usuario o correo ya se encuentran registrados.' });
  }
});

// Inicio de sesión
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(400).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      tipo: user.tipo,
      nombre: `${user.first_name} ${user.last_name}`,
      edad: user.age,
      telefono: user.phone,
      ciclo: user.cycle,
      carrera: user.career,
      plan: user.plan || 'Gratuito',
      ai_tokens_used: user.ai_tokens_used || 0
    };

    res.json({ success: true, user: req.session.user });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno en el servidor.' });
  }
});

app.get('/api/session', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// Actualizar Plan Premium (Demostración de pago con Yape o Tarjeta)
app.post('/api/upgrade-plan', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    const { planName } = req.body;
    const userId = req.session.user.id;

    await pool.query('UPDATE users SET plan = $1 WHERE id = $2', [planName, userId]);
    req.session.user.plan = planName;

    res.json({ success: true, plan: planName, message: `¡Plan ${planName} activado exitosamente!` });
  } catch (error) {
    console.error('Error actualizando plan:', error);
    res.status(500).json({ error: 'Error al actualizar el plan.' });
  }
});

app.listen(port, () => {
  console.log(`Servidor Chaska Empleo UC corriendo en puerto ${port}`);
});
