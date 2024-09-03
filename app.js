const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const supabase = require("./supabaseClient");
require("dotenv").config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Ruta principal
app.get("/", (req, res) => {
  res.send("Servidor de barbería funcionando");
});

app.post("/reservar", async (req, res) => {
  const { nombre, telefono, fecha, hora, servicio } = req.body;
  // Verificar disponibilidad
  try {
    const { data: turnosExistentes, error: errorConsulta } = await supabase
      .from("turnos")
      .select("*")
      .eq("fecha", fecha)
      .eq("hora", hora);

    if (errorConsulta) {
      throw new Error("Error al verificar la disponibilidad de los turnos.");
    }

    if (turnosExistentes.length > 0) {
      return res
        .status(400)
        .json({
          error: "Ya existe un turno reservado para la misma fecha y hora.",
        });
    }

    // Registrar turno
    const { data, error: errorRegistro } = await supabase
      .from("turnos")
      .insert([{ nombre, telefono, fecha, hora, servicio }]);

    if (errorRegistro) {
      throw new Error(
        errorRegistro.message || "Error desconocido al registrar el turno."
      );
    }

    res.status(200).json({ message: "Turno registrado con éxito!", data });
  } catch (error) {
    console.error("Error al registrar el turno:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Ruta para verificar disponibilidad de turno
app.get("/verificar", async (req, res) => {
  const { fecha, hora } = req.query;

  try {
    const { data, error } = await supabase
      .from("turnos") // Asegúrate de usar el nombre correcto aquí
      .select("*")
      .eq("fecha", fecha)
      .eq("hora", hora);

    if (error) {
      console.error("Error al consultar disponibilidad:", error);
      return res
        .status(500)
        .json({ error: "Error al consultar la disponibilidad" });
    }

    if (data.length > 0) {
      // Si hay datos, significa que ya hay una reserva en esa fecha y hora
      return res.json({ reservado: true });
    } else {
      // Si no hay datos, la fecha y hora están disponibles
      return res.json({ reservado: false });
    }
  } catch (error) {
    console.error("Error al verificar disponibilidad:", error);
    res.status(500).json({ error: "Error al verificar disponibilidad" });
  }
});

app.get("/reservas-por-fecha", async (req, res) => {
  const { fecha } = req.query;

  try {
    const { data, error } = await supabase
      .from("turnos")
      .select("hora")
      .eq("fecha", fecha);

    if (error) {
      console.error("Error al obtener las reservas:", error);
      return res.status(500).json({ error: "Error al obtener las reservas" });
    }

    const horasOcupadas = data.map((turno) => turno.hora);
    res.status(200).json({ horasOcupadas });
  } catch (error) {
    console.error("Error al obtener las reservas:", error);
    res.status(500).json({ error: "Error al obtener las reservas" });
  }
});

// Ruta para verificar la conexión a Supabase
app.get("/test", async (req, res) => {
  try {
    const { data, error } = await supabase.from("turnos").select("*").limit(1);

    if (error) {
      throw new Error(error.message || "Error desconocido");
    }

    res.status(200).json({ message: "Conexión con Supabase exitosa!", data });
  } catch (error) {
    console.error("Error en la prueba de conexión:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
