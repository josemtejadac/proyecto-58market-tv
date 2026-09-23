const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { uploadPath } = require('./middleware/upload');

const app = express();

app.use(cors({ origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',') }));
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos subidos (imagenes/videos) servidos de forma estatica
app.use('/uploads', express.static(uploadPath));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
