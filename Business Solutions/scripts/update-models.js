const db = require('../src/config/database');

(async () => {
  try {
    const pool = db.getPool();
    await pool.execute(
      "UPDATE configuracion_proveedores_ia SET modelo_principal = 'models/gemini-flash-latest', modelo_alternativo = 'models/gemini-3.8-flash' WHERE codigo_proveedor = 'gemini'"
    );
    await pool.execute(
      "UPDATE asignaciones_proveedor_agente SET modelo_override = 'models/gemini-flash-latest' WHERE activo = 1"
    );
    console.log('[VitaNexo] Modelos de IA actualizados exitosamente en VitaBase: models/gemini-flash-latest.');
  } catch (err) {
    console.error('Error al actualizar modelos:', err);
  } finally {
    await db.closePool();
  }
})();

