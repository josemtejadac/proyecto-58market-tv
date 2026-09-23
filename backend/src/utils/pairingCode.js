const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin caracteres ambiguos (0,O,1,I)

/**
 * Genera un codigo corto de emparejamiento, ej. "A3F9".
 */
function generatePairingCode(length = 4) {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

module.exports = { generatePairingCode };
