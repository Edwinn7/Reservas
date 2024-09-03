import React, { useState, useEffect } from "react";
import axios from "axios";
import "./TurnoForm.css";
import DatePicker, { registerLocale } from "react-datepicker";
import es from "date-fns/locale/es";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";

registerLocale("es", es);

const TurnoForm = () => {
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    fecha: null,
    hora: "",
    servicio: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [availabilityError, setAvailabilityError] = useState("");
  const [horasOcupadas, setHorasOcupadas] = useState([]);
  const [diaCompletoOcupado, setDiaCompletoOcupado] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleDateChange = async (date) => {
    setFormData({ ...formData, fecha: date });
    
    if (date) {
      const formattedDate = format(date, "yyyy-MM-dd");

      try {
        const response = await axios.get(`https://backend-node-reservations.glitch.me/reservas-por-fecha?fecha=${formattedDate}`);
        setHorasOcupadas(response.data.horasOcupadas);

        // Verifica si todas las horas están ocupadas
        const allTimes = generateTimeOptions();
        setDiaCompletoOcupado(response.data.horasOcupadas.length === allTimes.length);
      } catch (error) {
        console.error('Error al obtener horas ocupadas', error);
        setHorasOcupadas([]);
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre es requerido";
    }

    const telefonoRegex = /^[0-9]{10,15}$/;
    if (!telefonoRegex.test(formData.telefono)) {
      newErrors.telefono =
        "El teléfono debe contener solo números y tener entre 10 y 15 dígitos";
    }

    if (!formData.fecha) {
      newErrors.fecha = "La fecha es requerida";
    } else if (formData.fecha < new Date()) {
      newErrors.fecha = "La fecha no puede ser en el pasado";
    }

    if (!formData.hora) {
      newErrors.hora = "La hora es requerida";
    }

    if (!formData.servicio) {
      newErrors.servicio = "Debe seleccionar un servicio";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
    const checkAvailability = async () => {
    const formattedDate = format(formData.fecha, "yyyy-MM-dd");

    try {
      const response = await axios.get(
        `https://backend-node-reservations.glitch.me/verificar?fecha=${formattedDate}&hora=${formData.hora}`
      );

      if (response.data.reservado) {
        setAvailabilityError(
          "Ya existe un turno reservado para la misma fecha y hora."
        );
        return false;
      } else {
        setAvailabilityError("");
        return true;
      }
    } catch (error) {
      console.error("Error al verificar disponibilidad", error);
      setAvailabilityError("Error al verificar la disponibilidad.");
      return false;
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage("");
    if (!validateForm()) return;

    setIsSubmitting(true);

    const isAvailable = await checkAvailability();

    if (!isAvailable) {
      setIsSubmitting(false);
      return;
    }
    try {
      const formattedDate = format(formData.fecha, "yyyy-MM-dd");

      await axios.post("https://backend-node-reservations.glitch.me/reservar", {
        ...formData,
        fecha: formattedDate,
      });

      setSuccessMessage("Turno registrado con éxito!");
      setFormData({
        nombre: "",
        telefono: "",
        fecha: null,
        hora: "",
        servicio: "",
      });
      setErrors({});
    } catch (error) {
      console.error("Error registrando el turno", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 9; hour <= 22; hour++) {
      const hourFormatted = hour < 10 ? `0${hour}` : `${hour}`;

      times.push(`${hourFormatted}:00`, `${hourFormatted}:30`);
    }
    return times;
  };

  const disableWednesdays = (date) => {
    const day = date.getDay();
    return day !== 3 && !diaCompletoOcupado;
  };

  return (
    <div className="form-container">
      <h2>Registro de turnos</h2>
      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}
      {availabilityError && (
        <div className="error-message">{availabilityError}</div>
      )}
      <form onSubmit={handleSubmit} noValidate>
        <input
          type="text"
          name="nombre"
          placeholder="Nombre"
          value={formData.nombre}
          onChange={handleChange}
          className={errors.nombre ? "error" : ""}
          required
        />
        {errors.nombre && <p className="error-message">{errors.nombre}</p>}

        <input
          type="tel"
          name="telefono"
          placeholder="Teléfono"
          value={formData.telefono}
          onChange={handleChange}
          className={errors.telefono ? "error" : ""}
          required
        />
        {errors.telefono && <p className="error-message">{errors.telefono}</p>}

        <DatePicker
          selected={formData.fecha}
          onChange={handleDateChange}
          dateFormat="dd/MM/yyyy"
          className={errors.fecha ? "error" : ""}
          placeholderText="Fecha"
          locale="es"
          minDate={new Date()}
          showMonthDropdown
          showYearDropdown
          dropdownMode="select"
          filterDate={disableWednesdays} // Aplicar la función para deshabilitar miércoles y días completos ocupados
          required
        />
        {errors.fecha && <p className="error-message">{errors.fecha}</p>}

        <select
          name="hora"
          value={formData.hora}
          onChange={handleChange}
          className={errors.hora ? "error" : ""}
          required
          disabled={diaCompletoOcupado} // Deshabilitar si todas las horas están ocupadas
        >
          <option value="">Seleccione la hora</option>
          {generateTimeOptions().map((time) => (
            <option
              key={time}
              value={time}
              disabled={horasOcupadas.includes(time)} // Deshabilitar horas ocupadas
            >
              {time}
            </option>
          ))}
        </select>
        {errors.hora && <p className="error-message">{errors.hora}</p>}

        <select
          name="servicio"
          value={formData.servicio}
          onChange={handleChange}
          className={errors.servicio ? "error" : ""}
          required
        >
          <option value="">Seleccione un servicio</option>
          <option value="Corte">Corte</option>
          <option value="Afeitado">Afeitado</option>
          <option value="Corte y Afeitado">Corte y Afeitado</option>
        </select>
        {errors.servicio && <p className="error-message">{errors.servicio}</p>}

        <button type="submit" disabled={isSubmitting || diaCompletoOcupado}>
          {isSubmitting ? "Registrando..." : "Registrar Turno"}
        </button>
      </form>
    </div>
  );
};

export default TurnoForm;
