export const escapeHtml = (str: string) => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const validarEmail = (email: string) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email) ? escapeHtml(email) : false;
};

export const validarNombre = (nombre: string) => {
  if (nombre && nombre.length >= 2 && nombre.length <= 80) {
    return escapeHtml(nombre);
  }
  return false;
};

export const validarPassword = (password: string) => password && password.length >= 8;
